import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initDatabase, getDatabase } from '@/lib/db/index';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';

// Mock expo-sqlite
const mockDb = {
  execSync: vi.fn(),
  prepareSync: vi.fn(() => ({
    allSync: vi.fn(() => []),
  })),
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
      const mockPrepare = vi.fn(() => ({
        allSync: vi.fn(() => [
          { name: 'id' },
          { name: 'name' },
          // schedule_start_date and next_dose_override_time not present
        ]),
      })) as any;
      mockDb.prepareSync = mockPrepare;

      const { initDatabase } = await import('@/lib/db/index');
      await initDatabase();

      const alterCalls = mockDb.execSync.mock.calls.filter(
        (call: any) => call[0] && call[0].includes('ALTER TABLE medications ADD COLUMN')
      );
      expect(alterCalls.length).toBeGreaterThan(0);
    });

    it('should not add columns if they already exist', async () => {
      const mockPrepare = vi.fn(() => ({
        allSync: vi.fn(() => [
          { name: 'id' },
          { name: 'schedule_start_date' },
          { name: 'next_dose_override_time' },
        ]),
      })) as any;
      mockDb.prepareSync = mockPrepare;

      const { initDatabase } = await import('@/lib/db/index');
      await initDatabase();

      const alterCalls = mockDb.execSync.mock.calls.filter(
        (call: any) =>
          call[0] && call[0].includes('ALTER TABLE medications ADD COLUMN schedule_start_date')
      );
      expect(alterCalls.length).toBe(0);
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
