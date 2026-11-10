/**
 * Data actions for the Medicines screens. Same backend calls, in the same order, as the old
 * `app/medication/[id].tsx`, `InventoryManager` and `PrnDoseLogDialog`.
 *
 * @example
 * await saveSupply(med, computeNewCount('add', med.inventoryCount, 30), profileId);
 * await setMedicineActive(med, false, profileId);
 * const logAsNeeded = useLogAsNeeded({ onUpdateSupply: (m) => openSupplySheet(m) });
 * const log = await logAsNeeded(med, 1.5, 'headache'); // null when cancelled / failed
 */
import { useCallback } from 'react';
import { bumpLogs } from '@/lib/ui/data-refresh';
import {
  createIntakeLogAndUpdateInventory,
  createInventoryAdjustment,
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
import { useDoseSafetyCheck, useLogErrorHandler, useSupplyCheck } from '@/lib/ui/dose-actions';
import { haptics } from '@/lib/ui/haptics';
import { useStore } from '@/store';
import type { IntakeLog, Medication } from '@/types';

export type SupplyMode = 'add' | 'remove' | 'set';

/** Why the supply changed (the supply sheet's "Why?" chips). Stored with the adjustment. */
export type SupplyReason = 'refill' | 'lost' | 'correction' | 'other';

export interface SupplyChange {
  /** Which part of the supply sheet made the change. Default 'set'. */
  mode?: SupplyMode;
  /** The number entered (what was added / removed, or the new total). Default the new count. */
  amount?: number;
  reason?: SupplyReason | null;
  /**
   * First count only: the refill reminder to set with it ('days' or, for as-needed medicines,
   * 'doses'), or null for none. Undefined leaves the reminder as it is.
   */
  refill?: { type: 'days' | 'doses'; value: number } | null;
}

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

/**
 * Save a new supply count, record the change (with its reason) for "Last change", re-plan the
 * refill reminder and reload the store. Entering a count means the person counts this medicine,
 * so an untracked supply starts being tracked; the first count can set the refill reminder too.
 */
export async function saveSupply(
  medication: Medication,
  newCount: number,
  profileId?: string,
  change: SupplyChange = {}
): Promise<void> {
  const next = Math.max(0, newCount);
  const untracked = medication.trackSupply === false;
  const previous = untracked ? 0 : Math.max(0, medication.inventoryCount ?? 0);
  const refill =
    change.refill === undefined
      ? {}
      : change.refill
        ? { refillReminderType: change.refill.type, refillReminderValue: change.refill.value }
        : { refillReminderType: null, refillReminderValue: null };
  if (untracked || change.refill !== undefined) {
    await updateMedication(medication.id, {
      inventoryCount: next,
      trackSupply: true,
      ...refill,
    });
  } else {
    await updateMedicationInventory(medication.id, next);
  }
  try {
    await createInventoryAdjustment({
      medicationId: medication.id,
      adjustmentType: change.mode ?? 'set',
      amount: change.amount ?? next,
      previousCount: previous,
      newCount: next,
      reason: change.reason ?? undefined,
    });
  } catch (error) {
    // The count is saved; a missing history line must not turn this into a failed save.
    console.warn('Failed to record supply change:', error);
  }
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
 * supply check (a short count asks "Log anyway" / "Update supply first", never blocks) → create
 * log (+ supply) → reload → success haptic. Resolves the log, or null when the person cancelled,
 * chose "Update supply first" (`onUpdateSupply` is called) or saving failed (already explained).
 */
export function useLogAsNeeded(
  options: { onUpdateSupply?: (medication: Medication) => void } = {}
) {
  const { onUpdateSupply } = options;
  const checkSafety = useDoseSafetyCheck();
  const checkSupply = useSupplyCheck();
  const showLogError = useLogErrorHandler();

  return useCallback(
    async (medication: Medication, amount: number, notes?: string): Promise<IntakeLog | null> => {
      const profileId = useStore.getState().activeProfile?.id;
      if (!profileId) return null;
      const now = new Date();
      if (!(await checkSafety(medication, amount, now))) return null;
      const supply = await checkSupply(medication, amount);
      if (supply === 'update') onUpdateSupply?.(medication);
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
    [checkSafety, checkSupply, showLogError, onUpdateSupply]
  );
}
