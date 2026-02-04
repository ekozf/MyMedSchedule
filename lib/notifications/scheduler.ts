import * as Notifications from 'expo-notifications';
import { getNextDose, type ScheduledDose } from '@/lib/schedule/calculator';
import type { Medication } from '@/types';
import i18n from '@/lib/i18n';
import { addDays, startOfDay, isAfter, isBefore } from 'date-fns';

const NEXT_DOSE_BUFFER_SIZE = 3;
const MIN_SCHEDULE_LEAD_TIME_MS = 30_000; // avoid "instant delivery" loops / releasing past-due backlogs

function getDoseNotificationPriority(medication: Medication) {
  return medication.bypassDnd
    ? Notifications.AndroidNotificationPriority.MAX
    : Notifications.AndroidNotificationPriority.HIGH;
}

function getDoseNotificationBody(input: {
  medicationName: string;
  dosageAmount: number;
  dosageUnit: string;
}): string {
  return i18n.t('notifications.doseReminderBody', {
    medication: input.medicationName,
    amount: input.dosageAmount,
    unit: input.dosageUnit,
  });
}

async function scheduleDoseNotification(input: {
  medication: Medication;
  dose: ScheduledDose;
}): Promise<void> {
  const { medication, dose } = input;
  const nowMs = Date.now();
  const triggerMs = dose.time.getTime();
  if (!Number.isFinite(triggerMs) || triggerMs <= nowMs + MIN_SCHEDULE_LEAD_TIME_MS) {
    // Never schedule "immediate" notifications here; it can create runaway loops when permissions are toggled
    // and/or a large backlog exists.
    return;
  }
  const priority = getDoseNotificationPriority(medication);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('notifications.medicationReminder'),
      body: getDoseNotificationBody({
        medicationName: medication.name,
        dosageAmount: dose.dosageAmount,
        dosageUnit: dose.dosageUnit,
      }),
      data: {
        kind: 'dose',
        medicationId: medication.id,
        medicationName: medication.name,
        dosageAmount: dose.dosageAmount,
        dosageUnit: dose.dosageUnit,
        scheduledTime: dose.time.toISOString(),
        imageUri: medication.imageUri,
        notes: medication.notes,
      },
      sound: 'default',
      priority,
      categoryIdentifier: 'MEDICATION_REMINDER',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dose.time,
      channelId: 'medication_reminders',
    },
  });
}

function getOverrideOriginalNextToSkip(
  medication: Medication,
  seedTime: Date
): { originalNextTimeMs: number } | null {
  if (!medication.nextDoseOverrideTime) return null;

  const baseMedication: Medication = { ...medication, nextDoseOverrideTime: undefined };
  const originalNext = getNextDose(baseMedication, seedTime);
  if (!originalNext) return null;
  return { originalNextTimeMs: originalNext.time.getTime() };
}

function isDoseKind(data: any): boolean {
  if (!data) return false;
  if (data.kind === 'dose') return true;

  // Back-compat: older scheduled dose notifications lacked kind.
  // Treat as dose if it looks like a dose reminder payload and is not a refill.
  if (
    data.kind == null &&
    data.type !== 'refill' &&
    data.medicationId &&
    data.scheduledTime &&
    data.dosageUnit
  ) {
    return true;
  }

  return false;
}

function getScheduledNotificationTime(
  notification: Notifications.NotificationRequest
): Date | null {
  const data: any = notification.content?.data;
  if (data?.scheduledTime) {
    const parsed = new Date(data.scheduledTime);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }

  const trigger: any = notification.trigger;
  if (!trigger) return null;

  if (trigger.date) {
    const parsed = new Date(trigger.date);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }

  if (trigger.type === 'date' && typeof trigger.value === 'number') {
    const parsed = new Date(trigger.value);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }

  return null;
}

