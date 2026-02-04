import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Medication } from '@/types';

const hoisted = vi.hoisted(() => ({
  scheduledNotifications: [] as any[],
}));

// Mock expo-localization (used by i18n inside scheduler)
vi.mock('expo-localization', () => ({
  getLocales: vi.fn(() => [{ languageCode: 'en' }]),
}));

// Mock expo-notifications (scheduler depends on it)
vi.mock('expo-notifications', () => ({
  scheduleNotificationAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(async () => hoisted.scheduledNotifications),
  cancelScheduledNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  AndroidNotificationPriority: {
    MAX: 'max',
    HIGH: 'high',
  },
}));

// Mock DB operations used by ensureNext3...
vi.mock('@/lib/db/operations', () => ({
  getMedicationById: vi.fn(),
}));

// Mock schedule calculator
vi.mock('@/lib/schedule/calculator', () => ({
  getNextDose: vi.fn((med: Medication, afterTime: Date) => {
    // Base schedule: hourly doses starting at 11:00 on 2026-02-03
    const baseTimes = [
      new Date('2026-02-03T11:00:00.000Z'),
      new Date('2026-02-03T12:00:00.000Z'),
      new Date('2026-02-03T13:00:00.000Z'),
      new Date('2026-02-03T14:00:00.000Z'),
      new Date('2026-02-03T15:00:00.000Z'),
    ];

    if (med.isPrn || !med.isActive) return null;

    // Mimic current getNextDose behavior: if override is in the future, it becomes the next dose
    if (med.nextDoseOverrideTime) {
      const override = new Date(med.nextDoseOverrideTime as any);
      if (override.getTime() > afterTime.getTime()) {
        return {
          medicationId: med.id,
          medicationName: med.name,
          time: override,
          dosageAmount: med.dosageAmount,
          dosageUnit: med.dosageUnit,
          isPrn: false,
        };
      }
    }

    const next = baseTimes.find(t => t.getTime() > afterTime.getTime());
    if (!next) return null;

    return {
      medicationId: med.id,
      medicationName: med.name,
      time: next,
      dosageAmount: med.dosageAmount,
      dosageUnit: med.dosageUnit,
      isPrn: false,
    };
  }),
}));

