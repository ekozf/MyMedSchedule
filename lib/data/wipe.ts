/**
 * "Delete all data": puts the app back to a fresh install, without restarting it.
 *
 * What it removes:
 * - every scheduled reminder, and reminders already showing in the notification shade;
 * - the encrypted database (file + -wal/-shm/-journal) and its key;
 * - all medicine / profile photos (`<documents>/photos`), saved PDF reports in the documents
 *   folder, and the image-picker / print leftovers in the cache;
 * - every SecureStore entry the app writes (`APP_SECURE_STORE_KEYS`): PIN hash (and any legacy
 *   plaintext PIN), PIN length, lock method, PIN attempt counters, DB key, onboarding flag,
 *   language choice;
 * - in-memory state: the zustand store, the PIN attempt limiter, a pending "open this dose" focus.
 *
 * Afterwards it opens a new, empty database (with a new random key), so onboarding can create a
 * profile straight away. The caller then only has to navigate:
 *
 * @example
 * const r = await confirmIdentity({ promptMessage });      // lib/auth — PIN: ask in the UI
 * if (r !== 'confirmed') return;
 * const result = await deleteAllData();
 * router.replace('/(onboarding)/welcome');
 * if (!result.ok) showToast(...);                          // some files could not be removed
 *
 * Notes:
 * - Background tasks (reminder buttons, next-3 upkeep) stay registered: with no data they do
 *   nothing, and they are needed again once the person sets the app up anew.
 * - The language shown keeps working for this session; the saved choice is removed, so the next
 *   start follows the phone's language until one is picked on Welcome again.
 * - `result.ok` is false when something could not be removed or the new database could not be
 *   opened (`result.databaseReady`); data that stays behind in the old database file is still
 *   unreadable, because its key has been deleted. If `databaseReady` is false, ask the person to
 *   close and reopen the app.
 */
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Directory, File, Paths } from 'expo-file-system';
import { closeDatabase, deleteDatabaseFiles, initDatabase, DB_KEY_NAME } from '@/lib/db';
import { deleteAllPhotos } from '@/lib/media/photos';
import {
  AUTH_METHOD_KEY,
  LEGACY_PIN_KEY,
  PIN_HASH_KEY,
  PIN_LENGTH_KEY,
} from '@/lib/auth';
import { PIN_GUARD_KEYS, resetPinGuardMemory } from '@/components/onboarding/pin-guard';
import { ONBOARDING_COMPLETED_KEY, useStore } from '@/store';

/** Language choice key (written by lib/i18n). */
const LANGUAGE_KEY = 'user_language';

/** Every SecureStore key the app writes. Keep in sync when adding one. */
export const APP_SECURE_STORE_KEYS: readonly string[] = [
  PIN_HASH_KEY,
  LEGACY_PIN_KEY,
  PIN_LENGTH_KEY,
  AUTH_METHOD_KEY,
  PIN_GUARD_KEYS.failures,
  PIN_GUARD_KEYS.lockedUntil,
  PIN_GUARD_KEYS.lockouts,
  DB_KEY_NAME,
  ONBOARDING_COMPLETED_KEY,
  LANGUAGE_KEY,
];

export interface DeleteAllDataResult {
  /** Everything was removed and the new database is open. */
  ok: boolean;
  /** The new, empty database is open (onboarding can save a profile). */
  databaseReady: boolean;
  /** Steps that failed (for logs; not for display). */
  errors: string[];
}

async function step(errors: string[], name: string, fn: () => unknown | Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    console.warn(`deleteAllData: ${name} failed:`, error);
    errors.push(name);
  }
}

/** Saved PDF reports (`MyMedSchedule_*.pdf`, iOS saves them in documents first). */
function deleteSavedReports() {
  const docs = Paths.document;
  if (!docs.exists) return;
  for (const entry of docs.list()) {
    if (entry instanceof File && /^MyMedSchedule_.*\.pdf$/i.test(entry.name)) entry.delete();
  }
}

/** Picker / print leftovers in our cache (photos, generated PDFs). */
function deleteCacheLeftovers() {
  const cache = Paths.cache;
  if (!cache.exists) return;
  for (const entry of cache.list()) {
    if (entry instanceof Directory) {
      if (/^(ImagePicker|ImageManipulator|Print)$/i.test(entry.name)) entry.delete();
    } else if (/\.(pdf|jpe?g|png|heic|webp)$/i.test(entry.name)) {
      entry.delete();
    }
  }
}

let wiping: Promise<DeleteAllDataResult> | null = null;

/** See the file comment. Calling it again while it runs returns the same promise. */
export function deleteAllData(): Promise<DeleteAllDataResult> {
  if (!wiping) {
    wiping = runWipe().finally(() => {
      wiping = null;
    });
  }
  return wiping;
}

async function runWipe(): Promise<DeleteAllDataResult> {
  const errors: string[] = [];

  // 1. Reminders: nothing may fire for data that no longer exists.
  await step(errors, 'cancelNotifications', () =>
    Notifications.cancelAllScheduledNotificationsAsync()
  );
  await step(errors, 'dismissNotifications', () => Notifications.dismissAllNotificationsAsync());

  // 2. In-memory state first, so no screen keeps reading the old data.
  useStore.getState().reset();
  resetPinGuardMemory();
  await step(errors, 'clearTodayFocus', async () => {
    const { takePendingTodayFocus } = await import('@/lib/notifications/handlers');
    takePendingTodayFocus();
  });

  // 3. Database file(s), then files.
  await step(errors, 'deleteDatabase', () => deleteDatabaseFiles());
  await step(errors, 'deletePhotos', () => deleteAllPhotos());
  await step(errors, 'deleteReports', () => deleteSavedReports());
  await step(errors, 'deleteCache', () => deleteCacheLeftovers());

  // 4. Keys and flags (the DB key last-but-not-least: without it any leftover file is unreadable).
  for (const key of APP_SECURE_STORE_KEYS) {
    await step(errors, `secureStore:${key}`, () => SecureStore.deleteItemAsync(key));
  }

  // 5. A fresh, empty database with a new key, ready for onboarding.
  let databaseReady = false;
  for (let attempt = 0; attempt < 2 && !databaseReady; attempt++) {
    try {
      closeDatabase();
      // A leftover old file can't be opened with the new key: remove it and try once more.
      if (attempt > 0) deleteDatabaseFiles();
      await initDatabase();
      databaseReady = true;
    } catch (error) {
      console.error('deleteAllData: could not open a new database:', error);
    }
  }
  if (!databaseReady) errors.push('initDatabase');

  return { ok: errors.length === 0, databaseReady, errors };
}
