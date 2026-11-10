/**
 * Notification permission helpers.
 *
 * The OS permission dialog is never shown out of the blue: the app first explains why on Today
 * ("Allow reminders?", see `ReminderPermissionSheet`) and only then calls
 * `requestNotificationPermissions({ prompt: true })`. Without `prompt` nothing is shown.
 *
 * @example
 * const state = await getNotificationPermissionState(); // 'granted' | 'undetermined' | 'denied'
 * if (state === 'undetermined') showAllowRemindersSheet();
 * const ok = await requestNotificationPermissions({ prompt: true }); // after "Continue"
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationPermissionState = 'granted' | 'undetermined' | 'denied';

/**
 * 'granted' | 'undetermined' (the OS can still show its dialog) | 'denied' (only the phone's
 * settings can switch reminders on). Android 13+ reports `status: 'denied'` with
 * `canAskAgain: true` before the app has ever asked, so `canAskAgain` decides, not `status`.
 */
export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const { status, granted, canAskAgain } = await Notifications.getPermissionsAsync();
  if (granted || status === 'granted') return 'granted';
  if (canAskAgain === false) return 'denied';
  return 'undetermined';
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('medication_reminders', {
    name: 'Medication Reminders',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'default',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
  });
}

/**
 * Resolves whether reminders can work.
 * - Granted: sets up the Android channel, true.
 * - Not decided yet: with `prompt` the OS dialog is shown and its answer returned; without it
 *   nothing is shown and it resolves true (reminders can still be planned; the "Allow reminders?"
 *   sheet on Today asks right after the first scheduled medicine is saved).
 * - Denied: with `prompt` the OS is asked again (it may refuse silently); without it, false.
 */
// The OS permission dialog may be up while a prompting request runs. Others (the "Count my supply"
// sheet) wait for it so two questions never stack.
let asking = 0;
const askListeners = new Set<() => void>();

/** True while `requestNotificationPermissions({ prompt: true })` is running. */
export function isAskingForPermission(): boolean {
  return asking > 0;
}

/** Calls `fn` each time a prompting permission request finishes. Returns an unsubscribe. */
export function onPermissionAskEnd(fn: () => void): () => void {
  askListeners.add(fn);
  return () => {
    askListeners.delete(fn);
  };
}

export async function requestNotificationPermissions(
  options: { prompt?: boolean } = {}
): Promise<boolean> {
  if (!options.prompt) return requestPermissionsImpl(options);
  asking++;
  try {
    return await requestPermissionsImpl(options);
  } finally {
    asking--;
    askListeners.forEach((l) => l());
  }
}

async function requestPermissionsImpl(options: { prompt?: boolean }): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  const existingStatus = existing.granted ? 'granted' : existing.status;
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    // Still askable (Android 13+ says 'denied' before the first ask): reminders can be planned.
    if (!options.prompt) return existing.canAskAgain !== false;
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notification permissions not granted');
    return false;
  }

  await ensureAndroidChannel();
  return true;
}

export async function checkNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}
