/**
 * Auto-lock: when an app lock (PIN or biometrics) is set and the app has been in the background
 * for at least AUTO_LOCK_AFTER_MS, coming back marks the session as locked and opens the lock
 * screen (which unlocks to Today).
 *
 * Only the real `background` state counts — iOS `inactive` (Face ID sheet, Control Centre, app
 * switcher peek) never locks. Short trips to system UI (camera, photo library, share sheet,
 * folder picker) stay under the minute. Flows that may take longer can wrap the excursion in
 * `withAutoLockSuspended`, which stretches the limit to SUSPENDED_AUTO_LOCK_AFTER_MS.
 *
 * @example
 * // app/_layout.tsx
 * useAutoLock();
 * // around a system UI excursion
 * const result = await withAutoLockSuspended(() => ImagePicker.launchCameraAsync(opts));
 */
import * as React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { router, useNavigationContainerRef, type Href } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import { useStore } from '@/store';
import { getAuthMethod } from './index';

export const AUTO_LOCK_AFTER_MS = 60_000;
/** Limit while a known system-UI excursion (camera, share sheet, …) is in progress. */
export const SUSPENDED_AUTO_LOCK_AFTER_MS = 10 * 60_000;
const LOCK_ROUTE = '/(auth)/lock' as Href;

let suspendCount = 0;

/** Runs `fn` with the longer auto-lock limit (for camera / share sheet / pickers). */
export async function withAutoLockSuspended<T>(fn: () => Promise<T>): Promise<T> {
  suspendCount += 1;
  try {
    return await fn();
  } finally {
    // Let the AppState "active" event of the return trip arrive before counting down.
    setTimeout(() => {
      suspendCount = Math.max(0, suspendCount - 1);
    }, 1000);
  }
}

/**
 * Pure decision used by the hook: should coming back to the foreground lock the app?
 * Exported for tests.
 */
export function shouldAutoLock(input: {
  backgroundedAt: number | null;
  now: number;
  suspended: boolean;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  authMethod: string;
}): boolean {
  if (input.backgroundedAt == null) return false;
  if (!input.isAuthenticated || !input.hasCompletedOnboarding) return false;
  if (input.authMethod !== 'pin' && input.authMethod !== 'biometric') return false;
  const limit = input.suspended ? SUSPENDED_AUTO_LOCK_AFTER_MS : AUTO_LOCK_AFTER_MS;
  return input.now - input.backgroundedAt >= limit;
}

/**
 * Replaces the whole navigation history with the lock screen, so Android's back button can't pop
 * it to reveal the screen underneath. The lock screen unlocks to Today.
 */
function openLockScreen(navigation: ReturnType<typeof useNavigationContainerRef>) {
  try {
    if (navigation?.isReady?.()) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: '(auth)', params: { screen: 'lock' } }],
        })
      );
      return;
    }
  } catch (error) {
    console.warn('Auto-lock reset failed, falling back to replace:', error);
  }
  try {
    router.replace(LOCK_ROUTE);
  } catch (error) {
    console.warn('Auto-lock could not open the lock screen:', error);
  }
}

/** Mount once, in the root layout. */
export function useAutoLock(): void {
  const navigation = useNavigationContainerRef();
  const navigationRef = React.useRef(navigation);
  navigationRef.current = navigation;
  const backgroundedAt = React.useRef<number | null>(null);
  const suspendedAtBackground = React.useRef(false);

  React.useEffect(() => {
    const onChange = async (state: AppStateStatus) => {
      if (state === 'background') {
        if (backgroundedAt.current == null) {
          backgroundedAt.current = Date.now();
          suspendedAtBackground.current = suspendCount > 0;
        }
        return;
      }
      if (state !== 'active') return; // 'inactive' (iOS) never counts
      const since = backgroundedAt.current;
      const suspended = suspendedAtBackground.current || suspendCount > 0;
      backgroundedAt.current = null;
      if (since == null) return;

      const { isAuthenticated, hasCompletedOnboarding, setAuthenticated } = useStore.getState();
      if (!isAuthenticated || !hasCompletedOnboarding) return;
      let authMethod = 'none';
      try {
        authMethod = await getAuthMethod();
      } catch {
        return;
      }
      const lock = shouldAutoLock({
        backgroundedAt: since,
        now: Date.now(),
        suspended,
        isAuthenticated,
        hasCompletedOnboarding,
        authMethod,
      });
      if (!lock) return;
      setAuthenticated(false);
      openLockScreen(navigationRef.current);
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}
