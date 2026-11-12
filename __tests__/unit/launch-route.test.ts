import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
}));
vi.mock('@/lib/auth/auto-lock', () => ({ withAutoLockSuspended: (fn: () => unknown) => fn() }));
vi.mock('@/lib/db/operations', () => ({ updateProfile: vi.fn() }));
vi.mock('@/store', () => ({ useStore: { getState: () => ({ activeProfile: null }) } }));

import { DISCLAIMER_VERSION, launchRoute } from '@/components/onboarding/launch-route';
import {
  exactAlarmSheet,
  shouldOfferExactAlarm,
  showLateRemindersBanner,
} from '@/lib/notifications/exact-alarm-prompt';

const base = {
  hasCompletedOnboarding: true,
  isAuthenticated: true,
  hasProfile: true,
  disclaimerUpToDate: true,
};

describe('launchRoute', () => {
  it('asks for the current disclaimer version', () => {
    expect(DISCLAIMER_VERSION).toBe('1.1.0');
  });

  it('starts onboarding on a fresh install, whatever else is set', () => {
    expect(launchRoute({ ...base, hasCompletedOnboarding: false, disclaimerUpToDate: false })).toBe(
      'welcome'
    );
  });

  it('opens the lock screen first when locked, even with an outdated disclaimer', () => {
    expect(launchRoute({ ...base, isAuthenticated: false, disclaimerUpToDate: false })).toBe(
      'lock'
    );
    expect(launchRoute({ ...base, hasProfile: false })).toBe('lock');
  });

  it('shows the updated disclaimer after unlocking when it changed', () => {
    expect(launchRoute({ ...base, disclaimerUpToDate: false })).toBe('disclaimerUpdated');
  });

  it('goes to Today when everything is in order', () => {
    expect(launchRoute(base)).toBe('dashboard');
  });
});

describe('exact alarm prompt decisions', () => {
  it('offers the sheet once, only when supported and not allowed', () => {
    expect(shouldOfferExactAlarm({ supported: true, granted: false, alreadyShown: false })).toBe(
      true
    );
    expect(shouldOfferExactAlarm({ supported: true, granted: false, alreadyShown: true })).toBe(
      false
    );
    expect(shouldOfferExactAlarm({ supported: true, granted: true, alreadyShown: false })).toBe(
      false
    );
    expect(shouldOfferExactAlarm({ supported: false, granted: true, alreadyShown: false })).toBe(
      false
    );
  });

  it('shows the late banner only when notifications are allowed (never with "Reminders are off")', () => {
    const exact = { supported: true, granted: false };
    expect(showLateRemindersBanner({ notificationState: 'granted', ...exact })).toBe(true);
    expect(showLateRemindersBanner({ notificationState: 'denied', ...exact })).toBe(false);
    expect(showLateRemindersBanner({ notificationState: 'undetermined', ...exact })).toBe(false);
    expect(showLateRemindersBanner({ notificationState: null, ...exact })).toBe(false);
    expect(
      showLateRemindersBanner({ notificationState: 'granted', supported: true, granted: true })
    ).toBe(false);
    expect(
      showLateRemindersBanner({ notificationState: 'granted', supported: false, granted: true })
    ).toBe(false);
  });

  it('lets other sheets wait until the exact-alarm sheet is gone', async () => {
    await expect(exactAlarmSheet.whenClosed()).resolves.toBeUndefined();
    exactAlarmSheet.setOpen(true);
    let closed = false;
    const waiting = exactAlarmSheet.whenClosed().then(() => {
      closed = true;
    });
    await Promise.resolve();
    expect(closed).toBe(false);
    exactAlarmSheet.setOpen(false);
    await waiting;
    expect(closed).toBe(true);
  });
});
