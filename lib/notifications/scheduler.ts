import * as Notifications from 'expo-notifications';
import { getDosesForDate, getAllDosesForDate } from '@/lib/schedule/calculator';
import type { Medication } from '@/types';
import { addDays, startOfDay, setHours, setMinutes, isAfter, isBefore, isSameMinute } from 'date-fns';

// Schedule notifications for next 7 days with batching support
export async function scheduleNotificationsForMedication(medication: Medication): Promise<void> {
  if (medication.isPrn || !medication.isActive) {
    return;
  }

  // Cancel existing notifications for this medication
  await cancelNotificationsForMedication(medication.id);

  const today = startOfDay(new Date());
  const now = new Date();
  const scheduledTimes = new Set<string>(); // Track scheduled times to avoid duplicates
  
  // Schedule for next 7 days
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const doses = getDosesForDate(medication, date);

    for (const dose of doses) {
      // Only schedule future doses
      if (isAfter(dose.time, now)) {
        const timeKey = dose.time.toISOString();
        
        // Skip if we've already scheduled for this exact time
        if (scheduledTimes.has(timeKey)) {
          continue;
        }
        
        scheduledTimes.add(timeKey);
        
        try {
          // Determine notification priority based on bypassDnd setting
          const priority = medication.bypassDnd 
            ? Notifications.AndroidNotificationPriority.MAX 
            : Notifications.AndroidNotificationPriority.HIGH;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Medication Reminder',
              body: `Time to take ${medication.name} - ${dose.dosageAmount} ${dose.dosageUnit}`,
              data: {
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
              date: dose.time,
              channelId: 'medication_reminders',
            },
          });
        } catch (error) {
          console.error('Failed to schedule notification:', error);
        }
      }
    }
  }
  
  // Handle next-dose override: schedule notification for override time if it's in the future
  if (medication.nextDoseOverrideTime) {
    const overrideTime = new Date(medication.nextDoseOverrideTime);
    
    if (isAfter(overrideTime, now)) {
      const overrideTimeKey = overrideTime.toISOString();
      
      // Only schedule if we haven't already scheduled for this time
      if (!scheduledTimes.has(overrideTimeKey)) {
        try {
          const priority = medication.bypassDnd 
            ? Notifications.AndroidNotificationPriority.MAX 
            : Notifications.AndroidNotificationPriority.HIGH;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Medication Reminder',
              body: `Time to take ${medication.name} - ${medication.dosageAmount} ${medication.dosageUnit}`,
              data: {
                medicationId: medication.id,
                medicationName: medication.name,
                dosageAmount: medication.dosageAmount,
                dosageUnit: medication.dosageUnit,
                scheduledTime: overrideTime.toISOString(),
                imageUri: medication.imageUri,
                notes: medication.notes,
              },
              sound: 'default',
              priority,
              categoryIdentifier: 'MEDICATION_REMINDER',
            },
            trigger: {
              date: overrideTime,
              channelId: 'medication_reminders',
            },
          });
        } catch (error) {
          console.error('Failed to schedule override notification:', error);
        }
      }
    }
  }
}

// Schedule batched notifications for medications at the same time
export async function scheduleBatchedNotifications(medications: Medication[]): Promise<void> {
  const activeMedications = medications.filter(m => m.isActive && !m.isPrn);
  if (activeMedications.length === 0) return;

  const today = startOfDay(new Date());
  const now = new Date();
  
  // Get all doses for the next 7 days (getAllDosesForDate already handles schedule start gating and overrides)
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const allDoses = getAllDosesForDate(activeMedications, date);
    
    // Group doses by time
    const dosesByTime = new Map<string, typeof allDoses>();
    for (const dose of allDoses) {
      const timeKey = dose.time.toISOString();
      if (!dosesByTime.has(timeKey)) {
        dosesByTime.set(timeKey, []);
      }
      dosesByTime.get(timeKey)!.push(dose);
    }
    
    // Schedule notifications
    for (const [timeKey, doses] of dosesByTime) {
      const doseTime = new Date(timeKey);
      
      // Only schedule future doses
      if (!isAfter(doseTime, now)) continue;
      
      try {
        if (doses.length === 1) {
          // Single medication - regular notification
          const dose = doses[0];
          const med = activeMedications.find(m => m.id === dose.medicationId);
          if (!med) continue;
          
          const priority = med.bypassDnd 
            ? Notifications.AndroidNotificationPriority.MAX 
            : Notifications.AndroidNotificationPriority.HIGH;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Medication Reminder',
              body: `Time to take ${dose.medicationName} - ${dose.dosageAmount} ${dose.dosageUnit}`,
              data: {
                medicationId: dose.medicationId,
                medicationName: dose.medicationName,
                dosageAmount: dose.dosageAmount,
                dosageUnit: dose.dosageUnit,
                scheduledTime: doseTime.toISOString(),
                imageUri: med.imageUri,
                notes: med.notes,
              },
              sound: 'default',
              priority,
              categoryIdentifier: 'MEDICATION_REMINDER',
            },
            trigger: {
              date: doseTime,
              channelId: 'medication_reminders',
            },
          });
        } else {
          // Multiple medications - batched notification
          const medicationList = doses.map(d => `• ${d.medicationName} (${d.dosageAmount} ${d.dosageUnit})`).join('\n');
          const hasCritical = doses.some(d => {
            const med = activeMedications.find(m => m.id === d.medicationId);
            return med?.bypassDnd;
          });
          
          const priority = hasCritical
            ? Notifications.AndroidNotificationPriority.MAX 
            : Notifications.AndroidNotificationPriority.HIGH;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${doses.length} Medications Due`,
              body: medicationList,
              data: {
                isBatched: true,
                doses: doses.map(d => ({
                  medicationId: d.medicationId,
                  medicationName: d.medicationName,
                  dosageAmount: d.dosageAmount,
                  dosageUnit: d.dosageUnit,
                })),
                scheduledTime: doseTime.toISOString(),
              },
              sound: 'default',
              priority,
              categoryIdentifier: 'MEDICATION_REMINDER',
            },
            trigger: {
              date: doseTime,
              channelId: 'medication_reminders',
            },
          });
        }
      } catch (error) {
        console.error('Failed to schedule notification:', error);
      }
    }
  }
}

export async function scheduleNotificationsForAllMedications(medications: Medication[]): Promise<void> {
  for (const medication of medications) {
    await scheduleNotificationsForMedication(medication);
  }
}

export async function cancelNotificationsForMedication(medicationId: string): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduledNotifications) {
    if (notification.content.data?.medicationId === medicationId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Cancel a specific notification for a dose by medication ID and scheduled time
export async function cancelNotificationForDose(medicationId: string, scheduledTimeIso: string): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduledNotifications) {
    const data = notification.content.data;
    if (
      data?.medicationId === medicationId &&
      data?.scheduledTime === scheduledTimeIso
    ) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
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
        dailyUsage = medication.dosageAmount * (config.weekdays?.length || 0) / 7;
        break;
      case 'cycle':
        const cycleLength = (config.daysOn || 0) + (config.daysOff || 0);
        dailyUsage = medication.dosageAmount * (config.daysOn || 0) / cycleLength;
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

    const dosesUntilReminder = medication.inventoryCount - medication.refillReminderValue;
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
        title: 'Refill Reminder',
        body: `Time to refill ${medication.name}. You have ${medication.inventoryCount} ${medication.dosageUnit} remaining.`,
        data: {
          type: 'refill',
          medicationId: medication.id,
          medicationName: medication.name,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
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
    if (notification.content.data?.type === 'refill' && 
        notification.content.data?.medicationId === medicationId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}
