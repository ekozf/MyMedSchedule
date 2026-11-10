import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import {
  createIntakeLog,
  createIntakeLogAndUpdateInventory,
  getActiveProfile,
  InventoryInsufficientError,
} from '@/lib/db/operations';
import i18n from '@/lib/i18n';
import { ensureNext3DoseNotificationsForMedication } from '@/lib/notifications/scheduler';
import { useStore } from '@/store';

// ---------------------------------------------------------------------------------------------
// Landing on Today (docs/DESIGN.md §5.7): tapping a dose reminder opens Today with that dose's
// compartment sheet. The handler only records the dose and navigates; Today picks it up with
// `takePendingTodayFocus()` (on focus, or right away via `subscribeTodayFocus`).

export interface TodayFocus {
  medicationId: string;
  /** ISO time of the scheduled dose. */
  scheduledTime: string;
}

let pendingTodayFocus: TodayFocus | null = null;
const todayFocusListeners = new Set<() => void>();

/** The dose a reminder asked Today to show, once (cleared when read). */
export function takePendingTodayFocus(): TodayFocus | null {
  const focus = pendingTodayFocus;
  pendingTodayFocus = null;
  return focus;
}

/** Called whenever a reminder sets a new focus. Returns an unsubscribe function. */
export function subscribeTodayFocus(listener: () => void): () => void {
  todayFocusListeners.add(listener);
  return () => {
    todayFocusListeners.delete(listener);
  };
}

/** Dose data of a reminder (dose or snoozed dose), or null for other notifications. */
export function todayFocusFromData(data: any): TodayFocus | null {
  if (!data || data.kind === 'refill' || data.type === 'refill') return null;
  if (typeof data.medicationId !== 'string' || typeof data.scheduledTime !== 'string') return null;
  if (Number.isNaN(new Date(data.scheduledTime).getTime())) return null;
  return { medicationId: data.medicationId, scheduledTime: data.scheduledTime };
}

/**
 * Record the dose and go to Today. When the app is locked nothing navigates here: the lock screen
 * opens Today after unlocking, and Today then reads the pending focus.
 */
export function openTodayFor(focus: TodayFocus): void {
  pendingTodayFocus = focus;
  todayFocusListeners.forEach((l) => l());
  const { isAuthenticated, activeProfile } = useStore.getState();
  if (!isAuthenticated || !activeProfile) return;
  try {
    router.navigate('/(tabs)/dashboard' as Href);
  } catch (error) {
    console.warn('Could not open Today from a reminder:', error);
  }
}

// Set up how notifications should be handled when the app is in the foreground
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // shouldShowAlert is deprecated; keep notifications visible in foreground via banner/list.
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Set up notification categories with actions
export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('MEDICATION_REMINDER', [
    {
      identifier: 'TAKE',
      buttonTitle: i18n.t('notifications.actions.take'),
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'SNOOZE',
      buttonTitle: i18n.t('notifications.actions.snooze15'),
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'SKIP',
      buttonTitle: i18n.t('notifications.actions.skip'),
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

// Handle notification responses (when user taps on notification or action button)
export async function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const { notification, actionIdentifier } = response;
  const data = notification.request.content.data;

  switch (actionIdentifier) {
    case 'TAKE':
      await handleTakeAction(data);
      // Dismiss the notification after handling the action
      await Notifications.dismissNotificationAsync(notification.request.identifier);
      break;
    case 'SNOOZE':
      await handleSnoozeAction(data);
      // Dismiss the notification after handling the action
      await Notifications.dismissNotificationAsync(notification.request.identifier);
      break;
    case 'SKIP':
      await handleSkipAction(data);
      // Dismiss the notification after handling the action
      await Notifications.dismissNotificationAsync(notification.request.identifier);
      break;
    case Notifications.DEFAULT_ACTION_IDENTIFIER: {
      // Tapped the reminder itself: land on Today with that dose's compartment open.
      const focus = todayFocusFromData(data);
      if (focus) {
        openTodayFor(focus);
        // Handled here, so Today must not pick it up again as the launch response.
        try {
          Notifications.clearLastNotificationResponse();
        } catch {
          // older native module: Today's launch check is guarded by the pending focus anyway
        }
      }
      break;
    }
  }
}

async function handleTakeAction(data: any) {
  try {
    const profile = await getActiveProfile();
    if (!profile) return;

    // "Take" is an honest record even when the supply count says 0: log it, count floors at 0.
    await createIntakeLogAndUpdateInventory(
      {
        medicationId: data.medicationId,
        profileId: profile.id,
        scheduledTime: data.scheduledTime,
        actualTime: new Date(),
        action: 'taken',
        dosageAmount: data.dosageAmount,
      },
      { allowShortSupply: true }
    );

    // Keep next-3 buffer topped up
    await ensureNext3DoseNotificationsForMedication(data.medicationId);
  } catch (error) {
    if (
      error instanceof InventoryInsufficientError ||
      (error as any)?.name === 'InventoryInsufficientError'
    ) {
      // Not enough inventory: do not log or decrement.
      console.warn('Skipped logging intake from notification due to insufficient inventory');
      return;
    }
    console.error('Failed to log intake from notification:', error);
  }
}

async function handleSnoozeAction(data: any) {
  try {
    const snoozeTime = new Date();
    snoozeTime.setMinutes(snoozeTime.getMinutes() + 15);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.snoozedTitle'),
        body: i18n.t('notifications.snoozedBody', { medication: data.medicationName }),
        data: {
          ...data,
          kind: 'snooze',
        },
        sound: 'default',
        categoryIdentifier: 'MEDICATION_REMINDER',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeTime,
        channelId: 'medication_reminders',
      },
    });

    // Also keep normal dose reminders at next-3
    if (data?.medicationId) {
      await ensureNext3DoseNotificationsForMedication(data.medicationId);
    }
  } catch (error) {
    console.error('Failed to snooze notification:', error);
  }
}

async function handleSkipAction(data: any) {
  try {
    const profile = await getActiveProfile();
    if (!profile) return;

    await createIntakeLog({
      medicationId: data.medicationId,
      profileId: profile.id,
      scheduledTime: data.scheduledTime,
      actualTime: new Date(),
      action: 'skipped',
      dosageAmount: data.dosageAmount,
    });

    // Keep next-3 buffer topped up
    await ensureNext3DoseNotificationsForMedication(data.medicationId);
  } catch (error) {
    console.error('Failed to log skip from notification:', error);
  }
}