describe('Notification Scheduler', () => {
  let scheduleNotificationsForMedication: typeof import('@/lib/notifications/scheduler').scheduleNotificationsForMedication;
  let cancelNotificationForDose: typeof import('@/lib/notifications/scheduler').cancelNotificationForDose;
  let cancelNotificationsForMedication: typeof import('@/lib/notifications/scheduler').cancelNotificationsForMedication;
  let ensureNext3DoseNotificationsForMedication: typeof import('@/lib/notifications/scheduler').ensureNext3DoseNotificationsForMedication;
  let Notifications: typeof import('expo-notifications');

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.scheduledNotifications.length = 0;
    vi.useRealTimers();
  });

  beforeEach(async () => {
    const scheduler = await import('@/lib/notifications/scheduler');
    scheduleNotificationsForMedication = scheduler.scheduleNotificationsForMedication;
    cancelNotificationForDose = scheduler.cancelNotificationForDose;
    cancelNotificationsForMedication = scheduler.cancelNotificationsForMedication;
    ensureNext3DoseNotificationsForMedication = scheduler.ensureNext3DoseNotificationsForMedication;

    Notifications = await import('expo-notifications');
  });

  describe('scheduleNotificationsForMedication', () => {
    it('should schedule only the next 3 dose notifications', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-03T10:00:00'));

      const med: Medication = {
        id: 'med-1',
        profileId: 'profile-1',
        name: 'Test Med',
        dosageAmount: 10,
        dosageUnit: 'mg',
        scheduleType: 'once_daily',
        scheduleConfig: JSON.stringify({ time: '09:00' }),
        scheduleStartDate: new Date('2026-02-01T00:00:00'),
        isActive: true,
        isPrn: false,
        createdAt: new Date('2026-02-01T00:00:00'),
        updatedAt: new Date('2026-02-01T00:00:00'),
      };

      await scheduleNotificationsForMedication(med);

      const calls = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls;
      expect(calls.length).toBe(3);

      const triggerTimes = calls.map((c: any) => new Date(c[0].trigger.date).toISOString()).sort();
      expect(triggerTimes).toEqual([
        new Date('2026-02-03T11:00:00.000Z').toISOString(),
        new Date('2026-02-03T12:00:00.000Z').toISOString(),
        new Date('2026-02-03T13:00:00.000Z').toISOString(),
      ]);
    });

    it('should schedule override as next dose and skip the original next occurrence', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-03T10:00:00Z'));

      // Override earlier than the base next (11:00), but base next should be removed.
      const overrideTime = new Date('2026-02-03T10:30:00Z');

      const med: Medication = {
        id: 'med-1',
        profileId: 'profile-1',
        name: 'Test Med',
        dosageAmount: 10,
        dosageUnit: 'mg',
        scheduleType: 'once_daily',
        scheduleConfig: JSON.stringify({ time: '09:00' }),
        scheduleStartDate: new Date('2026-02-01T00:00:00Z'),
        nextDoseOverrideTime: overrideTime,
        isActive: true,
        isPrn: false,
        createdAt: new Date('2026-02-01T00:00:00Z'),
        updatedAt: new Date('2026-02-01T00:00:00Z'),
      };

      await scheduleNotificationsForMedication(med);

      const calls = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls;
      expect(calls.length).toBe(3);

      const triggerTimes = calls.map((c: any) => new Date(c[0].trigger.date).toISOString()).sort();
      expect(triggerTimes).toEqual([
        new Date('2026-02-03T10:30:00.000Z').toISOString(),
        new Date('2026-02-03T12:00:00.000Z').toISOString(),
        new Date('2026-02-03T13:00:00.000Z').toISOString(),
      ]);
    });
  });

  describe('cancelNotificationForDose', () => {
    it('should cancel only matching notification', async () => {
      const medId = 'med-1';
      const scheduledTime = '2026-02-03T09:00:00Z';
      
      hoisted.scheduledNotifications.push(
        {
          identifier: 'notif-1',
          content: {
            data: {
              kind: 'dose',
              medicationId: medId,
              scheduledTime: scheduledTime,
            },
          },
        },
        {
          identifier: 'notif-2',
          content: {
            data: {
              kind: 'dose',
              medicationId: medId,
              scheduledTime: '2026-02-03T10:00:00Z',
            },
          },
        },
        {
          identifier: 'notif-3',
          content: {
            data: {
              medicationId: 'med-2',
              scheduledTime: scheduledTime,
            },
          },
        }
      );

      await cancelNotificationForDose(medId, scheduledTime);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('notif-2');
      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('notif-3');
    });

    it('should handle no matching notifications gracefully', async () => {
      hoisted.scheduledNotifications.length = 0;

      await cancelNotificationForDose('med-1', '2026-02-03T09:00:00Z');

      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('cancelNotificationsForMedication', () => {
    it('should cancel only dose notifications for a medication', async () => {
      const medId = 'med-1';
      
      hoisted.scheduledNotifications.push(
        {
          identifier: 'notif-1',
          content: {
            data: {
              kind: 'dose',
              medicationId: medId,
            },
          },
        },
        {
          identifier: 'notif-2',
          content: {
            data: {
              kind: 'refill',
              medicationId: medId,
            },
          },
        },
        {
          identifier: 'notif-3',
          content: {
            data: {
              medicationId: 'med-2',
            },
          },
        }
      );

      await cancelNotificationsForMedication(medId);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('notif-2');
      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('notif-3');
    });
  });

  describe('ensureNext3DoseNotificationsForMedication', () => {
    it('should schedule missing dose notifications to reach 3 (excluding snoozes)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-03T10:00:00Z'));

      const { getMedicationById } = await import('@/lib/db/operations');
      vi.mocked(getMedicationById).mockResolvedValue({
        id: 'med-1',
        profileId: 'profile-1',
        name: 'Test Med',
        dosageAmount: 10,
        dosageUnit: 'mg',
        scheduleType: 'once_daily',
        scheduleConfig: JSON.stringify({ time: '09:00' }),
        scheduleStartDate: new Date('2026-02-01T00:00:00Z'),
        isActive: true,
        isPrn: false,
        createdAt: new Date('2026-02-01T00:00:00Z'),
        updatedAt: new Date('2026-02-01T00:00:00Z'),
      } as any);

      // One future dose already scheduled, plus a snooze (should not count)
      hoisted.scheduledNotifications.push(
        {
          identifier: 'dose-1',
          content: {
            data: {
              kind: 'dose',
              medicationId: 'med-1',
              scheduledTime: '2026-02-03T11:00:00.000Z',
            },
          },
          trigger: { date: '2026-02-03T11:00:00.000Z' },
        },
        {
          identifier: 'snooze-1',
          content: {
            data: {
              kind: 'snooze',
              medicationId: 'med-1',
              scheduledTime: '2026-02-03T10:15:00.000Z',
            },
          },
          trigger: { date: '2026-02-03T10:15:00.000Z' },
        }
      );

      await ensureNext3DoseNotificationsForMedication('med-1');

      // Should schedule 2 more dose notifications (12:00 and 13:00)
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
      const calls = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls;
      const triggerTimes = calls.map((c: any) => new Date(c[0].trigger.date).toISOString()).sort();
      expect(triggerTimes).toEqual([
        new Date('2026-02-03T12:00:00.000Z').toISOString(),
        new Date('2026-02-03T13:00:00.000Z').toISOString(),
      ]);
    });
  });
});
