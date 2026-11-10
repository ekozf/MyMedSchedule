import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import {
  createIntakeLog,
  createIntakeLogAndUpdateInventory,
  getActiveProfile,
  hasIntakeLogForDose,
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

const REMINDER_ACTIONS = new Set(['TAKE', 'SNOOZE', 'SKIP']);

/**
 * Run a reminder button (Take / Snooze / Skip) and dismiss the reminder.
 * On Android this runs from two places: the background task when the app was not in the
 * foreground (lib/notifications/background-actions.ts), and the in-app listener, which may get
 * the same press again later. Each action is safe to run twice.
 */
export async function handleReminderAction(
  actionIdentifier: string,
  notificationId: string,
  data: any
): Promise<void> {
  switch (actionIdentifier) {
    case 'TAKE':
      await handleTakeAction(data);
      break;
    case 'SNOOZE':
      await handleSnoozeAction(data);
      break;
    case 'SKIP':
      await handleSkipAction(data);
      break;
    default:
      return;
  }
  try {
    await Notifications.dismissNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Could not dismiss reminder:', error);
  }
}

export interface ParsedTaskResponse {
  actionIdentifier: string;
  notificationId: string;
  data: any;
}

/**
 * Read a notification response from the background task payload. Android hands it over as raw
 * native data: the reminder's `data` arrives as a JSON string in `content.dataString`.
 * Returns null for anything that is not a reminder button press.
 */
export function parseTaskResponse(payload: any): ParsedTaskResponse | null {
  if (!payload || typeof payload.actionIdentifier !== 'string') return null;
  if (!REMINDER_ACTIONS.has(payload.actionIdentifier)) return null;
  const request = payload.notification?.request;
  if (!request || typeof request.identifier !== 'string') return null;
  const content = request.content ?? {};
  let data = content.data;
  if (!data && typeof content.dataString === 'string') {
    try {
      data = JSON.parse(content.dataString);
    } catch {
      data = null;
    }
  }
  if (!data || typeof data !== 'object') return null;
  return { actionIdentifier: payload.actionIdentifier, notificationId: request.identifier, data };
}

// Handle notification responses (when user taps on notification or action button)
export async function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const { notification, actionIdentifier } = response;
  const data = notification.request.content.data;

  if (REMINDER_ACTIONS.has(actionIdentifier)) {
    await handleReminderAction(actionIdentifier, notification.request.identifier, data);
    return;
  }

  if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
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
  }
}

/** True when this dose is already logged, so a repeated press does nothing. */
async function isDoseAlreadyLogged(data: any): Promise<boolean> {
  if (typeof data?.medicationId !== 'string' || typeof data?.scheduledTime !== 'string') {
    return false;
  }
  return hasIntakeLogForDose(data.medicationId, data.scheduledTime);
}

async function handleTakeAction(data: any) {
  try {
    const profile = await getActiveProfile();
    if (!profile) return;
    if (await isDoseAlreadyLogged(data)) return;

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

    // One snooze per dose: a fixed identifier means a repeated press replaces it instead of
    // stacking a second reminder.
    await Notifications.scheduleNotificationAsync({
      identifier: `snooze-${data.medicationId}-${data.scheduledTime}`,
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
    if (await isDoseAlreadyLogged(data)) return;

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
