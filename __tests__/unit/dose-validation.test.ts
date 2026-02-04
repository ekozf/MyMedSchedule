import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  validateMaxDailyDose,
  validateMinHoursBetweenDoses,
  validateDose,
} from '@/lib/validation/dose-validation';
import type { Medication, IntakeLog } from '@/types';
import * as dbOperations from '@/lib/db/operations';
import { subHours, subMinutes } from 'date-fns';

// Mock the db operations
vi.mock('@/lib/db/operations', () => ({
  getIntakeLogsByMedication: vi.fn(),
}));

describe('Dose Validation', () => {
  const mockMedication: Medication = {
    id: 'med-1',
    profileId: 'profile-1',
    name: 'Test Med',
    dosageAmount: 10,
    dosageUnit: 'milligrams',
    scheduleType: 'once_daily',
    scheduleConfig: '{}',
    inventoryCount: 100,
    maxDailyDose: 40,
    minHoursBetweenDoses: 4,
    bypassDnd: false,
    isActive: true,
    isPrn: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateMaxDailyDose', () => {
    it('should return valid when no max daily dose is set', async () => {
      const medWithNoMax: Medication = { ...mockMedication, maxDailyDose: undefined };
      const result = await validateMaxDailyDose(medWithNoMax, 10);

      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should return valid when dose does not exceed limit', async () => {
      const now = new Date();
      const logs: IntakeLog[] = [
        {
          id: 'log-1',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 2),
          scheduledTime: subHours(now, 2),
          action: 'taken',
          dosageAmount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'log-2',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 6),
          scheduledTime: subHours(now, 6),
          action: 'taken',
          dosageAmount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(dbOperations.getIntakeLogsByMedication).mockResolvedValue(logs);

      const result = await validateMaxDailyDose(mockMedication, 10, now);

      expect(result.isValid).toBe(true);
      expect(result.details?.currentDailyTotal).toBe(20);
      expect(result.details?.newTotal).toBe(30);
      expect(result.details?.maxAllowed).toBe(40);
    });

    it('should return invalid when dose would exceed limit', async () => {
      const now = new Date();
      const logs: IntakeLog[] = [
        {
          id: 'log-1',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 2),
          scheduledTime: subHours(now, 2),
          action: 'taken',
          dosageAmount: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'log-2',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 6),
          scheduledTime: subHours(now, 6),
          action: 'taken',
          dosageAmount: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(dbOperations.getIntakeLogsByMedication).mockResolvedValue(logs);

      const result = await validateMaxDailyDose(mockMedication, 15, now);

      expect(result.isValid).toBe(false);
      expect(result.warningType).toBe('max_daily_dose');
      expect(result.details?.currentDailyTotal).toBe(30);
      expect(result.details?.newTotal).toBe(45);
      expect(result.details?.maxAllowed).toBe(40);
    });

    it('should only count doses in the rolling 24-hour window', async () => {
      const now = new Date();
      const logs: IntakeLog[] = [
        {
          id: 'log-1',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 2),
          scheduledTime: subHours(now, 2),
          action: 'taken',
          dosageAmount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'log-2',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 25), // Outside 24-hour window
          scheduledTime: subHours(now, 25),
          action: 'taken',
          dosageAmount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(dbOperations.getIntakeLogsByMedication).mockResolvedValue(logs);

      const result = await validateMaxDailyDose(mockMedication, 10, now);

      expect(result.isValid).toBe(true);
      expect(result.details?.currentDailyTotal).toBe(10); // Only counts the recent dose
      expect(result.details?.newTotal).toBe(20);
    });

    it('should not count skipped doses', async () => {
      const now = new Date();
      const logs: IntakeLog[] = [
        {
          id: 'log-1',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 2),
          scheduledTime: subHours(now, 2),
          action: 'taken',
          dosageAmount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'log-2',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 6),
          scheduledTime: subHours(now, 6),
          action: 'skipped',
          dosageAmount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(dbOperations.getIntakeLogsByMedication).mockResolvedValue(logs);

      const result = await validateMaxDailyDose(mockMedication, 10, now);

      expect(result.isValid).toBe(true);
      expect(result.details?.currentDailyTotal).toBe(10); // Only counts taken dose
    });

    it('should count partial doses', async () => {
      const now = new Date();
      const logs: IntakeLog[] = [
        {
          id: 'log-1',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 2),
          scheduledTime: subHours(now, 2),
          action: 'partial',
          dosageAmount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(dbOperations.getIntakeLogsByMedication).mockResolvedValue(logs);

      const result = await validateMaxDailyDose(mockMedication, 10, now);

      expect(result.isValid).toBe(true);
      expect(result.details?.currentDailyTotal).toBe(5);
      expect(result.details?.newTotal).toBe(15);
    });
  });

  describe('validateMinHoursBetweenDoses', () => {
    it('should return valid when no minimum hours is set', async () => {
      const medWithNoMin: Medication = { ...mockMedication, minHoursBetweenDoses: undefined };
      const result = await validateMinHoursBetweenDoses(medWithNoMin);

      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should return valid when no previous doses exist', async () => {
      vi.mocked(dbOperations.getIntakeLogsByMedication).mockResolvedValue([]);

      const result = await validateMinHoursBetweenDoses(mockMedication);

      expect(result.isValid).toBe(true);
    });

    it('should return valid when enough time has passed', async () => {
      const now = new Date();
      const logs: IntakeLog[] = [
        {
          id: 'log-1',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 5), // 5 hours ago, min is 4
          scheduledTime: subHours(now, 5),
          action: 'taken',
          dosageAmount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(dbOperations.getIntakeLogsByMedication).mockResolvedValue(logs);

      const result = await validateMinHoursBetweenDoses(mockMedication, now);

      expect(result.isValid).toBe(true);
      expect(result.details?.hoursSinceLastDose).toBeGreaterThanOrEqual(4);
    });

    it('should return invalid when not enough time has passed', async () => {
      const now = new Date();
      const logs: IntakeLog[] = [
        {
          id: 'log-1',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 2), // 2 hours ago, min is 4
          scheduledTime: subHours(now, 2),
          action: 'taken',
          dosageAmount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(dbOperations.getIntakeLogsByMedication).mockResolvedValue(logs);

      const result = await validateMinHoursBetweenDoses(mockMedication, now);

      expect(result.isValid).toBe(false);
      expect(result.warningType).toBe('min_hours_between');
      expect(result.details?.hoursSinceLastDose).toBeLessThan(4);
      expect(result.details?.minHoursRequired).toBe(4);
    });

    it('should only consider taken and partial doses', async () => {
      const now = new Date();
      const logs: IntakeLog[] = [
        {
          id: 'log-1',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 1), // 1 hour ago, but skipped
          scheduledTime: subHours(now, 1),
          action: 'skipped',
          dosageAmount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'log-2',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 5), // 5 hours ago, taken
          scheduledTime: subHours(now, 5),
          action: 'taken',
          dosageAmount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(dbOperations.getIntakeLogsByMedication).mockResolvedValue(logs);

      const result = await validateMinHoursBetweenDoses(mockMedication, now);

      expect(result.isValid).toBe(true);
      // Should check against the 5-hour-old taken dose, not the 1-hour-old skipped dose
    });
  });

  describe('validateDose', () => {
    it('should combine both validations', async () => {
      const now = new Date();
      const logs: IntakeLog[] = [
        {
          id: 'log-1',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 5),
          scheduledTime: subHours(now, 5),
          action: 'taken',
          dosageAmount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(dbOperations.getIntakeLogsByMedication).mockResolvedValue(logs);

      const result = await validateDose(mockMedication, 10, now);

      expect(result.maxDailyDoseValidation.isValid).toBe(true);
      expect(result.minHoursValidation.isValid).toBe(true);
      expect(result.hasWarnings).toBe(false);
    });

    it('should detect multiple violations', async () => {
      const now = new Date();
      const logs: IntakeLog[] = [
        {
          id: 'log-1',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 2), // Too recent (min 4 hours)
          scheduledTime: subHours(now, 2),
          action: 'taken',
          dosageAmount: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'log-2',
          medicationId: 'med-1',
          profileId: 'profile-1',
          actualTime: subHours(now, 8),
          scheduledTime: subHours(now, 8),
          action: 'taken',
          dosageAmount: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(dbOperations.getIntakeLogsByMedication).mockResolvedValue(logs);

      const result = await validateDose(mockMedication, 20, now);

      expect(result.maxDailyDoseValidation.isValid).toBe(false); // 40 + 20 = 60 > 40
      expect(result.minHoursValidation.isValid).toBe(false); // 2 hours < 4 hours
      expect(result.hasWarnings).toBe(true);
    });
  });
});
