/**
 * Shared dose-logging behaviour for every logging surface (Today, as-needed, past dose, Journal).
 * Keeps the backend safety rules in one place so each screen behaves identically.
 *
 * @example
 * const checkSafety = useDoseSafetyCheck();
 * if (!(await checkSafety(medication, amount, new Date()))) return; // user cancelled
 * try {
 *   await createIntakeLogAndUpdateInventory({...});
 * } catch (e) {
 *   await showLogError(e); // from useLogErrorHandler()
 * }
 *
 * await undoIntakeLog(log); // delete a log and give the supply back
 */
import { useCallback } from 'react';
import { ShieldAlert, PackageX } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { validateDose } from '@/lib/validation/dose-validation';
import {
  deleteIntakeLog,
  getMedicationById,
  InventoryInsufficientError,
  updateMedicationInventory,
} from '@/lib/db/operations';
import { ensureNext3DoseNotificationsForMedication } from '@/lib/notifications/scheduler';
import { useConfirm } from '@/components/ds/Confirm';
import { useTimeFormat, formatDose, formatNumber } from '@/lib/ui/format';
import type { IntakeLog, Medication } from '@/types';
import { bumpLogs } from '@/lib/ui/data-refresh';

/**
 * Returns `check(medication, amount, at)`. Resolves `true` when it is fine to log (no warnings,
 * or the person chose "Take anyway"), `false` when they cancelled. Only relevant for taken/partial.
 */
export function useDoseSafetyCheck() {
  const confirm = useConfirm();
  const { formatTime } = useTimeFormat();

  return useCallback(
    async (medication: Medication, amount: number, at: Date = new Date()): Promise<boolean> => {
      const result = await validateDose(medication, amount, at);
      if (!result.hasWarnings) return true;

      const parts: string[] = [];
      let title = i18n.t('ui.safety.checkTitle');

      if (!result.maxDailyDoseValidation.isValid) {
        const d = result.maxDailyDoseValidation.details ?? {};
        title = i18n.t('ui.safety.maxDailyTitle');
        parts.push(
          i18n.t('ui.safety.maxDaily', {
            current: formatDose(round1(d.currentDailyTotal ?? 0), medication.dosageUnit),
            next: formatDose(round1(d.newTotal ?? 0), medication.dosageUnit),
            max: formatDose(d.maxAllowed ?? 0, medication.dosageUnit),
          })
        );
      }

      if (!result.minHoursValidation.isValid) {
        const d = result.minHoursValidation.details ?? {};
        if (parts.length === 0) title = i18n.t('ui.safety.minHoursTitle');
        parts.push(
          i18n.t('ui.safety.minHours', {
            time: d.lastDoseTime ? formatTime(d.lastDoseTime) : '—',
            hours: formatNumber(round1(d.hoursSinceLastDose ?? 0)),
            minHours: formatNumber(d.minHoursRequired ?? 0),
          })
        );
      }

      return confirm({
        title,
        message: parts.join('\n\n'),
        confirmLabel: i18n.t('ui.safety.takeAnyway'),
        tone: 'warning',
        icon: ShieldAlert,
      });
    },
    [confirm, formatTime]
  );
}

/**
 * Returns `showLogError(error, unit?)` which explains a failed create/update of an intake log in
 * plain language (insufficient supply gets its own message). Resolves when dismissed.
 */
export function useLogErrorHandler() {
  const confirm = useConfirm();

  return useCallback(
    async (error: unknown, unit?: Medication['dosageUnit']): Promise<void> => {
      if (error instanceof InventoryInsufficientError) {
        await confirm({
          title: i18n.t('ui.safety.notEnoughSupplyTitle'),
          message: i18n.t('ui.safety.notEnoughSupply', {
            amount: unit
              ? formatDose(error.availableAmount, unit)
              : formatNumber(error.availableAmount),
          }),
          confirmLabel: i18n.t('ui.common.ok'),
          cancelLabel: i18n.t('ui.common.close'),
          icon: PackageX,
          tone: 'warning',
        });
        return;
      }
      console.error('Failed to save intake log:', error);
      await confirm({
        title: i18n.t('ui.common.somethingWentWrong'),
        message: i18n.t('ui.safety.couldNotSave'),
        confirmLabel: i18n.t('ui.common.ok'),
        cancelLabel: i18n.t('ui.common.close'),
      });
    },
    [confirm]
  );
}

/**
 * Deletes an intake log and restores supply for taken/partial doses (same rules the old History
 * screen used), then tops up that medicine's reminders. Callers reload their own data afterwards
 * (e.g. `useStore.getState().loadMedications(profileId)`).
 */
export async function undoIntakeLog(log: IntakeLog): Promise<void> {
  if (log.action === 'taken' || log.action === 'partial') {
    const medication = await getMedicationById(log.medicationId);
    if (medication) {
      await updateMedicationInventory(
        log.medicationId,
        medication.inventoryCount + log.dosageAmount
      );
    }
  }
  await deleteIntakeLog(log.id);
  bumpLogs();
  try {
    await ensureNext3DoseNotificationsForMedication(log.medicationId);
  } catch (error) {
    console.warn('Failed to top up notifications after undo:', error);
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
