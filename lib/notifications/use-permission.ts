/**
 * Live notification permission state for the UI (Settings row, Today's banner and the
 * "Allow reminders?" sheet). Re-reads when the app comes back to the foreground, so returning
 * from the phone's settings updates it straight away.
 *
 * @example
 * const { state, refresh } = useNotificationPermission(); // null while loading
 * if (state === 'denied') openAppSettings();
 */
import * as React from 'react';
import { AppState, Linking } from 'react-native';
import {
  getNotificationPermissionState,
  type NotificationPermissionState,
} from './permissions';

const listeners = new Set<() => void>();

/** Ask every mounted `useNotificationPermission` to re-read (after the OS dialog, for example). */
export function notifyPermissionChanged() {
  listeners.forEach((l) => l());
}

export function useNotificationPermission() {
  const [state, setState] = React.useState<NotificationPermissionState | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      setState(await getNotificationPermissionState());
    } catch {
      setState(null); // not available (web / tests)
    }
  }, []);

  React.useEffect(() => {
    refresh();
    listeners.add(refresh);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      listeners.delete(refresh);
      sub.remove();
    };
  }, [refresh]);

  return { state, refresh };
}

/** Opens this app's page in the phone's settings (where notifications are switched on). */
export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (error) {
    console.warn('Could not open the app settings:', error);
  }
}

// "Not now" on the "Allow reminders?" sheet: don't ask again until the app starts next time.
let promptDismissed = false;
const promptListeners = new Set<() => void>();
export const reminderPrompt = {
  get dismissed() {
    return promptDismissed;
  },
  dismiss() {
    promptDismissed = true;
    promptListeners.forEach((l) => l());
  },
  /** Calls `fn` when the sheet has been answered (and is gone). Returns an unsubscribe. */
  subscribe(fn: () => void): () => void {
    promptListeners.add(fn);
    return () => {
      promptListeners.delete(fn);
    };
  },
};
