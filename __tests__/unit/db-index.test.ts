import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initDatabase, getDatabase } from '@/lib/db/index';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';

// Mock expo-sqlite
const mockDb = {
  execSync: vi.fn(),
  getAllSync: vi.fn((): { name: string }[] => []),
};

vi.mock('expo-sqlite', () => ({
  openDatabaseSync: vi.fn(() => mockDb),
}));

// Mock expo-secure-store
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

// Mock drizzle
vi.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: vi.fn(() => ({})),
}));

describe('Database Index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue('test-key');
  });

  describe('initDatabase', () => {
    beforeEach(() => {
      // Reset module state
      vi.resetModules();
      vi.clearAllMocks();
    });

    it('should create tables if they do not exist', async () => {
      const { initDatabase } = await import('@/lib/db/index');
      await initDatabase();

      expect(mockDb.execSync).toHaveBeenCalled();
      const createTableCall = mockDb.execSync.mock.calls.find(
        (call: any) => call[0] && call[0].includes('CREATE TABLE IF NOT EXISTS medications')
      );
      expect(createTableCall).toBeDefined();
    });

    it('should add migration columns if they do not exist', async () => {
      const mockGetAll = vi.fn(() => [
        { name: 'id' },
        { name: 'name' },
        // schedule_start_date and next_dose_override_time not present
      ]);
      mockDb.getAllSync = mockGetAll;

      const { initDatabase } = await import('@/lib/db/index');
      await initDatabase();

      const alterCalls = mockDb.execSync.mock.calls.filter(
        (call: any) => call[0] && call[0].includes('ALTER TABLE medications ADD COLUMN')
      );
      expect(alterCalls.length).toBeGreaterThan(0);
    });

    it('should not add columns if they already exist', async () => {
      const mockGetAll = vi.fn(() => [
        { name: 'id' },
        { name: 'schedule_start_date' },
        { name: 'next_dose_override_time' },
      ]);
      mockDb.getAllSync = mockGetAll;

      const { initDatabase } = await import('@/lib/db/index');
      await initDatabase();

      const alterCalls = mockDb.execSync.mock.calls.filter(
        (call: any) =>
          call[0] && call[0].includes('ALTER TABLE medications ADD COLUMN schedule_start_date')
      );
      expect(alterCalls.length).toBe(0);
    });

    it('adds strength and track_supply (tracked by default) to older databases', async () => {
      mockDb.getAllSync = vi.fn(() => [
        { name: 'id' },
        { name: 'schedule_start_date' },
        { name: 'next_dose_override_time' },
      ]);

      const { initDatabase } = await import('@/lib/db/index');
      await initDatabase();

      const sql = mockDb.execSync.mock.calls.map((call: any) => call[0]);
      expect(sql).toContain('ALTER TABLE medications ADD COLUMN strength TEXT');
      expect(sql).toContain('ALTER TABLE medications ADD COLUMN track_supply INTEGER DEFAULT 1');
      expect(sql).toContain(
        'ALTER TABLE medications ADD COLUMN schedule_start_exact INTEGER DEFAULT 0'
      );
    });

    it('does not add strength or track_supply twice', async () => {
      mockDb.getAllSync = vi.fn((sql?: string) =>
        sql?.includes('inventory_adjustments')
          ? [{ name: 'id' }, { name: 'reason' }]
          : [
              { name: 'id' },
              { name: 'schedule_start_date' },
              { name: 'schedule_start_exact' },
              { name: 'next_dose_override_time' },
              { name: 'strength' },
              { name: 'track_supply' },
            ]
      ) as any;

      const { initDatabase } = await import('@/lib/db/index');
      await initDatabase();

      const alterCalls = mockDb.execSync.mock.calls.filter(
        (call: any) => typeof call[0] === 'string' && call[0].startsWith('ALTER TABLE')
      );
      expect(alterCalls.length).toBe(0);
    });

    it('creates the supply history table with a reason column', async () => {
      const { initDatabase } = await import('@/lib/db/index');
      await initDatabase();
      const create = mockDb.execSync.mock.calls.find(
        (call: any) =>
          typeof call[0] === 'string' &&
          call[0].includes('CREATE TABLE IF NOT EXISTS inventory_adjustments')
      );
      expect(create).toBeDefined();
      expect(create![0]).toMatch(/reason TEXT/);
    });

    it('adds the reason column to an older supply history table', async () => {
      mockDb.getAllSync = vi.fn((sql?: string) =>
        sql?.includes('inventory_adjustments')
          ? [{ name: 'id' }, { name: 'new_count' }]
          : [
              { name: 'id' },
              { name: 'schedule_start_date' },
              { name: 'schedule_start_exact' },
              { name: 'next_dose_override_time' },
              { name: 'strength' },
              { name: 'track_supply' },
            ]
      ) as any;
      const { initDatabase } = await import('@/lib/db/index');
      await initDatabase();
      const alterCalls = mockDb.execSync.mock.calls
        .map((call: any) => call[0])
        .filter((q: unknown) => typeof q === 'string' && q.startsWith('ALTER TABLE'));
      expect(alterCalls).toEqual(['ALTER TABLE inventory_adjustments ADD COLUMN reason TEXT']);
    });

    it('should generate encryption key if not exists', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);

      const { initDatabase } = await import('@/lib/db/index');
      await initDatabase();

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'db_encryption_key',
        expect.any(String)
      );
    });

    it('should use existing encryption key', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('existing-key');

      const { initDatabase } = await import('@/lib/db/index');
      await initDatabase();

      const pragmaCall = mockDb.execSync.mock.calls.find(
        (call: any) => call[0] && call[0].includes("PRAGMA key = 'existing-key'")
      );
      expect(pragmaCall).toBeDefined();
    });
  });

  describe('getDatabase', () => {
    it('should throw error if database not initialized', async () => {
      // Import fresh module
      vi.resetModules();
      const { getDatabase } = await import('@/lib/db/index');

      expect(() => getDatabase()).toThrow('Database not initialized');
    });
  });
});
