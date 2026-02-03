import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  scheduleNotificationsForMedication,
  cancelNotificationForDose,
  cancelNotificationsForMedication,
} from '@/lib/notifications/scheduler';
import * as Notifications from 'expo-notifications';
import type { Medication } from '@/types';

// Mock expo-notifications
const mockScheduledNotifications: any[] = [];

vi.mock('expo-notifications', () => ({
  scheduleNotificationAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(() => Promise.resolve(mockScheduledNotifications)),
  cancelScheduledNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  AndroidNotificationPriority: {
    MAX: 'max',
    HIGH: 'high',
  },
}));

// Mock schedule calculator
vi.mock('@/lib/schedule/calculator', () => ({
  getDosesForDate: vi.fn((med: Medication, date: Date) => {
    // Return empty array if before scheduleStartDate
    if (med.scheduleStartDate) {
      const startDay = new Date(med.scheduleStartDate);
      startDay.setHours(0, 0, 0, 0);
      const targetDay = new Date(date);
      targetDay.setHours(0, 0, 0, 0);
      if (targetDay < startDay) {
        return [];
      }
    }
    
    // Return a dose for once_daily
    if (med.scheduleType === 'once_daily') {
      const config = JSON.parse(med.scheduleConfig);
      const [hours, minutes] = config.time.split(':').map(Number);
      const doseTime = new Date(date);
      doseTime.setHours(hours, minutes, 0, 0);
      const now = new Date();
      // Only return future doses
      if (doseTime > now) {
        return [{
          medicationId: med.id,
          medicationName: med.name,
          time: doseTime,
          dosageAmount: med.dosageAmount,
          dosageUnit: med.dosageUnit,
        }];
      }
    }
    return [];
  }),
  getAllDosesForDate: vi.fn((meds: Medication[], date: Date) => {
    const allDoses: any[] = [];
    for (const med of meds) {
      const doses = require('@/lib/schedule/calculator').getDosesForDate(med, date);
      allDoses.push(...doses);
    }
    return allDoses;
  }),
}));

describe('Notification Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScheduledNotifications.length = 0;
  });

  describe('scheduleNotificationsForMedication', () => {
    it('should not schedule notifications before scheduleStartDate', async () => {
      const med: Medication = {
        id: 'med-1',
        profileId: 'profile-1',
        name: 'Test Med',
        dosageAmount: 10,
        dosageUnit: 'mg',
        scheduleType: 'once_daily',
        scheduleConfig: JSON.stringify({ time: '09:00' }),
        scheduleStartDate: new Date('2026-02-05T00:00:00'),
        isActive: true,
        isPrn: false,
        createdAt: new Date('2026-02-01T00:00:00'),
        updatedAt: new Date('2026-02-01T00:00:00'),
      };

      await scheduleNotificationsForMedication(med);

      // Should not schedule for days before start date
      const calls = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls;
      const beforeStartCalls = calls.filter((call: any) => {
        const triggerDate = new Date(call[0].trigger.date);
        return triggerDate < med.scheduleStartDate!;
      });
      expect(beforeStartCalls.length).toBe(0);
    });

    it('should schedule notification for override time', async () => {
      const overrideTime = new Date('2026-02-03T15:00:00');
      
      const med: Medication = {
        id: 'med-1',
        profileId: 'profile-1',
        name: 'Test Med',
        dosageAmount: 10,
        dosageUnit: 'mg',
        scheduleType: 'once_daily',
        scheduleConfig: JSON.stringify({ time: '09:00' }),
        scheduleStartDate: new Date('2026-02-01T00:00:00'),
        nextDoseOverrideTime: overrideTime,
        isActive: true,
        isPrn: false,
        createdAt: new Date('2026-02-01T00:00:00'),
        updatedAt: new Date('2026-02-01T00:00:00'),
      };

      // Mock getDosesForDate to return empty (override will be added separately)
      const { getDosesForDate } = await import('@/lib/schedule/calculator');
      vi.mocked(getDosesForDate).mockReturnValue([]);

      await scheduleNotificationsForMedication(med);

      const calls = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls;
      const overrideCall = calls.find((call: any) => {
        const triggerDate = new Date(call[0].trigger.date);
        return Math.abs(triggerDate.getTime() - overrideTime.getTime()) < 60000;
      });
      expect(overrideCall).toBeDefined();
    });
  });

  describe('cancelNotificationForDose', () => {
    it('should cancel only matching notification', async () => {
      const medId = 'med-1';
      const scheduledTime = '2026-02-03T09:00:00Z';
      
      mockScheduledNotifications.push(
        {
          identifier: 'notif-1',
          content: {
            data: {
              medicationId: medId,
              scheduledTime: scheduledTime,
            },
          },
        },
        {
          identifier: 'notif-2',
          content: {
            data: {
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
      mockScheduledNotifications.length = 0;

      await cancelNotificationForDose('med-1', '2026-02-03T09:00:00Z');

      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('cancelNotificationsForMedication', () => {
    it('should cancel all notifications for a medication', async () => {
      const medId = 'med-1';
      
      mockScheduledNotifications.push(
        {
          identifier: 'notif-1',
          content: {
            data: {
              medicationId: medId,
            },
          },
        },
        {
          identifier: 'notif-2',
          content: {
            data: {
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
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-2');
      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('notif-3');
    });
  });
});
