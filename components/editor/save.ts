/**
 * Save side effects for add / edit, identical to the previous screens:
 * add  → createMedication, requestNotificationPermissions, (granted) schedule doses unless as
 *        needed + refill reminder, reload medications.
 * edit → updateMedication (a changed schedule starts now unless a passed time today is logged),
 *        (active) cancel + reschedule doses unless as needed + refill reminder,
 *        reload medications.
 */
import { createMedication, getIntakeLogsByMedication, updateMedication } from '@/lib/db/operations';
import { requestNotificationPermissions } from '@/lib/notifications/permissions';
import {
  cancelNotificationsForMedication,
  scheduleNotificationsForMedication,
  scheduleRefillReminder,
} from '@/lib/notifications/scheduler';
import { useStore } from '@/store';
import type { Medication } from '@/types';
import { schedulesEqual, toCreateInput, toUpdateInput, type MedicineForm } from './form-model';
import { scheduleStartForEdit } from './schedule-start';

export async function saveNewMedicine(
  form: MedicineForm,
  profileId: string
): Promise<{ medication: Medication; notificationsAllowed: boolean }> {
  const medication = await createMedication(toCreateInput(form, profileId));

  const notificationsAllowed = await requestNotificationPermissions();
  if (notificationsAllowed) {
    if (form.scheduleType !== 'prn') {
      await scheduleNotificationsForMedication(medication);
    }
    await scheduleRefillReminder(medication);
  }

  await useStore.getState().loadMedications(profileId);
  return { medication, notificationsAllowed };
}

export async function saveEditedMedicine(
  id: string,
  form: MedicineForm,
  initial: MedicineForm,
  profileId: string
): Promise<Medication | null> {
  const input = toUpdateInput(form, initial);
  if (!schedulesEqual(form, initial)) {
    const logs = await getIntakeLogsByMedication(id);
    input.scheduleStart = scheduleStartForEdit(form, initial, logs);
  }
  const updated = await updateMedication(id, input);

  if (updated && updated.isActive) {
    await cancelNotificationsForMedication(id);
    if (form.scheduleType !== 'prn') {
      await scheduleNotificationsForMedication(updated);
    }
    await scheduleRefillReminder(updated);
  }

  await useStore.getState().loadMedications(profileId);
  return updated;
}
