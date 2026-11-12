/**
 * PIN attempt limiter, shared by the lock screen and the "confirm current PIN" step of app-lock
 * settings. After MAX_ATTEMPTS wrong PINs, entry pauses: 30 s the first time, then 1 min, then
 * 5 min for every further lock-out, until a correct PIN resets everything.
 *
 * The counters live in memory (so the API stays synchronous) and are mirrored to SecureStore, so
 * killing the app doesn't reset them. `hydratePinGuard()` reads them back at start (the root layout
 * calls it; `useCooldownSeconds` calls it too, and it only runs once). A clock moved backwards
 * can't stretch a cool-down beyond its own length.
 *
 * @example
 * const seconds = useCooldownSeconds();
 * if (!(await verifyPIN(pin))) registerPinFailure();
 */
import * as React from 'react';
import * as SecureStore from 'expo-secure-store';

export const MAX_ATTEMPTS = 5;
/** First cool-down. Later ones escalate, see COOLDOWN_STEPS_MS. */
export const COOLDOWN_MS = 30_000;
/** Cool-down after the 1st, 2nd and 3rd+ lock-out in a row. */
export const COOLDOWN_STEPS_MS = [COOLDOWN_MS, 60_000, 5 * 60_000] as const;
/** How long a wrong entry stays on screen (red, shaken dots) before it clears. */
export const PIN_ERROR_FLASH_MS = 600;

/** SecureStore keys (also wiped by lib/data/wipe.ts). */
export const PIN_GUARD_KEYS = {
  failures: 'pin_guard_failures',
  lockedUntil: 'pin_guard_locked_until',
  lockouts: 'pin_guard_lockouts',
} as const;

let failures = 0;
let lockedUntil = 0;
let lockouts = 0;
let listeners: (() => void)[] = [];
let hydration: Promise<void> | null = null;

const notify = () => listeners.forEach((l) => l());

export function cooldownForLockout(lockoutNumber: number): number {
  const i = Math.min(Math.max(lockoutNumber, 1), COOLDOWN_STEPS_MS.length) - 1;
  return COOLDOWN_STEPS_MS[i];
}

function persist() {
  const writes: [string, string][] = [
    [PIN_GUARD_KEYS.failures, String(failures)],
    [PIN_GUARD_KEYS.lockedUntil, String(lockedUntil)],
    [PIN_GUARD_KEYS.lockouts, String(lockouts)],
  ];
  Promise.all(writes.map(([k, v]) => SecureStore.setItemAsync(k, v))).catch((error) =>
    console.warn('Could not save the PIN attempt counter:', error)
  );
}

function readInt(raw: string | null | undefined): number {
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Loads the saved counters (once). Safe to call many times. */
export function hydratePinGuard(now: () => number = Date.now): Promise<void> {
  if (hydration) return hydration;
  hydration = (async () => {
    try {
      const [f, u, l] = await Promise.all([
        SecureStore.getItemAsync(PIN_GUARD_KEYS.failures),
        SecureStore.getItemAsync(PIN_GUARD_KEYS.lockedUntil),
        SecureStore.getItemAsync(PIN_GUARD_KEYS.lockouts),
      ]);
      const savedLockouts = readInt(l);
      let savedUntil = readInt(u);
      const t = now();
      // Clock moved back (or tampered value): never wait longer than the cool-down itself.
      const maxWait = cooldownForLockout(Math.max(savedLockouts, 1));
      if (savedUntil - t > maxWait) savedUntil = t + maxWait;
      // Merge with anything recorded before hydration finished.
      failures = Math.max(failures, readInt(f));
      lockouts = Math.max(lockouts, savedLockouts);
      lockedUntil = Math.max(lockedUntil, savedUntil);
      notify();
    } catch (error) {
      console.warn('Could not read the PIN attempt counter:', error);
    }
  })();
  return hydration;
}

/** Records a wrong PIN. Returns true when this failure started a cool-down. */
export function registerPinFailure(now: number = Date.now()): boolean {
  failures += 1;
  if (failures >= MAX_ATTEMPTS) {
    failures = 0;
    lockouts += 1;
    lockedUntil = now + cooldownForLockout(lockouts);
    persist();
    notify();
    return true;
  }
  persist();
  return false;
}

export function registerPinSuccess() {
  failures = 0;
  lockedUntil = 0;
  lockouts = 0;
  persist();
  notify();
}

/** Seconds left in the current cool-down (0 when none). */
export function cooldownSecondsLeft(now: number = Date.now()): number {
  return Math.max(0, Math.ceil((lockedUntil - now) / 1000));
}

/** Forgets all counters in memory (after "Delete all data"; storage is wiped separately). */
export function resetPinGuardMemory() {
  failures = 0;
  lockedUntil = 0;
  lockouts = 0;
  hydration = null;
  notify();
}

/** Live countdown of the cool-down, ticking once a second while active. */
export function useCooldownSeconds(): number {
  const [seconds, setSeconds] = React.useState(() => cooldownSecondsLeft());

  React.useEffect(() => {
    const update = () => setSeconds(cooldownSecondsLeft());
    listeners.push(update);
    hydratePinGuard().then(update);
    return () => {
      listeners = listeners.filter((l) => l !== update);
    };
  }, []);

  React.useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds(cooldownSecondsLeft()), 1000);
    return () => clearInterval(id);
  }, [seconds > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  return seconds;
}
