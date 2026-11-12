import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as SecureStore from 'expo-secure-store';

const mockDb = { execSync: vi.fn(), getAllSync: vi.fn(() => []), closeSync: vi.fn() };
vi.mock('expo-sqlite', () => ({
  openDatabaseSync: vi.fn(() => mockDb),
  deleteDatabaseSync: vi.fn(),
  defaultDatabaseDirectory: '/data/app/files/SQLite',
}));
vi.mock('drizzle-orm/expo-sqlite', () => ({ drizzle: vi.fn(() => ({})) }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('database key', () => {
  it('new installs get 32 random bytes as 64 hex chars', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    const { initDatabase, generateDatabaseKey } = await import('@/lib/db/index');
    await initDatabase();
    const [name, key] = vi.mocked(SecureStore.setItemAsync).mock.calls[0];
    expect(name).toBe('db_encryption_key');
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(mockDb.execSync).toHaveBeenCalledWith(`PRAGMA key = '${key}';`);
    expect(generateDatabaseKey()).not.toBe(generateDatabaseKey());
  });

  it('keeps an existing key untouched', async () => {
    const existing = 'ab'.repeat(32);
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue(existing);
    const { initDatabase } = await import('@/lib/db/index');
    await initDatabase();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(mockDb.execSync).toHaveBeenCalledWith(`PRAGMA key = '${existing}';`);
  });

  it('never lets a quote break out of PRAGMA key', async () => {
    const { pragmaKeyStatement, isValidDatabaseKey } = await import('@/lib/db/index');
    expect(pragmaKeyStatement(`x'; DROP TABLE profiles; --`)).toBe(
      `PRAGMA key = 'x''; DROP TABLE profiles; --';`
    );
    expect(isValidDatabaseKey('ab'.repeat(32))).toBe(true);
    expect(isValidDatabaseKey("ab'")).toBe(false);
    expect(isValidDatabaseKey(null)).toBe(false);
  });

  it('concurrent initDatabase calls open the database once', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue('ab'.repeat(32));
    const SQLite = await import('expo-sqlite');
    const { initDatabase } = await import('@/lib/db/index');
    await Promise.all([initDatabase(), initDatabase()]);
    expect(SQLite.openDatabaseSync).toHaveBeenCalledTimes(1);
  });

  it('closeDatabase closes the handle and getDatabase throws until re-init', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue('ab'.repeat(32));
    const { initDatabase, closeDatabase, getDatabase } = await import('@/lib/db/index');
    await initDatabase();
    closeDatabase();
    expect(mockDb.closeSync).toHaveBeenCalled();
    expect(() => getDatabase()).toThrow('Database not initialized');
    await initDatabase();
    expect(() => getDatabase()).not.toThrow();
  });
});
