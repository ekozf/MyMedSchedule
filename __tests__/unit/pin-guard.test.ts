import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as SecureStore from 'expo-secure-store';

const store = new Map<string, string>();

async function freshGuard() {
  vi.resetModules();
  return import('@/components/onboarding/pin-guard');
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  store.clear();
  vi.mocked(SecureStore.getItemAsync).mockImplementation(async (k: string) => store.get(k) ?? null);
  vi.mocked(SecureStore.setItemAsync).mockImplementation(async (k: string, v: string) => {
    store.set(k, v);
  });
  vi.mocked(SecureStore.deleteItemAsync).mockImplementation(async (k: string) => {
    store.delete(k);
  });
});

describe('pin-guard', () => {
  it('locks for 30 s after 5 wrong PINs, then escalates to 1 min and 5 min', async () => {
    const g = await freshGuard();
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) expect(g.registerPinFailure(t0)).toBe(false);
    expect(g.registerPinFailure(t0)).toBe(true);
    expect(g.cooldownSecondsLeft(t0)).toBe(30);

    for (let i = 0; i < 4; i++) g.registerPinFailure(t0 + 31_000);
    expect(g.registerPinFailure(t0 + 31_000)).toBe(true);
    expect(g.cooldownSecondsLeft(t0 + 31_000)).toBe(60);

    for (let i = 0; i < 5; i++) g.registerPinFailure(t0 + 100_000);
    expect(g.cooldownSecondsLeft(t0 + 100_000)).toBe(300);
    for (let i = 0; i < 5; i++) g.registerPinFailure(t0 + 500_000);
    expect(g.cooldownSecondsLeft(t0 + 500_000)).toBe(300); // stays at 5 min
  });

  it('a correct PIN resets counters and escalation', async () => {
    const g = await freshGuard();
    for (let i = 0; i < 5; i++) g.registerPinFailure(0);
    g.registerPinSuccess();
    expect(g.cooldownSecondsLeft(0)).toBe(0);
    for (let i = 0; i < 5; i++) g.registerPinFailure(1000);
    expect(g.cooldownSecondsLeft(1000)).toBe(30);
  });

  it('survives an app restart (persisted in SecureStore)', async () => {
    const now = Date.now();
    let g = await freshGuard();
    for (let i = 0; i < 3; i++) g.registerPinFailure(now);
    await flush();
    expect(store.get('pin_guard_failures')).toBe('3');

    g = await freshGuard(); // "restart"
    await g.hydratePinGuard(() => now);
    expect(g.registerPinFailure(now)).toBe(false); // 4th
    expect(g.registerPinFailure(now)).toBe(true); // 5th → locked
    await flush();

    g = await freshGuard();
    expect(g.cooldownSecondsLeft(now)).toBe(0); // not hydrated yet
    await g.hydratePinGuard(() => now);
    expect(g.cooldownSecondsLeft(now)).toBe(30);
  });

  it('a clock moved backwards cannot stretch the cool-down', async () => {
    store.set('pin_guard_locked_until', String(10_000_000));
    store.set('pin_guard_lockouts', '1');
    const g = await freshGuard();
    await g.hydratePinGuard(() => 0);
    expect(g.cooldownSecondsLeft(0)).toBe(30);
  });

  it('resetPinGuardMemory clears the in-memory state', async () => {
    const g = await freshGuard();
    for (let i = 0; i < 5; i++) g.registerPinFailure(0);
    g.resetPinGuardMemory();
    expect(g.cooldownSecondsLeft(0)).toBe(0);
  });

  it('cooldownForLockout', async () => {
    const g = await freshGuard();
    expect(g.cooldownForLockout(1)).toBe(30_000);
    expect(g.cooldownForLockout(2)).toBe(60_000);
    expect(g.cooldownForLockout(3)).toBe(300_000);
    expect(g.cooldownForLockout(9)).toBe(300_000);
  });
});
