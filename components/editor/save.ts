/**
 * Save side effects for add / edit, identical to the previous screens:
 * add  → createMedication, requestNotificationPermissions, (granted) schedule doses unless as
 *        needed + refill reminder, reload medications.
 * edit → updateMedication, (active) cancel + reschedule doses unless as needed + refill reminder,
 *        reload medications.
 */
import { createMedication, updateMedication } from '@/lib/db/operations';
import { requestNotificationPermissions } from '@/lib/notifications/permissions';
import {
  cancelNotificationsForMedication,
  scheduleNotificationsForMedication,
  scheduleRefillReminder,
} from '@/lib/notifications/scheduler';
import { useStore } from '@/store';
import type { Medication } from '@/types';
import { toCreateInput, toUpdateInput, type MedicineForm } from './form-model';

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
  const updated = await updateMedication(id, toUpdateInput(form, initial));

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
