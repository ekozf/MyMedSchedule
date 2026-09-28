/**
 * In-memory PIN attempt limiter (gap fix: the old lock screen allowed unlimited guesses).
 * After MAX_ATTEMPTS wrong PINs, entry pauses for COOLDOWN_MS. Module-level so re-mounting the
 * lock screen (e.g. on a language change) doesn't reset it; shared by the lock screen and the
 * "confirm current PIN" step of app-lock settings. Resets when the app process restarts.
 *
 * @example
 * const seconds = useCooldownSeconds();
 * if (!(await verifyPIN(pin))) registerPinFailure();
 */
import * as React from 'react';

export const MAX_ATTEMPTS = 5;
export const COOLDOWN_MS = 30_000;

let failures = 0;
let lockedUntil = 0;
let listeners: (() => void)[] = [];

const notify = () => listeners.forEach((l) => l());

/** Records a wrong PIN. Returns true when this failure started a cool-down. */
export function registerPinFailure(now: number = Date.now()): boolean {
  failures += 1;
  if (failures >= MAX_ATTEMPTS) {
    failures = 0;
    lockedUntil = now + COOLDOWN_MS;
    notify();
    return true;
  }
  return false;
}

export function registerPinSuccess() {
  failures = 0;
  lockedUntil = 0;
  notify();
}

/** Seconds left in the current cool-down (0 when none). */
export function cooldownSecondsLeft(now: number = Date.now()): number {
  return Math.max(0, Math.ceil((lockedUntil - now) / 1000));
}

/** Live countdown of the cool-down, ticking once a second while active. */
export function useCooldownSeconds(): number {
  const [seconds, setSeconds] = React.useState(() => cooldownSecondsLeft());

  React.useEffect(() => {
    const update = () => setSeconds(cooldownSecondsLeft());
    listeners.push(update);
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