async function pruneDoseNotificationsForMedication(input: {
  medicationId: string;
  keepNext: number;
}): Promise<void> {
  const { medicationId, keepNext } = input;
  const now = new Date(Date.now());

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const relevant: Array<{ id: string; time: Date | null; timeMs: number | null }> = [];

  for (const notification of scheduled) {
    const data: any = notification.content?.data;
    if (!data) continue;
    if (data.medicationId !== medicationId) continue;
    if (!isDoseKind(data)) continue;

    const time = getScheduledNotificationTime(notification);
    relevant.push({
      id: notification.identifier,
      time,
      timeMs: time ? time.getTime() : null,
    });
  }

  // Cancel anything past due or invalid first. These are the main cause of the "instant flood" after enabling permissions.
  for (const n of relevant) {
    if (!n.time || !Number.isFinite(n.time.getTime()) || !isAfter(n.time, now)) {
      await Notifications.cancelScheduledNotificationAsync(n.id);
    }
  }

  // Now trim future dose notifications down to the next `keepNext`.
  const scheduledAfter = await Notifications.getAllScheduledNotificationsAsync();
  const future = scheduledAfter
    .map((notification) => {
      const data: any = notification.content?.data;
      if (!data) return null;
      if (data.medicationId !== medicationId) return null;
      if (!isDoseKind(data)) return null;

      const time = getScheduledNotificationTime(notification);
      if (!time || !Number.isFinite(time.getTime())) return null;
      if (!isAfter(time, now)) return null;
      return { id: notification.identifier, timeMs: time.getTime() };
    })
    .filter(Boolean) as Array<{ id: string; timeMs: number }>;

  future.sort((a, b) => a.timeMs - b.timeMs);
  const extras = future.slice(keepNext);

  for (const extra of extras) {
    await Notifications.cancelScheduledNotificationAsync(extra.id);
  }
}

async function getNextNDoses(input: {
  medication: Medication;
  seedTime: Date;
  n: number;
  excludeTimesMs?: Set<number>;
}): Promise<ScheduledDose[]> {
  const { medication, seedTime, n, excludeTimesMs } = input;
  const results: ScheduledDose[] = [];
  const seenTimes = new Set<number>(excludeTimesMs ?? []);
  const overrideSkip = getOverrideOriginalNextToSkip(medication, seedTime);

  let afterTime = seedTime;
  while (results.length < n) {
    const next = getNextDose(medication, afterTime);
    if (!next) break;

    const nextTimeMs = next.time.getTime();

    if (overrideSkip && nextTimeMs === overrideSkip.originalNextTimeMs) {
      afterTime = new Date(nextTimeMs + 1);
      continue;
    }

    if (seenTimes.has(nextTimeMs)) {
      afterTime = new Date(nextTimeMs + 1);
      continue;
    }

    seenTimes.add(nextTimeMs);
    results.push(next);
    afterTime = new Date(nextTimeMs + 1);
  }

  return results;
}

// Schedule notifications for the next 3 doses
export async function scheduleNotificationsForMedication(medication: Medication): Promise<void> {
  if (medication.isPrn || !medication.isActive) {
    return;
  }

  // Cancel only dose reminders for this medication, keep refill reminders intact.
  await cancelNotificationsForMedication(medication.id);

  const now = new Date(Date.now());
  const nextDoses = await getNextNDoses({
    medication,
    seedTime: now,
    n: NEXT_DOSE_BUFFER_SIZE,
  });

  for (const dose of nextDoses) {
    if (!isAfter(dose.time, now)) continue;
    try {
      await scheduleDoseNotification({ medication, dose });
    } catch (error) {
      console.error('Failed to schedule dose notification:', error);
    }
  }
}

// Schedule batched notifications for medications at the same time
export async function scheduleBatchedNotifications(medications: Medication[]): Promise<void> {
  const activeMedications = medications.filter((m) => m.isActive && !m.isPrn);
  if (activeMedications.length === 0) return;

  // NOTE: The app uses per-medication "next 3" scheduling. Batched scheduling is retained for potential future use,
  // but is no longer used for priming notifications to avoid large notification spam.
  for (const medication of activeMedications) {
    await scheduleNotificationsForMedication(medication);
  }
}

