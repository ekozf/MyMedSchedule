/**
 * Data actions for the Medicines screens. Same backend calls, in the same order, as the old
 * `app/medication/[id].tsx`, `InventoryManager` and `PrnDoseLogDialog`.
 *
 * @example
 * await saveSupply(med, computeNewCount('add', med.inventoryCount, 30), profileId);
 * await setMedicineActive(med, false, profileId);
 * const logAsNeeded = useLogAsNeeded();
 * const log = await logAsNeeded(med, 1.5, 'headache'); // null when cancelled / failed
 */
import { useCallback } from 'react';
import { bumpLogs } from '@/lib/ui/data-refresh';
import {
  createIntakeLogAndUpdateInventory,
  deleteMedication,
  getMedicationById,
  updateMedication,
  updateMedicationInventory,
} from '@/lib/db/operations';
import {
  cancelAllNotificationsForMedication,
  scheduleNotificationsForMedication,
  scheduleRefillReminder,
} from '@/lib/notifications/scheduler';
import { useDoseSafetyCheck, useLogErrorHandler } from '@/lib/ui/dose-actions';
import { haptics } from '@/lib/ui/haptics';
import { useStore } from '@/store';
import type { IntakeLog, Medication } from '@/types';

export type SupplyMode = 'add' | 'remove' | 'set';

/** New supply count for an adjustment (remove never goes below 0). */
export function computeNewCount(mode: SupplyMode, current: number, amount: number): number {
  const a = Number.isFinite(amount) ? amount : 0;
  switch (mode) {
    case 'add':
      return current + a;
    case 'remove':
      return Math.max(0, current - a);
    case 'set':
      return Math.max(0, a);
  }
}

async function reloadMedications(profileId?: string) {
  const id = profileId ?? useStore.getState().activeProfile?.id;
  if (id) await useStore.getState().loadMedications(id);
}

/** Save a new supply count, re-plan the refill reminder and reload the store. */
export async function saveSupply(
  medication: Medication,
  newCount: number,
  profileId?: string
): Promise<void> {
  await updateMedicationInventory(medication.id, newCount);
  const updated = await getMedicationById(medication.id);
  if (updated) await scheduleRefillReminder(updated);
  await reloadMedications(profileId);
}

/** Stop or resume a medicine (reminders are cancelled / re-planned accordingly). */
export async function setMedicineActive(
  medication: Medication,
  active: boolean,
  profileId?: string
): Promise<Medication | null> {
  const updated = await updateMedication(medication.id, { isActive: active });
  if (active && updated && !updated.isPrn) {
    await scheduleNotificationsForMedication(updated);
    await scheduleRefillReminder(updated);
  } else {
    await cancelAllNotificationsForMedication(medication.id);
  }
  await reloadMedications(profileId);
  return updated;
}

/** Delete a medicine and its reminders. */
export async function removeMedicine(medication: Medication, profileId?: string): Promise<void> {
  await cancelAllNotificationsForMedication(medication.id);
  await deleteMedication(medication.id);
  await reloadMedications(profileId);
}

/**
 * Returns `log(medication, amount, notes?)` for an as-needed dose taken now: safety check →
 * create log (+ supply) → reload → success haptic. Resolves the log, or null when the person
 * cancelled at the safety check or saving failed (the error has been explained already).
 */
export function useLogAsNeeded() {
  const checkSafety = useDoseSafetyCheck();
  const showLogError = useLogErrorHandler();

  return useCallback(
    async (medication: Medication, amount: number, notes?: string): Promise<IntakeLog | null> => {
      const profileId = useStore.getState().activeProfile?.id;
      if (!profileId) return null;
      const now = new Date();
      if (!(await checkSafety(medication, amount, now))) return null;
      try {
        const { log } = await createIntakeLogAndUpdateInventory({
          medicationId: medication.id,
          profileId,
          scheduledTime: undefined,
          actualTime: now,
          action: 'taken',
          dosageAmount: amount,
          notes: notes?.trim() ? notes.trim() : undefined,
        });
        await reloadMedications(profileId);
        bumpLogs();
        haptics.success();
        return log;
      } catch (error) {
        haptics.warning();
        await showLogError(error, medication.dosageUnit);
        return null;
      }
    },
    [checkSafety, showLogError]
  );
}
