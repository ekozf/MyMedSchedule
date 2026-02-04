import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMedication,
  getMedicationById,
  updateMedication,
  setNextDoseOverrideTime,
  clearNextDoseOverrideTime,
  createIntakeLog,
  createIntakeLogAndUpdateInventory,
  InventoryInsufficientError,
} from '@/lib/db/operations';
import { getDatabase } from '@/lib/db/index';
import { medications } from '@/lib/db/schema';
import { startOfDay } from 'date-fns';

// Mock database
const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/lib/db/index', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-123'),
}));

describe('DB Operations - Medications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMedication', () => {
    it('should set scheduleStartDate to now for once_daily', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      mockDb.insert = vi.fn().mockReturnValue({ values: mockInsert });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockDb.select = mockSelect;

      const input = {
        profileId: 'profile-1',
        name: 'Test Med',
        dosageAmount: 10,
        dosageUnit: 'mg',
        scheduleType: 'once_daily',
        scheduleConfig: { time: '09:00' },
      };

      await createMedication(input);

      expect(mockInsert).toHaveBeenCalled();
      const callArgs = mockInsert.mock.calls[0][0];
      expect(callArgs.scheduleStartDate).toBeDefined();
    });

    it('should set scheduleStartDate from config for every_x_days', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      mockDb.insert = vi.fn().mockReturnValue({ values: mockInsert });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockDb.select = mockSelect;

      const startDate = new Date('2026-02-10T00:00:00');
      const input = {
        profileId: 'profile-1',
        name: 'Test Med',
        dosageAmount: 10,
        dosageUnit: 'mg',
        scheduleType: 'every_x_days',
        scheduleConfig: {
          intervalDays: 3,
          startDate: startDate.toISOString(),
          time: '09:00',
        },
      };

      await createMedication(input);

      expect(mockInsert).toHaveBeenCalled();
      const callArgs = mockInsert.mock.calls[0][0];
      expect(callArgs.scheduleStartDate).toBe(startOfDay(startDate).toISOString());
    });
  });

  describe('updateMedication', () => {
    it('should reset scheduleStartDate when schedule changes', async () => {
      const existingMed = {
        id: 'med-1',
        scheduleType: 'once_daily',
        scheduleConfig: JSON.stringify({ time: '09:00' }),
        createdAt: new Date('2026-02-01T00:00:00'),
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingMed]),
          }),
        }),
      });
      mockDb.select = mockSelect;

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      mockDb.update = mockUpdate;

      await updateMedication('med-1', {
        scheduleType: 'multiple_daily',
        scheduleConfig: { times: [{ time: '09:00' }] },
      });

      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      const setCall = mockUpdate().set.mock.calls[0][0];
      expect(setCall.scheduleStartDate).toBeDefined();
      expect(setCall.nextDoseOverrideTime).toBeNull();
    });
  });

  describe('setNextDoseOverrideTime', () => {
    it('should set override time', async () => {
      const overrideTime = new Date('2026-02-03T15:00:00');
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      mockDb.update = mockUpdate;

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'med-1',
                nextDoseOverrideTime: overrideTime.toISOString(),
              },
            ]),
          }),
        }),
      });
      mockDb.select = mockSelect;

      await setNextDoseOverrideTime('med-1', overrideTime);

      expect(mockUpdate).toHaveBeenCalled();
      const setCall = mockUpdate().set.mock.calls[0][0];
      expect(setCall.nextDoseOverrideTime).toBe(overrideTime.toISOString());
    });

    it('should clear override when null is passed', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      mockDb.update = mockUpdate;

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'med-1',
                nextDoseOverrideTime: null,
              },
            ]),
          }),
        }),
      });
      mockDb.select = mockSelect;

      await clearNextDoseOverrideTime('med-1');

      expect(mockUpdate).toHaveBeenCalled();
      const setCall = mockUpdate().set.mock.calls[0][0];
      expect(setCall.nextDoseOverrideTime).toBeNull();
    });
  });

  describe('createIntakeLog', () => {
    it('should clear override when scheduledTime matches override', async () => {
      const overrideTime = new Date('2026-02-03T15:00:00');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      mockDb.insert = vi.fn().mockReturnValue({ values: mockInsert });

      const mockSelect = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: 'med-1',
                  nextDoseOverrideTime: overrideTime.toISOString(),
                },
              ]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        });
      mockDb.select = mockSelect;

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      mockDb.update = mockUpdate;

      await createIntakeLog({
        medicationId: 'med-1',
        profileId: 'profile-1',
        scheduledTime: overrideTime,
        actualTime: new Date(),
        action: 'taken',
        dosageAmount: 10,
      });

      // Should have attempted to clear override
      expect(mockSelect).toHaveBeenCalled();
    });
  });

  describe('createIntakeLogAndUpdateInventory', () => {
    it('should decrement inventory and create log when sufficient', async () => {
      const mockInsertValues = vi.fn().mockResolvedValue(undefined);
      mockDb.insert = vi.fn().mockReturnValue({ values: mockInsertValues });

      const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
      const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
      mockDb.update = vi.fn().mockReturnValue({ set: mockUpdateSet });

      const medRow = {
        id: 'med-1',
        profileId: 'profile-1',
        name: 'Test Med',
        imageUri: null,
        notes: null,
        dosageAmount: 1,
        dosageUnit: 'mg',
        scheduleType: 'prn',
        scheduleConfig: '{}',
        inventoryCount: 10,
        packageSize: null,
        maxDailyDose: null,
        minHoursBetweenDoses: null,
        expirationDate: null,
        refillReminderType: null,
        refillReminderValue: null,
        bypassDnd: false,
        isActive: true,
        isPrn: true,
        scheduleStartDate: null,
        nextDoseOverrideTime: null,
        createdAt: new Date('2026-02-01T00:00:00').toISOString(),
        updatedAt: new Date('2026-02-01T00:00:00').toISOString(),
      };

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([medRow]),
          }),
        }),
      });

      await createIntakeLogAndUpdateInventory({
        medicationId: 'med-1',
        profileId: 'profile-1',
        scheduledTime: undefined,
        actualTime: new Date(),
        action: 'taken',
        dosageAmount: 3,
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ inventoryCount: 7 }));
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockInsertValues).toHaveBeenCalled();
    });

    it('should throw InventoryInsufficientError when inventory is insufficient', async () => {
      mockDb.insert = vi.fn();
      mockDb.update = vi.fn();

      const medRow = {
        id: 'med-1',
        profileId: 'profile-1',
        name: 'Test Med',
        dosageAmount: 1,
        dosageUnit: 'mg',
        scheduleType: 'prn',
        scheduleConfig: '{}',
        inventoryCount: 2,
        bypassDnd: false,
        isActive: true,
        isPrn: true,
        createdAt: new Date('2026-02-01T00:00:00').toISOString(),
        updatedAt: new Date('2026-02-01T00:00:00').toISOString(),
      };

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([medRow]),
          }),
        }),
      });

      await expect(
        createIntakeLogAndUpdateInventory({
          medicationId: 'med-1',
          profileId: 'profile-1',
          scheduledTime: undefined,
          actualTime: new Date(),
          action: 'taken',
          dosageAmount: 3,
        })
      ).rejects.toBeInstanceOf(InventoryInsufficientError);

      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });
});
