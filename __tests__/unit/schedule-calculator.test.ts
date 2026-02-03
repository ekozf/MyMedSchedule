import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDosesForDate,
  getAllDosesForDate,
  getNextDose,
  getScheduleDescription,
} from '@/lib/schedule/calculator';
import type { Medication } from '@/types';
import { addDays, startOfDay, setHours, setMinutes } from 'date-fns';

describe('Schedule Calculator', () => {
  const baseMedication: Medication = {
    id: 'med-1',
    profileId: 'profile-1',
    name: 'Test Med',
    dosageAmount: 10,
    dosageUnit: 'mg',
    scheduleType: 'once_daily',
    scheduleConfig: JSON.stringify({ time: '09:00' }),
    inventoryCount: 100,
    isActive: true,
    isPrn: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('Once Daily Schedule', () => {
    it('should generate one dose at the specified time', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'once_daily',
        scheduleConfig: JSON.stringify({ time: '09:00' }),
      };

      const testDate = new Date('2026-02-03T00:00:00');
      const doses = getDosesForDate(med, testDate);

      expect(doses).toHaveLength(1);
      expect(doses[0].time.getHours()).toBe(9);
      expect(doses[0].time.getMinutes()).toBe(0);
      expect(doses[0].dosageAmount).toBe(10);
    });

    it('should work with different times', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleConfig: JSON.stringify({ time: '14:30' }),
      };

      const testDate = new Date('2026-02-03');
      const doses = getDosesForDate(med, testDate);

      expect(doses).toHaveLength(1);
      expect(doses[0].time.getHours()).toBe(14);
      expect(doses[0].time.getMinutes()).toBe(30);
    });
  });

  describe('Multiple Daily Schedule', () => {
    it('should generate multiple doses at specified times', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'multiple_daily',
        scheduleConfig: JSON.stringify({
          times: [
            { time: '08:00' },
            { time: '14:00' },
            { time: '20:00' },
          ],
        }),
      };

      const testDate = new Date('2026-02-03');
      const doses = getDosesForDate(med, testDate);

      expect(doses).toHaveLength(3);
      expect(doses[0].time.getHours()).toBe(8);
      expect(doses[1].time.getHours()).toBe(14);
      expect(doses[2].time.getHours()).toBe(20);
    });

    it('should support variable dosages per time', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'multiple_daily',
        scheduleConfig: JSON.stringify({
          times: [
            { time: '08:00', dosageAmount: 5 },
            { time: '20:00', dosageAmount: 15 },
          ],
        }),
      };

      const testDate = new Date('2026-02-03');
      const doses = getDosesForDate(med, testDate);

      expect(doses).toHaveLength(2);
      expect(doses[0].dosageAmount).toBe(5);
      expect(doses[1].dosageAmount).toBe(15);
    });
  });

  describe('Every X Days Schedule', () => {
    it('should generate dose on correct interval days', () => {
      const startDate = new Date('2026-02-01');
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'every_x_days',
        scheduleConfig: JSON.stringify({
          intervalDays: 3,
          startDate: startDate.toISOString(),
          time: '10:00',
        }),
      };

      // Day 0 (start): should have dose
      let doses = getDosesForDate(med, new Date('2026-02-01'));
      expect(doses).toHaveLength(1);

      // Day 1: no dose
      doses = getDosesForDate(med, new Date('2026-02-02'));
      expect(doses).toHaveLength(0);

      // Day 3: should have dose
      doses = getDosesForDate(med, new Date('2026-02-04'));
      expect(doses).toHaveLength(1);

      // Day 6: should have dose
      doses = getDosesForDate(med, new Date('2026-02-07'));
      expect(doses).toHaveLength(1);
    });

    it('should not generate doses before start date', () => {
      const startDate = new Date('2026-02-05');
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'every_x_days',
        scheduleConfig: JSON.stringify({
          intervalDays: 2,
          startDate: startDate.toISOString(),
          time: '10:00',
        }),
      };

      const doses = getDosesForDate(med, new Date('2026-02-03'));
      expect(doses).toHaveLength(0);
    });

    it('should work with interval of 1 day (daily)', () => {
      const startDate = new Date('2026-02-01');
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'every_x_days',
        scheduleConfig: JSON.stringify({
          intervalDays: 1,
          startDate: startDate.toISOString(),
          time: '10:00',
        }),
      };

      const doses1 = getDosesForDate(med, new Date('2026-02-01'));
      const doses2 = getDosesForDate(med, new Date('2026-02-02'));
      const doses3 = getDosesForDate(med, new Date('2026-02-03'));

      expect(doses1).toHaveLength(1);
      expect(doses2).toHaveLength(1);
      expect(doses3).toHaveLength(1);
    });
  });

  describe('Specific Weekdays Schedule', () => {
    it('should generate doses only on specified weekdays', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'specific_weekdays',
        scheduleConfig: JSON.stringify({
          weekdays: [1, 3, 5], // Monday, Wednesday, Friday
          time: '09:00',
        }),
      };

      // Monday Feb 2, 2026
      let doses = getDosesForDate(med, new Date('2026-02-02'));
      expect(doses).toHaveLength(1);

      // Tuesday Feb 3 (no dose)
      doses = getDosesForDate(med, new Date('2026-02-03'));
      expect(doses).toHaveLength(0);

      // Wednesday Feb 4
      doses = getDosesForDate(med, new Date('2026-02-04'));
      expect(doses).toHaveLength(1);

      // Friday Feb 6
      doses = getDosesForDate(med, new Date('2026-02-06'));
      expect(doses).toHaveLength(1);
    });

    it('should work with weekend days', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'specific_weekdays',
        scheduleConfig: JSON.stringify({
          weekdays: [0, 6], // Sunday, Saturday
          time: '10:00',
        }),
      };

      // Sunday Feb 1, 2026
      let doses = getDosesForDate(med, new Date('2026-02-01'));
      expect(doses).toHaveLength(1);

      // Saturday Feb 7
      doses = getDosesForDate(med, new Date('2026-02-07'));
      expect(doses).toHaveLength(1);

      // Monday Feb 3
      doses = getDosesForDate(med, new Date('2026-02-03'));
      expect(doses).toHaveLength(0);
    });
  });

  describe('Cycle Schedule', () => {
    it('should generate doses during "on" period', () => {
      const cycleStart = new Date('2026-02-01');
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'cycle',
        scheduleConfig: JSON.stringify({
          daysOn: 5,
          daysOff: 2,
          cycleStartDate: cycleStart.toISOString(),
          time: '10:00',
        }),
      };

      // Days 0-4 (on period): should have doses
      for (let i = 0; i < 5; i++) {
        const testDate = addDays(cycleStart, i);
        const doses = getDosesForDate(med, testDate);
        expect(doses).toHaveLength(1);
      }

      // Days 5-6 (off period): should not have doses
      for (let i = 5; i < 7; i++) {
        const testDate = addDays(cycleStart, i);
        const doses = getDosesForDate(med, testDate);
        expect(doses).toHaveLength(0);
      }

      // Day 7 (new cycle starts): should have dose
      const doses = getDosesForDate(med, addDays(cycleStart, 7));
      expect(doses).toHaveLength(1);
    });

    it('should handle 21 days on, 7 days off (birth control pattern)', () => {
      const cycleStart = new Date('2026-02-01');
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'cycle',
        scheduleConfig: JSON.stringify({
          daysOn: 21,
          daysOff: 7,
          cycleStartDate: cycleStart.toISOString(),
          time: '20:00',
        }),
      };

      // Day 0 (start of on period)
      let doses = getDosesForDate(med, cycleStart);
      expect(doses).toHaveLength(1);

      // Day 20 (last day of on period)
      doses = getDosesForDate(med, addDays(cycleStart, 20));
      expect(doses).toHaveLength(1);

      // Day 21 (first day of off period)
      doses = getDosesForDate(med, addDays(cycleStart, 21));
      expect(doses).toHaveLength(0);

      // Day 27 (last day of off period)
      doses = getDosesForDate(med, addDays(cycleStart, 27));
      expect(doses).toHaveLength(0);

      // Day 28 (new cycle starts)
      doses = getDosesForDate(med, addDays(cycleStart, 28));
      expect(doses).toHaveLength(1);
    });

    it('should not generate doses before cycle start date', () => {
      const cycleStart = new Date('2026-02-05');
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'cycle',
        scheduleConfig: JSON.stringify({
          daysOn: 5,
          daysOff: 2,
          cycleStartDate: cycleStart.toISOString(),
          time: '10:00',
        }),
      };

      const doses = getDosesForDate(med, new Date('2026-02-03'));
      expect(doses).toHaveLength(0);
    });

    it('should handle cycle across month boundaries', () => {
      const cycleStart = new Date('2026-01-28'); // End of January
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'cycle',
        scheduleConfig: JSON.stringify({
          daysOn: 5,
          daysOff: 2,
          cycleStartDate: cycleStart.toISOString(),
          time: '10:00',
        }),
      };

      // Jan 28, 29, 30, 31 (on period)
      let doses = getDosesForDate(med, new Date('2026-01-28'));
      expect(doses).toHaveLength(1);
      doses = getDosesForDate(med, new Date('2026-01-31'));
      expect(doses).toHaveLength(1);

      // Feb 1 (still on period, day 4)
      doses = getDosesForDate(med, new Date('2026-02-01'));
      expect(doses).toHaveLength(1);

      // Feb 2, 3 (off period)
      doses = getDosesForDate(med, new Date('2026-02-02'));
      expect(doses).toHaveLength(0);
      doses = getDosesForDate(med, new Date('2026-02-03'));
      expect(doses).toHaveLength(0);

      // Feb 4 (new cycle)
      doses = getDosesForDate(med, new Date('2026-02-04'));
      expect(doses).toHaveLength(1);
    });
  });

  describe('Every X Hours Schedule', () => {
    it('should generate multiple doses throughout the day', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'every_x_hours',
        scheduleConfig: JSON.stringify({
          intervalHours: 8,
          firstDoseTime: '06:00',
        }),
      };

      const testDate = new Date('2026-02-03');
      const doses = getDosesForDate(med, testDate);

      expect(doses).toHaveLength(3);
      expect(doses[0].time.getHours()).toBe(6);
      expect(doses[1].time.getHours()).toBe(14);
      expect(doses[2].time.getHours()).toBe(22);
    });

    it('should handle 4-hour intervals', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'every_x_hours',
        scheduleConfig: JSON.stringify({
          intervalHours: 4,
          firstDoseTime: '08:00',
        }),
      };

      const testDate = new Date('2026-02-03');
      const doses = getDosesForDate(med, testDate);

      // 08:00, 12:00, 16:00, 20:00 (00:00 next day is not included)
      expect(doses).toHaveLength(4);
      expect(doses[0].time.getHours()).toBe(8);
      expect(doses[1].time.getHours()).toBe(12);
      expect(doses[2].time.getHours()).toBe(16);
      expect(doses[3].time.getHours()).toBe(20);
    });

    it('should handle 6-hour intervals starting at midnight', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'every_x_hours',
        scheduleConfig: JSON.stringify({
          intervalHours: 6,
          firstDoseTime: '00:00',
        }),
      };

      const testDate = new Date('2026-02-03');
      const doses = getDosesForDate(med, testDate);

      expect(doses).toHaveLength(4);
      expect(doses[0].time.getHours()).toBe(0);
      expect(doses[1].time.getHours()).toBe(6);
      expect(doses[2].time.getHours()).toBe(12);
      expect(doses[3].time.getHours()).toBe(18);
    });
  });

  describe('PRN Schedule', () => {
    it('should not generate any scheduled doses', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'prn',
        isPrn: true,
        scheduleConfig: JSON.stringify({}),
      };

      const testDate = new Date('2026-02-03');
      const doses = getDosesForDate(med, testDate);

      expect(doses).toHaveLength(0);
    });
  });

  describe('getAllDosesForDate', () => {
    it('should combine doses from multiple medications', () => {
      const med1: Medication = {
        ...baseMedication,
        id: 'med-1',
        name: 'Med 1',
        scheduleType: 'once_daily',
        scheduleConfig: JSON.stringify({ time: '09:00' }),
      };

      const med2: Medication = {
        ...baseMedication,
        id: 'med-2',
        name: 'Med 2',
        scheduleType: 'once_daily',
        scheduleConfig: JSON.stringify({ time: '14:00' }),
      };

      const testDate = new Date('2026-02-03');
      const doses = getAllDosesForDate([med1, med2], testDate);

      expect(doses).toHaveLength(2);
      expect(doses[0].medicationName).toBe('Med 1');
      expect(doses[1].medicationName).toBe('Med 2');
    });

    it('should sort doses by time', () => {
      const med1: Medication = {
        ...baseMedication,
        id: 'med-1',
        scheduleConfig: JSON.stringify({ time: '20:00' }),
      };

      const med2: Medication = {
        ...baseMedication,
        id: 'med-2',
        scheduleConfig: JSON.stringify({ time: '08:00' }),
      };

      const testDate = new Date('2026-02-03');
      const doses = getAllDosesForDate([med1, med2], testDate);

      expect(doses[0].time.getHours()).toBe(8);
      expect(doses[1].time.getHours()).toBe(20);
    });

    it('should exclude inactive medications', () => {
      const med1: Medication = {
        ...baseMedication,
        id: 'med-1',
        isActive: true,
      };

      const med2: Medication = {
        ...baseMedication,
        id: 'med-2',
        isActive: false,
      };

      const testDate = new Date('2026-02-03');
      const doses = getAllDosesForDate([med1, med2], testDate);

      expect(doses).toHaveLength(1);
      expect(doses[0].medicationId).toBe('med-1');
    });
  });

  describe('getNextDose', () => {
    it('should return next dose after current time', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'multiple_daily',
        scheduleConfig: JSON.stringify({
          times: [
            { time: '08:00' },
            { time: '14:00' },
            { time: '20:00' },
          ],
        }),
      };

      const currentTime = new Date('2026-02-03T10:00:00');
      const nextDose = getNextDose(med, currentTime);

      expect(nextDose).not.toBeNull();
      expect(nextDose!.time.getHours()).toBe(14);
    });

    it('should return next day dose if all today doses are past', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'once_daily',
        scheduleConfig: JSON.stringify({ time: '09:00' }),
      };

      const currentTime = new Date('2026-02-03T23:00:00');
      const nextDose = getNextDose(med, currentTime);

      expect(nextDose).not.toBeNull();
      expect(nextDose!.time.getHours()).toBe(9);
      expect(nextDose!.time.getDate()).toBe(4); // Next day
    });

    it('should return null for PRN medications', () => {
      const med: Medication = {
        ...baseMedication,
        isPrn: true,
      };

      const nextDose = getNextDose(med);

      expect(nextDose).toBeNull();
    });

    it('should return null for inactive medications', () => {
      const med: Medication = {
        ...baseMedication,
        isActive: false,
      };

      const nextDose = getNextDose(med);

      expect(nextDose).toBeNull();
    });
  });

  describe('getScheduleDescription', () => {
    it('should describe once daily schedule', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'once_daily',
        scheduleConfig: JSON.stringify({ time: '09:00' }),
      };

      const desc = getScheduleDescription(med);
      expect(desc).toBe('Once daily at 09:00');
    });

    it('should describe multiple daily schedule', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'multiple_daily',
        scheduleConfig: JSON.stringify({
          times: [{ time: '08:00' }, { time: '20:00' }],
        }),
      };

      const desc = getScheduleDescription(med);
      expect(desc).toBe('2 times daily');
    });

    it('should describe every X days schedule', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'every_x_days',
        scheduleConfig: JSON.stringify({
          intervalDays: 7,
          startDate: new Date().toISOString(),
          time: '10:00',
        }),
      };

      const desc = getScheduleDescription(med);
      expect(desc).toBe('Every 7 days');
    });

    it('should describe specific weekdays schedule', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'specific_weekdays',
        scheduleConfig: JSON.stringify({
          weekdays: [1, 3, 5],
          time: '09:00',
        }),
      };

      const desc = getScheduleDescription(med);
      expect(desc).toBe('On Mon, Wed, Fri');
    });

    it('should describe cycle schedule', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'cycle',
        scheduleConfig: JSON.stringify({
          daysOn: 21,
          daysOff: 7,
          cycleStartDate: new Date().toISOString(),
          time: '10:00',
        }),
      };

      const desc = getScheduleDescription(med);
      expect(desc).toBe('21 days on, 7 days off');
    });

    it('should describe every X hours schedule', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'every_x_hours',
        scheduleConfig: JSON.stringify({
          intervalHours: 8,
          firstDoseTime: '06:00',
        }),
      };

      const desc = getScheduleDescription(med);
      expect(desc).toBe('Every 8 hours');
    });

    it('should describe PRN schedule', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'prn',
        isPrn: true,
        scheduleConfig: JSON.stringify({}),
      };

      const desc = getScheduleDescription(med);
      expect(desc).toBe('As needed (PRN)');
    });

    it('should describe Xth weekday schedule', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'xth_weekday',
        scheduleConfig: JSON.stringify({
          weekday: 2, // Tuesday
          occurrence: 3, // 3rd
          time: '10:00',
        }),
      };

      const desc = getScheduleDescription(med);
      expect(desc).toBe('3rd Tuesday of month');
    });

    it('should describe tapering schedule', () => {
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'tapering',
        scheduleConfig: JSON.stringify({
          startDose: 4,
          decrementAmount: 1,
          decrementIntervalDays: 7,
          startDate: new Date().toISOString(),
          time: '09:00',
        }),
      };

      const desc = getScheduleDescription(med);
      expect(desc).toContain('Tapering');
      expect(desc).toContain('Start 4');
    });
  });

  describe('Xth Weekday Schedule', () => {
    it('should generate dose on the 1st Monday of the month', () => {
      // February 2026: 1st Monday is Feb 2nd
      const testDate = new Date('2026-02-02T00:00:00');
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'xth_weekday',
        scheduleConfig: JSON.stringify({
          weekday: 1, // Monday
          occurrence: 1, // 1st
          time: '10:00',
        }),
      };

      const doses = getDosesForDate(med, testDate);
      expect(doses).toHaveLength(1);
      expect(doses[0].time.getDate()).toBe(2);
    });

    it('should not generate dose on other Mondays of the month', () => {
      // February 2026: 2nd Monday is Feb 9th
      const testDate = new Date('2026-02-09T00:00:00');
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'xth_weekday',
        scheduleConfig: JSON.stringify({
          weekday: 1, // Monday
          occurrence: 1, // 1st
          time: '10:00',
        }),
      };

      const doses = getDosesForDate(med, testDate);
      expect(doses).toHaveLength(0);
    });

    it('should handle "last" occurrence', () => {
      // February 2026: Last Tuesday is Feb 24th
      const testDate = new Date('2026-02-24T00:00:00');
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'xth_weekday',
        scheduleConfig: JSON.stringify({
          weekday: 2, // Tuesday
          occurrence: 5, // Last
          time: '14:00',
        }),
      };

      const doses = getDosesForDate(med, testDate);
      expect(doses).toHaveLength(1);
    });
  });

  describe('Tapering Schedule', () => {
    it('should generate dose with correct amount on start date', () => {
      const startDate = new Date('2026-02-03T00:00:00');
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'tapering',
        scheduleConfig: JSON.stringify({
          startDose: 4,
          decrementAmount: 1,
          decrementIntervalDays: 7,
          startDate: startDate.toISOString(),
          time: '09:00',
        }),
      };

      const doses = getDosesForDate(med, startDate);
      expect(doses).toHaveLength(1);
      expect(doses[0].dosageAmount).toBe(4);
    });

    it('should decrease dosage after decrement interval', () => {
      const startDate = new Date('2026-02-03T00:00:00');
      const testDate = new Date('2026-02-10T00:00:00'); // 7 days later
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'tapering',
        scheduleConfig: JSON.stringify({
          startDose: 4,
          decrementAmount: 1,
          decrementIntervalDays: 7,
          startDate: startDate.toISOString(),
          time: '09:00',
        }),
      };

      const doses = getDosesForDate(med, testDate);
      expect(doses).toHaveLength(1);
      expect(doses[0].dosageAmount).toBe(3);
    });

    it('should return no doses when tapering reaches zero', () => {
      const startDate = new Date('2026-02-03T00:00:00');
      const testDate = new Date('2026-03-03T00:00:00'); // 28 days later (4 decrements)
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'tapering',
        scheduleConfig: JSON.stringify({
          startDose: 4,
          decrementAmount: 1,
          decrementIntervalDays: 7,
          startDate: startDate.toISOString(),
          time: '09:00',
        }),
      };

      const doses = getDosesForDate(med, testDate);
      expect(doses).toHaveLength(0); // Should be 0 after 4 decrements
    });

    it('should not generate dose before start date', () => {
      const startDate = new Date('2026-02-10T00:00:00');
      const testDate = new Date('2026-02-05T00:00:00'); // Before start
      const med: Medication = {
        ...baseMedication,
        scheduleType: 'tapering',
        scheduleConfig: JSON.stringify({
          startDose: 4,
          decrementAmount: 1,
          decrementIntervalDays: 7,
          startDate: startDate.toISOString(),
          time: '09:00',
        }),
      };

      const doses = getDosesForDate(med, testDate);
      expect(doses).toHaveLength(0);
    });
  });
});
