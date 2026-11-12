import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as fs from '../helpers/fake-file-system';

vi.mock('expo-file-system', async () => (await import('../helpers/fake-file-system')).module);
vi.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: vi.fn(),
  dismissAllNotificationsAsync: vi.fn(),
}));
vi.mock('@/lib/notifications/handlers', () => ({ takePendingTodayFocus: vi.fn() }));
const db = vi.hoisted(() => ({
  closeDatabase: vi.fn(),
  deleteDatabaseFiles: vi.fn(),
  initDatabase: vi.fn(async () => ({})),
}));
vi.mock('@/lib/db', () => ({ ...db, DB_KEY_NAME: 'db_encryption_key' }));
vi.mock('@/lib/db/operations', () => ({}));

import { APP_SECURE_STORE_KEYS, deleteAllData } from '@/lib/data/wipe';
import { useStore } from '@/store';
import { cooldownSecondsLeft, registerPinFailure } from '@/components/onboarding/pin-guard';

const secure = new Map<string, string>();

beforeEach(() => {
  vi.clearAllMocks();
  fs.reset();
  secure.clear();
  vi.mocked(SecureStore.setItemAsync).mockImplementation(async (k: string, v: string) => {
    secure.set(k, v);
  });
  vi.mocked(SecureStore.deleteItemAsync).mockImplementation(async (k: string) => {
    secure.delete(k);
  });
  db.initDatabase.mockImplementation(async () => ({}));
});

describe('deleteAllData', () => {
  it('lists every SecureStore key the app writes', () => {
    expect([...APP_SECURE_STORE_KEYS].sort()).toEqual(
      [
        'auth_method',
        'db_encryption_key',
        'onboarding_completed',
        'pin_guard_failures',
        'pin_guard_locked_until',
        'pin_guard_lockouts',
        'user_language',
        'user_pin',
        'user_pin_hash',
        'user_pin_length',
      ].sort()
    );
  });

  it('removes reminders, database, photos, reports, keys and in-memory state, then reopens a fresh DB', async () => {
    for (const k of APP_SECURE_STORE_KEYS) secure.set(k, 'x');
    secure.set('unrelated', 'kept');
    fs.dirs.add('file:///data/app/files/photos/');
    fs.files.add('file:///data/app/files/photos/a.jpg');
    fs.files.add('file:///data/app/files/MyMedSchedule_Anna_2026.pdf');
    fs.files.add('file:///data/app/files/keep.txt');
    fs.dirs.add('file:///data/app/cache/Print/');
    fs.files.add('file:///data/app/cache/Print/r.pdf');
    useStore.setState({ hasCompletedOnboarding: true, isAuthenticated: true, profiles: [{} as any] });
    for (let i = 0; i < 5; i++) registerPinFailure();

    const result = await deleteAllData();

    expect(result).toEqual({ ok: true, databaseReady: true, errors: [] });
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(Notifications.dismissAllNotificationsAsync).toHaveBeenCalled();
    expect(db.deleteDatabaseFiles).toHaveBeenCalled();
    expect(db.initDatabase).toHaveBeenCalled();
    expect([...secure.keys()]).toEqual(['unrelated']);
    expect([...fs.files]).toEqual(['file:///data/app/files/keep.txt']);
    const s = useStore.getState();
    expect(s.hasCompletedOnboarding).toBe(false);
    expect(s.isAuthenticated).toBe(false);
    expect(s.isLoadingAppState).toBe(false);
    expect(s.profiles).toEqual([]);
    expect(cooldownSecondsLeft()).toBe(0);
  });

  it('keeps going when a step fails and reports it', async () => {
    vi.mocked(Notifications.cancelAllScheduledNotificationsAsync).mockRejectedValueOnce(new Error('x'));
    db.initDatabase.mockRejectedValue(new Error('not a database'));
    const result = await deleteAllData();
    expect(result.ok).toBe(false);
    expect(result.databaseReady).toBe(false);
    expect(result.errors).toEqual(['cancelNotifications', 'initDatabase']);
    expect(db.initDatabase).toHaveBeenCalledTimes(2); // retried after deleting the file again
  });
});
