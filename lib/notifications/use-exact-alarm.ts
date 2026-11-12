/**
 * Android 12+ "Alarms & reminders" access, live for the UI. Without it Android may deliver
 * reminders minutes late (inexact alarms). Re-reads when the app comes back to the foreground, and
 * when access has just been granted re-schedules the upcoming reminders so they become exact.
 *
 * `supported` is false on iOS, web and Android < 12 (nothing to ask for; `granted` is then true).
 *
 * @example
 * const { supported, granted, openSettings } = useExactAlarmPermission();
 * if (supported && !granted) <Row title="Allow exact reminders" onPress={openSettings} />
 */
import * as React from 'react';
import { AppState } from 'react-native';
import {
  canScheduleExactAlarms,
  isExactAlarmPermissionSupported,
  openExactAlarmSettings,
} from '@/modules/exact-alarm';
import { rescheduleDoseRemindersForActiveProfile } from './scheduler';

export interface ExactAlarmPermission {
  supported: boolean;
  granted: boolean;
  /** Re-reads the state (also happens on every return to the foreground). */
  refresh: () => void;
  /** Opens this app's "Alarms & reminders" page in the phone's settings. */
  openSettings: () => void;
}

// Shared across hook instances so a grant reschedules once, not once per mounted hook.
let lastKnown: boolean | null = null;

/** Reads the state; when it flipped from denied to granted, reschedules reminders (best effort). */
export function checkExactAlarmPermission(): boolean {
  const granted = canScheduleExactAlarms();
  if (lastKnown === false && granted) {
    rescheduleDoseRemindersForActiveProfile().catch((error) =>
      console.warn('Could not reschedule reminders after exact alarms were allowed:', error)
    );
  }
  lastKnown = granted;
  return granted;
}

export function useExactAlarmPermission(): ExactAlarmPermission {
  const supported = isExactAlarmPermissionSupported();
  const [granted, setGranted] = React.useState(() => checkExactAlarmPermission());

  const refresh = React.useCallback(() => setGranted(checkExactAlarmPermission()), []);

  React.useEffect(() => {
    if (!supported) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [supported, refresh]);

  return { supported, granted, refresh, openSettings: openExactAlarmSettings };
}
