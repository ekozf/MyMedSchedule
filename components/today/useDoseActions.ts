/**
 * Persistence for Today's dose actions (the data side of the compartment sheet, Up next and toasts).
 * Ported from the former DoseActionDialog: same backend calls in the same order
 * (except "Move next dose", which now runs the safety check before touching the schedule).
 * Every function resolves to the result (or `null`/`false` when cancelled or failed; errors are
 * already explained to the person via the shared confirm sheets).
 *
 * @example
 * const actions = useDoseActions({ profileId, reloadLogs });
 * const log = await actions.logDose(dose, medication, { action: 'taken', amount: 1, at: 'now' });
 * if (log) toast.show({ title: 'Metformin taken', action: { label: 'Undo', onPress: () => actions.undo(log) } });
 */
import { useCallback, useMemo } from 'react';
import i18n from '@/lib/i18n';
import {
  createIntakeLogAndUpdateInventory,
  getIntakeLogsByMedication,
  getMedicationById,
  setNextDoseOverrideTime,
  updateIntakeLog,
  updateIntakeLogAndReconcileInventory,
} from '@/lib/db/operations';
import {
  cancelNotificationForDose,
  ensureNext3DoseNotificationsForMedication,
  scheduleNotificationsForMedication,
} from '@/lib/notifications/scheduler';
import {
  undoIntakeLog,
  useDoseSafetyCheck,
  useLogErrorHandler,
  useSupplyCheck,
  type SupplyCheckResult,
} from '@/lib/ui/dose-actions';
import { bumpLogs } from '@/lib/ui/data-refresh';
import { haptics } from '@/lib/ui/haptics';
import { useToast } from '@/components/ds';
import { useStore } from '@/store';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import type { IntakeLog, Medication } from '@/types';
import { getTiming, type DoseLogRequest, type DoseUpdateRequest } from './logic';

export interface UseDoseActionsOptions {
  profileId: string | null;
  /** Re-read intake logs after a change. */
  reloadLogs: () => Promise<void>;
  /**
   * The supply count was too low and the person chose "Update supply first": open the supply
   * sheet for this medicine (nothing was logged).
   */
  onUpdateSupply?: (medicationId: string) => void;
}

/** Turns a request's `at` into the stored actualTime. */
export function resolveActualTime(at: DoseLogRequest['at'], scheduled: Date, now: Date): Date {
  if (at === 'now') return now;
  if (at === 'scheduled') return scheduled;
  return at;
}

type Unit = Medication['dosageUnit'];

