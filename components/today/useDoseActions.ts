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

  /**
   * Create a log for a scheduled dose. taken/partial run the dose safety check first (at now or
   * at the scheduled time). Early + taken + now cancels that dose's reminder.
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

      if (consumes && medication && !opts.skipSafety) {
        const at = req.at === 'now' ? new Date() : dose.time;
        const ok = await checkSafety(medication, req.amount, at);
        if (!ok) return null;
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
    [profileId, checkSafety, showLogError, refresh]
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
    [profileId, checkSafety, showLogError, logDose]
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
          nextNotes: req.notes || undefined,
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
    [profileId, showLogError, refresh]
  );

  return useMemo(
    () => ({ logDose, rescheduleAndLog, updateLog, undo, restore, refresh }),
    [logDose, rescheduleAndLog, updateLog, undo, restore, refresh]
  );
}