export async function scheduleNotificationsForAllMedications(
  medications: Medication[]
): Promise<void> {
  for (const medication of medications) {
    await scheduleNotificationsForMedication(medication);
  }
}

export async function cancelNotificationsForMedication(medicationId: string): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    const data: any = notification.content?.data;
    if (data?.medicationId === medicationId && isDoseKind(data)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Cancel a specific notification for a dose by medication ID and scheduled time
export async function cancelNotificationForDose(
  medicationId: string,
  scheduledTimeIso: string
): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    const data: any = notification.content?.data;
    if (
      data?.medicationId === medicationId &&
      isDoseKind(data) &&
      data?.scheduledTime === scheduledTimeIso
    ) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

export async function cancelAllNotificationsForMedication(medicationId: string): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    const data: any = notification.content?.data;
    if (data?.medicationId === medicationId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

export async function ensureNext3DoseNotificationsForMedication(
  medicationId: string
): Promise<void> {
  const { getMedicationById } = await import('@/lib/db/operations');
  const medication = await getMedicationById(medicationId);
  if (!medication) return;
  if (!medication.isActive || medication.isPrn) return;

  // Safety: old versions could have scheduled huge 7-day backlogs. Trim them down before ensuring.
  await pruneDoseNotificationsForMedication({ medicationId, keepNext: NEXT_DOSE_BUFFER_SIZE });

  const now = new Date(Date.now());
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const scheduledDoseTimes: Array<{ timeMs: number; notificationId: string }> = [];
  for (const notification of scheduled) {
    const data: any = notification.content?.data;
    if (!data) continue;
    if (data.medicationId !== medicationId) continue;
    if (!isDoseKind(data)) continue;

    const time =
      getScheduledNotificationTime(notification) ??
      (data.scheduledTime ? new Date(data.scheduledTime) : null);
    if (!time) continue;
    if (!isAfter(time, now)) continue;

    scheduledDoseTimes.push({ timeMs: time.getTime(), notificationId: notification.identifier });
  }

  // De-dupe by time
  const uniqueFutureTimesMs = Array.from(new Set(scheduledDoseTimes.map((s) => s.timeMs))).sort(
    (a, b) => a - b
  );
  const futureCount = uniqueFutureTimesMs.length;
  if (futureCount >= NEXT_DOSE_BUFFER_SIZE) return;

  const seedTimeMs =
    uniqueFutureTimesMs.length > 0
      ? uniqueFutureTimesMs[uniqueFutureTimesMs.length - 1]
      : now.getTime();
  const seedTime = new Date(seedTimeMs);
  const excludeTimesMs = new Set<number>(uniqueFutureTimesMs);

  const missing = NEXT_DOSE_BUFFER_SIZE - futureCount;
  const additional = await getNextNDoses({
    medication,
    seedTime,
    n: missing,
    excludeTimesMs,
  });

  for (const dose of additional) {
    if (!isAfter(dose.time, now)) continue;
    try {
      await scheduleDoseNotification({ medication, dose });
    } catch (error) {
      console.error('Failed to ensure next-3 dose notification:', error);
    }
  }
}

export async function ensureNext3DoseNotificationsForAllActiveMedications(): Promise<void> {
  const { getActiveProfile, getMedicationsByProfile } = await import('@/lib/db/operations');
  const profile = await getActiveProfile();
  if (!profile) return;

  const medications = await getMedicationsByProfile(profile.id, true);
  const active = medications.filter((m) => m.isActive && !m.isPrn);

  for (const medication of active) {
    await ensureNext3DoseNotificationsForMedication(medication.id);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Reschedule all notifications (call this daily or when medications change)
export async function rescheduleAllNotifications(medications: Medication[]): Promise<void> {
  await cancelAllNotifications();
  await scheduleNotificationsForAllMedications(medications);
}

// Calculate estimated depletion date based on schedule
function calculateDepletionDate(medication: Medication): Date | null {
  if (medication.isPrn || medication.inventoryCount <= 0) {
    return null;
  }

  try {
    const config = JSON.parse(medication.scheduleConfig);
    let dailyUsage = 0;

    switch (medication.scheduleType) {
      case 'once_daily':
        dailyUsage = medication.dosageAmount;
        break;
      case 'multiple_daily':
        dailyUsage = medication.dosageAmount * (config.times?.length || 0);
        break;
      case 'every_x_days':
        dailyUsage = medication.dosageAmount / (config.intervalDays || 1);
        break;
      case 'specific_weekdays':
        dailyUsage = (medication.dosageAmount * (config.weekdays?.length || 0)) / 7;
        break;
      case 'cycle':
        const cycleLength = (config.daysOn || 0) + (config.daysOff || 0);
        dailyUsage = (medication.dosageAmount * (config.daysOn || 0)) / cycleLength;
        break;
      case 'every_x_hours':
        dailyUsage = medication.dosageAmount * (24 / (config.intervalHours || 24));
        break;
      default:
        return null;
    }

    if (dailyUsage <= 0) return null;

    const daysUntilEmpty = medication.inventoryCount / dailyUsage;
    return addDays(new Date(), Math.floor(daysUntilEmpty));
  } catch (error) {
    console.error('Failed to calculate depletion date:', error);
    return null;
  }
}

// Schedule refill reminder notification
export async function scheduleRefillReminder(medication: Medication): Promise<void> {
  if (!medication.refillReminderType || !medication.refillReminderValue) {
    return;
  }

  // Cancel existing refill notifications
  await cancelRefillNotification(medication.id);

  let reminderDate: Date | null = null;

  if (medication.refillReminderType === 'doses') {
    // Remind when X doses remaining
    const daysPerDose = calculateDaysPerDose(medication);
    if (daysPerDose === null) return;

    const perDose = medication.dosageAmount > 0 ? medication.dosageAmount : 1;
    const remainingDoses = Math.floor(medication.inventoryCount / perDose);
    const dosesUntilReminder = remainingDoses - medication.refillReminderValue;
    if (dosesUntilReminder > 0) {
      const daysUntilReminder = dosesUntilReminder * daysPerDose;
      reminderDate = addDays(new Date(), Math.floor(daysUntilReminder));
    }
  } else if (medication.refillReminderType === 'days') {
    // Remind X days before running out
    const depletionDate = calculateDepletionDate(medication);
    if (!depletionDate) return;

    reminderDate = addDays(depletionDate, -medication.refillReminderValue);
  }

  if (!reminderDate || !isAfter(reminderDate, new Date())) {
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.refillReminderTitle'),
        body: i18n.t('notifications.refillReminderBody', {
          medication: medication.name,
          count: medication.inventoryCount,
          unit: medication.dosageUnit,
        }),
        data: {
          type: 'refill',
          kind: 'refill',
          medicationId: medication.id,
          medicationName: medication.name,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
        channelId: 'medication_reminders',
      },
    });
  } catch (error) {
    console.error('Failed to schedule refill reminder:', error);
  }
}

function calculateDaysPerDose(medication: Medication): number | null {
  try {
    const config = JSON.parse(medication.scheduleConfig);

    switch (medication.scheduleType) {
      case 'once_daily':
        return 1;
      case 'multiple_daily':
        return 1 / (config.times?.length || 1);
      case 'every_x_days':
        return config.intervalDays || 1;
      case 'specific_weekdays':
        return 7 / (config.weekdays?.length || 1);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

async function cancelRefillNotification(medicationId: string): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    if (
      notification.content.data?.type === 'refill' &&
      notification.content.data?.medicationId === medicationId
    ) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}
