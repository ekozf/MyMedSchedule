/**
 * UI helpers around Android 12+ exact alarms ("Alarms & reminders"):
 * - `openExactAlarmSettingsSafely` opens the system page with the longer auto-lock limit, kept
 *   until the person is back in the app (so the trip doesn't lock the app after a minute).
 * - The "Let reminders arrive on time" sheet on Today shows once per profile, right after reminders
 *   were allowed; the flag lives in the profile settings (`exactAlarmPromptShown`), so "Delete all
 *   data" clears it with everything else.
 * - Pure decisions for the sheet and Today's "Reminders may arrive late" banner.
 *
 * @example
 * if (shouldOfferExactAlarm({ supported, granted, alreadyShown })) setAskExact(true);
 * await openExactAlarmSettingsSafely(openSettings);
 */
import { AppState } from 'react-native';
import { withAutoLockSuspended } from '@/lib/auth/auto-lock';
import { updateProfile } from '@/lib/db/operations';
import { useStore } from '@/store';
import type { NotificationPermissionState } from './permissions';

/** Leave the app within this long or the settings page probably didn't open. */
const LEAVE_WITHIN_MS = 3_000;
/** Never hold the longer auto-lock limit past this. */
const MAX_AWAY_MS = 10 * 60_000;

/** Resolves once the app is back in the foreground after leaving it (or it never left). */
function untilBackInApp(): Promise<void> {
  return new Promise((resolve) => {
    let left = false;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      sub.remove();
      clearTimeout(leaveTimer);
      clearTimeout(maxTimer);
      resolve();
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') left = true;
      else if (state === 'active' && left) finish();
    });
    const leaveTimer = setTimeout(() => {
      if (!left) finish();
    }, LEAVE_WITHIN_MS);
    const maxTimer = setTimeout(finish, MAX_AWAY_MS);
  });
}

/** Opens "Alarms & reminders" for this app without the trip locking the app. */
export async function openExactAlarmSettingsSafely(openSettings: () => void): Promise<void> {
  await withAutoLockSuspended(async () => {
    const back = untilBackInApp();
    openSettings();
    await back;
  });
}

/** The one-time sheet: Android 12+, not allowed yet, not shown before for this profile. */
export function shouldOfferExactAlarm(input: {
  supported: boolean;
  granted: boolean;
  alreadyShown: boolean;
}): boolean {
  return input.supported && !input.granted && !input.alreadyShown;
}

/**
 * Today's "Reminders may arrive late" banner: reminders are allowed but exact alarms aren't. Never
 * together with "Reminders are off" (that one needs notifications not to be granted).
 */
export function showLateRemindersBanner(input: {
  notificationState: NotificationPermissionState | null;
  supported: boolean;
  granted: boolean;
}): boolean {
  return input.notificationState === 'granted' && input.supported && !input.granted;
}

// Open while the sheet is up, so the "Count my supply" sheet waits instead of stacking on top.
let sheetOpen = false;
const sheetListeners = new Set<() => void>();
export const exactAlarmSheet = {
  get open() {
    return sheetOpen;
  },
  setOpen(open: boolean) {
    sheetOpen = open;
    if (!open) sheetListeners.forEach((l) => l());
  },
  /** Resolves once the sheet is gone (right away when it isn't showing). */
  whenClosed(): Promise<void> {
    if (!sheetOpen) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        sheetListeners.delete(done);
        resolve();
      };
      sheetListeners.add(done);
    });
  },
};

/** Remembers on the active profile that the sheet was shown (best effort). */
export async function markExactAlarmPromptShown(): Promise<void> {
  const profile = useStore.getState().activeProfile;
  if (!profile || profile.settings?.exactAlarmPromptShown) return;
  try {
    await updateProfile(profile.id, {
      settings: { ...profile.settings, exactAlarmPromptShown: true },
    });
    await useStore.getState().loadProfiles();
  } catch (error) {
    console.warn('Could not remember the on-time reminders prompt:', error);
  }
}
