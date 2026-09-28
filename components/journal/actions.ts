/**
 * Journal business logic (kept out of the presentational components so they can be previewed):
 * change an entry, delete an entry, log a past dose. Same backend calls and order as the old
 * History screen / EditLogDialog / RetroactiveLogDialog; dialogs go through the shared
 * `lib/ui/dose-actions` helpers.
 *
 * @example
 * const { saveChange, deleteEntry, logPastDose } = useJournalActions();
 * const ok = await saveChange(log, draft);
 */
import { useCallback } from 'react';
import { Trash2 } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useConfirm, useToast, haptics } from '@/components/ds';
import {
  createIntakeLogAndUpdateInventory,
  getMedicationById,
  updateIntakeLog,
  updateIntakeLogAndReconcileInventory,
} from '@/lib/db/operations';
import { undoIntakeLog, useDoseSafetyCheck, useLogErrorHandler } from '@/lib/ui/dose-actions';
import { useStore } from '@/store';
import type { DosageUnit, IntakeLog } from '@/types';
import type { EntryDraft } from './EntrySheet';
import type { PastDoseDraft } from './PastDoseSheet';
import { bumpJournal } from './journal-refresh';
import { isInFuture } from './utils';

async function reloadMedications() {
  const { activeProfile, loadMedications } = useStore.getState();
  if (activeProfile) await loadMedications(activeProfile.id);
}

export function useJournalActions() {
  const confirm = useConfirm();
  const toast = useToast();
  const checkSafety = useDoseSafetyCheck();
  const showLogError = useLogErrorHandler();

  /**
   * Reconciles status / amount / note (supply delta applied by the backend), then moves the time
   * when it changed (no supply effect). Resolves true when saved.
   */
  const saveChange = useCallback(
    async (log: IntakeLog, draft: EntryDraft): Promise<boolean> => {
      if (draft.action !== 'skipped' && !(draft.dosageAmount > 0)) return false;
      if (isInFuture(draft.actualTime)) return false;
      let unit: DosageUnit | undefined;
      try {
        const medication = await getMedicationById(log.medicationId);
        if (!medication) throw new Error('Medication not found');
        unit = medication.dosageUnit;

        await updateIntakeLogAndReconcileInventory({
          existingLog: log,
          medication,
          nextAction: draft.action,
          nextDosageAmount: draft.dosageAmount > 0 ? draft.dosageAmount : log.dosageAmount,
          // '' (not undefined) so clearing a note actually clears it; read back as undefined.
          nextNotes: draft.notes.trim(),
        });

        const nextTime = draft.actualTime;
        if (Math.abs(nextTime.getTime() - new Date(log.actualTime).getTime()) >= 60_000) {
          await updateIntakeLog(log.id, { actualTime: nextTime });
        }

        await reloadMedications();
        bumpJournal();
        haptics.success();
        return true;
      } catch (error) {
        await showLogError(error, unit);
        return false;
      }
    },
    [showLogError]
  );

  /**
   * Confirms, then removes the entry and gives supply back for taken/partial (`undoIntakeLog`).
   * Call it when no sheet is open so the toast is visible. Resolves true when removed.
   */
  const deleteEntry = useCallback(
    async (log: IntakeLog): Promise<boolean> => {
      const givesBack = log.action === 'taken' || log.action === 'partial';
      const ok = await confirm({
        title: i18n.t('ui.journal.delete.title'),
        message: i18n.t(
          givesBack ? 'ui.journal.delete.messageSupply' : 'ui.journal.delete.message'
        ),
        confirmLabel: i18n.t('ui.journal.delete.confirm'),
        tone: 'danger',
        icon: Trash2,
      });
      if (!ok) return false;
      try {
        await undoIntakeLog(log);
        await reloadMedications();
        bumpJournal();
        toast.show({ title: i18n.t('ui.journal.delete.done'), icon: Trash2 });
        return true;
      } catch (error) {
        console.error('Failed to delete log:', error);
        toast.show({ title: i18n.t('ui.journal.delete.failed'), tone: 'danger' });
        return false;
      }
    },
    [confirm, toast]
  );

  /**
   * Safety check (taken/partial) → create log + update supply → reload. Resolves the new log, or
   * null when cancelled / failed (errors are already explained to the person).
   */
  const logPastDose = useCallback(
    async (draft: PastDoseDraft): Promise<IntakeLog | null> => {
      const profile = useStore.getState().activeProfile;
      if (!profile) {
        await showLogError(new Error('No active profile'));
        return null;
      }
      // Never in the future; clamp the minute of tolerance the picker allows.
      const now = new Date();
      if (isInFuture(draft.actualTime, now)) return null;
      const actualTime = draft.actualTime > now ? now : draft.actualTime;

      if (draft.action === 'taken' || draft.action === 'partial') {
        const fine = await checkSafety(draft.medication, draft.dosageAmount, actualTime);
        if (!fine) return null;
      }

      try {
        const { log } = await createIntakeLogAndUpdateInventory({
          medicationId: draft.medication.id,
          profileId: profile.id,
          scheduledTime: undefined, // no scheduled time for a dose logged afterwards
          actualTime,
          action: draft.action,
          dosageAmount: draft.dosageAmount,
          notes: draft.notes,
        });
        await reloadMedications();
        bumpJournal();
        haptics.success();
        return log;
      } catch (error) {
        await showLogError(error, draft.medication.dosageUnit);
        return null;
      }
    },
    [checkSafety, showLogError]
  );

  /** Undo for the "Logged" toast. */
  const undoPastDose = useCallback(
    async (log: IntakeLog) => {
      try {
        await undoIntakeLog(log);
        await reloadMedications();
        bumpJournal();
        toast.show({ title: i18n.t('ui.journal.delete.done') });
      } catch (error) {
        console.error('Failed to undo log:', error);
        toast.show({ title: i18n.t('ui.journal.delete.failed'), tone: 'danger' });
      }
    },
    [toast]
  );

  return { saveChange, deleteEntry, logPastDose, undoPastDose };
}
