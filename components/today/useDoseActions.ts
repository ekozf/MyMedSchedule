/**
 * Persistence for Today's dose actions (the data side of `DoseSheet`, swipes and toasts).
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
  updateIntakeLogAndReconcileInventory,
} from '@/lib/db/operations';
import {
  cancelNotificationForDose,
  ensureNext3DoseNotificationsForMedication,
  scheduleNotificationsForMedication,
} from '@/lib/notifications/scheduler';
import { undoIntakeLog, useDoseSafetyCheck, useLogErrorHandler } from '@/lib/ui/dose-actions';
import { haptics } from '@/lib/ui/haptics';
import { useToast } from '@/components/ds';
import { useStore } from '@/store';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import type { IntakeLog, Medication } from '@/types';
import type { DoseLogRequest, DoseUpdateRequest } from './DoseSheet';
import { getTiming } from './logic';

export interface UseDoseActionsOptions {
  profileId: string | null;
  /** Re-read intake logs after a change. */
  reloadLogs: () => Promise<void>;
}

type Unit = Medication['dosageUnit'];

export function useDoseActions({ profileId, reloadLogs }: UseDoseActionsOptions) {
  const checkSafety = useDoseSafetyCheck();
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
      opts: { skipSafety?: boolean } = {}
    ): Promise<IntakeLog | null> => {
      if (!profileId) return null;
      const consumes = req.action === 'taken' || req.action === 'partial';

      if (await findExistingLog(dose)) {
        await alreadyLogged(dose);
        return null;
      }

      if (consumes && medication && !opts.skipSafety) {
        const at = req.at === 'now' ? new Date() : dose.time;
        const ok = await checkSafety(medication, req.amount, at);
        if (!ok) return null;
        // The safety question may have been open for a while (a reminder could log it meanwhile).
        if (await findExistingLog(dose)) {
          await alreadyLogged(dose);
          return null;
        }
      }

      const now = new Date();
      const wasEarly = getTiming(dose, now).isEarly;
      let log: IntakeLog;
      try {
        const result = await createIntakeLogAndUpdateInventory({
          medicationId: dose.medicationId,
          profileId,
          scheduledTime: dose.time,
          actualTime: req.at === 'now' ? now : dose.time,
          action: req.action,
          dosageAmount: req.amount,
          notes: req.notes || undefined,
        });
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

      haptics.success();
      return log;
    },
    [profileId, checkSafety, showLogError, refresh, findExistingLog, alreadyLogged]
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
      if (req.action === 'taken' || req.action === 'partial') {
        const ok = await checkSafety(medication, req.amount, new Date());
        if (!ok) return null;
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
      return logDose(dose, medication, { ...req, at: 'now' }, { skipSafety: true });
    },
    [profileId, checkSafety, showLogError, logDose, findExistingLog, alreadyLogged]
  );

  /** Change an existing log (action / amount / notes), reconciling supply. */
  const updateLog = useCallback(
    async (log: IntakeLog, req: DoseUpdateRequest, unit?: string): Promise<boolean> => {
      try {
        const fresh = await getMedicationById(log.medicationId);
        if (!fresh) throw new Error('Medication not found');
        await updateIntakeLogAndReconcileInventory({
          existingLog: log,
          medication: fresh,
          nextAction: req.action,
          nextDosageAmount: req.amount,
          // '' (not undefined) so clearing a note actually clears it.
          nextNotes: req.notes,
        });
      } catch (error) {
        await showLogError(error, unit as Unit | undefined);
        return false;
      }
      await refresh();
      haptics.success();
      return true;
    },
    [showLogError, refresh]
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
        await createIntakeLogAndUpdateInventory({
          medicationId: log.medicationId,
          profileId,
          scheduledTime: log.scheduledTime,
          actualTime: log.actualTime,
          action: log.action,
          dosageAmount: log.dosageAmount,
          notes: log.notes,
        });
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
      haptics.success();
      return true;
    },
    [profileId, showLogError, refresh, findExistingLog]
  );

  return useMemo(
    () => ({ logDose, rescheduleAndLog, updateLog, undo, restore, refresh, hasLog }),
    [logDose, rescheduleAndLog, updateLog, undo, restore, refresh, hasLog]
  );
}
