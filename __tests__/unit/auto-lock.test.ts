import { describe, it, expect, vi } from 'vitest';

vi.mock('@react-navigation/native', () => ({ CommonActions: { reset: vi.fn((x) => x) } }));
vi.mock('@/store', () => ({ useStore: { getState: vi.fn() } }));

import {
  AUTO_LOCK_AFTER_MS,
  SUSPENDED_AUTO_LOCK_AFTER_MS,
  shouldAutoLock,
  withAutoLockSuspended,
} from '@/lib/auth/auto-lock';

const base = {
  backgroundedAt: 0,
  now: AUTO_LOCK_AFTER_MS,
  suspended: false,
  isAuthenticated: true,
  hasCompletedOnboarding: true,
  authMethod: 'pin',
};

describe('shouldAutoLock', () => {
  it('locks after a minute in the background with a PIN or biometric lock', () => {
    expect(shouldAutoLock(base)).toBe(true);
    expect(shouldAutoLock({ ...base, authMethod: 'biometric' })).toBe(true);
  });

  it('does not lock for shorter trips', () => {
    expect(shouldAutoLock({ ...base, now: AUTO_LOCK_AFTER_MS - 1 })).toBe(false);
  });

  it('never locks without a lock, before onboarding, or when already locked', () => {
    expect(shouldAutoLock({ ...base, authMethod: 'none' })).toBe(false);
    expect(shouldAutoLock({ ...base, hasCompletedOnboarding: false })).toBe(false);
    expect(shouldAutoLock({ ...base, isAuthenticated: false })).toBe(false);
    expect(shouldAutoLock({ ...base, backgroundedAt: null })).toBe(false);
  });

  it('allows longer system-UI excursions while suspended', () => {
    expect(shouldAutoLock({ ...base, suspended: true, now: 5 * 60_000 })).toBe(false);
    expect(shouldAutoLock({ ...base, suspended: true, now: SUSPENDED_AUTO_LOCK_AFTER_MS })).toBe(
      true
    );
  });

  it('withAutoLockSuspended passes the result through', async () => {
    await expect(withAutoLockSuspended(async () => 42)).resolves.toBe(42);
    await expect(
      withAutoLockSuspended(async () => {
        throw new Error('x');
      })
    ).rejects.toThrow('x');
  });
});