export function useDoseActions({ profileId, reloadLogs, onUpdateSupply }: UseDoseActionsOptions) {
  const checkSafety = useDoseSafetyCheck();
  const checkSupply = useSupplyCheck();
  const showLogError = useLogErrorHandler();
  const loadMedications = useStore((s) => s.loadMedications);
  const toast = useToast();

  const refresh = useCallback(async () => {
    if (profileId) await loadMedications(profileId);
    await reloadLogs();
  }, [profileId, loadMedications, reloadLogs]);

  /** The log already stored for this exact scheduled dose, if any (e.g. logged from a reminder). */
  const findExistingLog = useCallback(
    async (dose: Pick<ScheduledDose, 'medicationId' | 'time'>): Promise<IntakeLog | null> => {
      try {
        const logs = await getIntakeLogsByMedication(dose.medicationId);
        const at = dose.time.getTime();
        return logs.find((l) => l.scheduledTime?.getTime() === at) ?? null;
      } catch (error) {
        console.warn('Failed to check for an existing log:', error);
        return null;
      }
    },
    []
  );

  /** Already logged elsewhere: don't create a second log, just show the current state. */
  const alreadyLogged = useCallback(
    async (dose: ScheduledDose) => {
      await refresh();
      toast.show({ title: i18n.t('ui.today.toast.alreadyLogged', { name: dose.medicationName }) });
    },
    [refresh, toast]
  );

  /**
   * Create a log for a scheduled dose. taken/partial run the dose safety check first (at now or
   * at the scheduled time). Early + taken + now cancels that dose's reminder.
   * Never creates a second log for the same scheduled dose: when one exists already, reloads,
   * says so and resolves null (see `hasLog`).
   */
  const logDose = useCallback(
    async (
      dose: ScheduledDose,
      medication: Medication | null,
      req: DoseLogRequest,
      opts: { skipSafety?: boolean; supply?: SupplyCheckResult } = {}
    ): Promise<IntakeLog | null> => {
      if (!profileId) return null;
      const consumes = req.action === 'taken' || req.action === 'partial';

      if (await findExistingLog(dose)) {
        await alreadyLogged(dose);
        return null;
      }

      let supply: SupplyCheckResult = opts.supply ?? 'ok';
      if (consumes && medication) {
        if (!opts.skipSafety) {
          const at = resolveActualTime(req.at, dose.time, new Date());
          const ok = await checkSafety(medication, req.amount, at);
          if (!ok) return null;
        }
        if (!opts.supply) {
          supply = await checkSupply(medication, req.amount);
          if (supply === 'update') onUpdateSupply?.(medication.id);
          if (supply === 'update' || supply === 'cancel') return null;
        }
        // The questions may have been open for a while (a reminder could log it meanwhile).
        if (await findExistingLog(dose)) {
          await alreadyLogged(dose);
          return null;
        }
      }

      const now = new Date();
      const wasEarly = getTiming(dose, now).isEarly;
      let log: IntakeLog;
      try {
        const result = await createIntakeLogAndUpdateInventory(
          {
            medicationId: dose.medicationId,
            profileId,
            scheduledTime: dose.time,
            actualTime: resolveActualTime(req.at, dose.time, now),
            action: req.action,
            dosageAmount: req.amount,
            notes: req.notes || undefined,
          },
          { allowShortSupply: supply === 'anyway' }
        );
        log = result.log;
      } catch (error) {
        await showLogError(error, (medication?.dosageUnit ?? dose.dosageUnit) as Unit);
        return null;
      }

      await refresh();

      try {
        if (req.at === 'now' && wasEarly && req.action === 'taken') {
          await cancelNotificationForDose(dose.medicationId, dose.time.toISOString());
        }
        await ensureNext3DoseNotificationsForMedication(dose.medicationId);
      } catch (error) {
        console.warn('Failed to update reminders after logging:', error);
      }

      haptics.light();
      return log;
    },
    [
      profileId,
      checkSafety,
      checkSupply,
      onUpdateSupply,
      showLogError,
      refresh,
      findExistingLog,
      alreadyLogged,
    ]
  );

  /** True when this scheduled dose has a log (used to close a now-stale dose sheet). */
  const hasLog = useCallback(
    async (dose: ScheduledDose) => (await findExistingLog(dose)) !== null,
    [findExistingLog]
  );

  /**
   * Late-overlap "Move next dose": override the medicine's next dose, re-prime its reminders,
   * then log this dose now. The safety check runs first so cancelling leaves nothing changed.
   */
  const rescheduleAndLog = useCallback(
    async (
      dose: ScheduledDose,
      medication: Medication | null,
      time: Date,
      req: Omit<DoseLogRequest, 'at'>
    ): Promise<IntakeLog | null> => {
      if (!profileId || !medication) return null;
      if (await findExistingLog(dose)) {
        await alreadyLogged(dose);
        return null;
      }
      let supply: SupplyCheckResult = 'ok';
      if (req.action === 'taken' || req.action === 'partial') {
        const ok = await checkSafety(medication, req.amount, new Date());
        if (!ok) return null;
        supply = await checkSupply(medication, req.amount);
        if (supply === 'update') onUpdateSupply?.(medication.id);
        if (supply === 'update' || supply === 'cancel') return null;
      }
      try {
        const updated = await setNextDoseOverrideTime(dose.medicationId, time);
        if (updated) {
          await scheduleNotificationsForMedication(updated);
          await ensureNext3DoseNotificationsForMedication(updated.id);
        }
      } catch (error) {
        console.error('Failed to reschedule next dose:', error);
        await showLogError(error);
        return null;
      }
      return logDose(dose, medication, { ...req, at: 'now' }, { skipSafety: true, supply });
    },
    [
      profileId,
      checkSafety,
      checkSupply,
      onUpdateSupply,
      showLogError,
      logDose,
      findExistingLog,
      alreadyLogged,
    ]
  );

  /** Change an existing log (action / amount / notes / time), reconciling supply. */
  const updateLog = useCallback(
    async (log: IntakeLog, req: DoseUpdateRequest, unit?: string): Promise<boolean> => {
      try {
        const fresh = await getMedicationById(log.medicationId);
        if (!fresh) throw new Error('Medication not found');
        const consumed = (a: IntakeLog['action'], n: number) => (a === 'skipped' ? 0 : n);
        const extra = consumed(req.action, req.amount) - consumed(log.action, log.dosageAmount);
        let supply: SupplyCheckResult = 'ok';
        if (extra > 0) {
          supply = await checkSupply(fresh, extra);
          if (supply === 'update') onUpdateSupply?.(fresh.id);
          if (supply === 'update' || supply === 'cancel') return false;
        }
        await updateIntakeLogAndReconcileInventory({
          existingLog: log,
          medication: fresh,
          nextAction: req.action,
          nextDosageAmount: req.amount,
          // '' (not undefined) so clearing a note actually clears it.
          nextNotes: req.notes,
          allowShortSupply: supply === 'anyway',
        });
        // Moving the time has no supply effect (same rule as the Journal's "Change").
        if (
          req.actualTime &&
          Math.abs(req.actualTime.getTime() - new Date(log.actualTime).getTime()) >= 60_000
        ) {
          await updateIntakeLog(log.id, { actualTime: req.actualTime });
        }
      } catch (error) {
        await showLogError(error, unit as Unit | undefined);
        return false;
      }
      await refresh();
      return true;
    },
    [showLogError, refresh, checkSupply, onUpdateSupply]
  );

  /**
   * Log an as-needed dose taken now (safety check, then the supply question when the count is
   * too low). Resolves the log, or null when cancelled / failed.
   */
  const logAsNeeded = useCallback(
    async (medication: Medication, amount: number, notes?: string): Promise<IntakeLog | null> => {
      if (!profileId) return null;
      const now = new Date();
      if (!(await checkSafety(medication, amount, now))) return null;
      const supply = await checkSupply(medication, amount);
      if (supply === 'update') onUpdateSupply?.(medication.id);
      if (supply === 'update' || supply === 'cancel') return null;
      try {
        const { log } = await createIntakeLogAndUpdateInventory(
          {
            medicationId: medication.id,
            profileId,
            scheduledTime: undefined,
            actualTime: now,
            action: 'taken',
            dosageAmount: amount,
            notes: notes?.trim() ? notes.trim() : undefined,
          },
          { allowShortSupply: supply === 'anyway' }
        );
        if (profileId) await loadMedications(profileId);
        bumpLogs();
        haptics.light();
        return log;
      } catch (error) {
        await showLogError(error, medication.dosageUnit);
        return null;
      }
    },
    [profileId, checkSafety, checkSupply, onUpdateSupply, loadMedications, showLogError]
  );

  /** Remove a log and give the supply back. */
  const undo = useCallback(
    async (log: IntakeLog): Promise<boolean> => {
      try {
        await undoIntakeLog(log);
      } catch (error) {
        console.error('Failed to undo intake log:', error);
        toast.show({ title: i18n.t('ui.safety.couldNotDelete'), tone: 'danger' });
        return false;
      }
      await refresh();
      haptics.light();
      return true;
    },
    [refresh, toast]
  );

  /** Re-create a log that was just removed (Undo on the "log removed" toast). */
  const restore = useCallback(
    async (log: IntakeLog, unit?: string): Promise<boolean> => {
      if (!profileId) return false;
      // Logged again in the meantime (e.g. swiped once more): keep that one.
      if (
        log.scheduledTime &&
        (await findExistingLog({ medicationId: log.medicationId, time: log.scheduledTime }))
      ) {
        await refresh();
        return false;
      }
      try {
        // Restoring what was just undone: never blocked by the supply count.
        await createIntakeLogAndUpdateInventory(
          {
            medicationId: log.medicationId,
            profileId,
            scheduledTime: log.scheduledTime,
            actualTime: log.actualTime,
            action: log.action,
            dosageAmount: log.dosageAmount,
            notes: log.notes,
          },
          { allowShortSupply: true }
        );
      } catch (error) {
        await showLogError(error, unit as Unit | undefined);
        return false;
      }
      await refresh();
      try {
        await ensureNext3DoseNotificationsForMedication(log.medicationId);
      } catch (error) {
        console.warn('Failed to update reminders after restore:', error);
      }
      haptics.light();
      return true;
    },
    [profileId, showLogError, refresh, findExistingLog]
  );

  return useMemo(
    () => ({ logDose, rescheduleAndLog, updateLog, logAsNeeded, undo, restore, refresh, hasLog }),
    [logDose, rescheduleAndLog, updateLog, logAsNeeded, undo, restore, refresh, hasLog]
  );
}
