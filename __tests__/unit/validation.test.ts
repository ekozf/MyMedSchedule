import { describe, it, expect } from 'vitest';
import { validateScheduleConfig } from '@/lib/validation/medication';

describe('Schedule Validation', () => {
  describe('Cycle Schedule Validation', () => {
    it('should validate correct cycle configuration', () => {
      const config = {
        daysOn: 21,
        daysOff: 7,
        cycleStartDate: new Date().toISOString(),
        time: '20:00',
      };

      const result = validateScheduleConfig('cycle', config);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid daysOn (zero)', () => {
      const config = {
        daysOn: 0,
        daysOff: 7,
        cycleStartDate: new Date().toISOString(),
        time: '20:00',
      };

      const result = validateScheduleConfig('cycle', config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be at least 1 day');
    });

    it('should reject invalid daysOn (negative)', () => {
      const config = {
        daysOn: -5,
        daysOff: 7,
        cycleStartDate: new Date().toISOString(),
        time: '20:00',
      };

      const result = validateScheduleConfig('cycle', config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be at least 1 day');
    });

    it('should allow daysOff to be zero', () => {
      const config = {
        daysOn: 21,
        daysOff: 0,
        cycleStartDate: new Date().toISOString(),
        time: '20:00',
      };

      const result = validateScheduleConfig('cycle', config);
      expect(result.success).toBe(true);
    });

    it('should reject negative daysOff', () => {
      const config = {
        daysOn: 21,
        daysOff: -3,
        cycleStartDate: new Date().toISOString(),
        time: '20:00',
      };

      const result = validateScheduleConfig('cycle', config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('0 or more days');
    });

    it('should reject invalid time format (12-hour)', () => {
      const config = {
        daysOn: 21,
        daysOff: 7,
        cycleStartDate: new Date().toISOString(),
        time: '8:00 PM',
      };

      const result = validateScheduleConfig('cycle', config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('24-hour format');
    });

    it('should reject invalid time format (missing minutes)', () => {
      const config = {
        daysOn: 21,
        daysOff: 7,
        cycleStartDate: new Date().toISOString(),
        time: '20',
      };

      const result = validateScheduleConfig('cycle', config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('24-hour format');
    });

    it('should accept valid 24-hour times', () => {
      const times = ['00:00', '08:30', '12:00', '18:45', '23:59'];
      
      times.forEach(time => {
        const config = {
          daysOn: 21,
          daysOff: 7,
          cycleStartDate: new Date().toISOString(),
          time,
        };

        const result = validateScheduleConfig('cycle', config);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Once Daily Validation', () => {
    it('should validate correct configuration', () => {
      const config = { time: '09:00' };
      const result = validateScheduleConfig('once_daily', config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid time format', () => {
      const config = { time: '9:00' };
      const result = validateScheduleConfig('once_daily', config);
      expect(result.success).toBe(false);
    });
  });

  describe('Multiple Daily Validation', () => {
    it('should validate correct configuration', () => {
      const config = {
        times: [
          { time: '08:00' },
          { time: '14:00' },
          { time: '20:00' },
        ],
      };
      const result = validateScheduleConfig('multiple_daily', config);
      expect(result.success).toBe(true);
    });

    it('should require at least one time', () => {
      const config = { times: [] };
      const result = validateScheduleConfig('multiple_daily', config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('at least one scheduled time');
    });

    it('should reject more than 12 times', () => {
      const config = {
        times: Array.from({ length: 13 }, (_, i) => ({
          time: `${String(i).padStart(2, '0')}:00`,
        })),
      };
      const result = validateScheduleConfig('multiple_daily', config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('up to 12 times per day');
    });
  });

  describe('Every X Days Validation', () => {
    it('should validate correct configuration', () => {
      const config = {
        intervalDays: 7,
        startDate: new Date().toISOString(),
        time: '10:00',
      };
      const result = validateScheduleConfig('every_x_days', config);
      expect(result.success).toBe(true);
    });

    it('should reject interval less than 1', () => {
      const config = {
        intervalDays: 0,
        startDate: new Date().toISOString(),
        time: '10:00',
      };
      const result = validateScheduleConfig('every_x_days', config);
      expect(result.success).toBe(false);
    });
  });

  describe('Specific Weekdays Validation', () => {
    it('should validate correct configuration', () => {
      const config = {
        weekdays: [1, 3, 5],
        time: '09:00',
      };
      const result = validateScheduleConfig('specific_weekdays', config);
      expect(result.success).toBe(true);
    });

    it('should require at least one day', () => {
      const config = {
        weekdays: [],
        time: '09:00',
      };
      const result = validateScheduleConfig('specific_weekdays', config);
      expect(result.success).toBe(false);
    });
  });

  describe('Every X Hours Validation', () => {
    it('should validate correct configuration', () => {
      const config = {
        intervalHours: 8,
        firstDoseTime: '06:00',
      };
      const result = validateScheduleConfig('every_x_hours', config);
      expect(result.success).toBe(true);
    });

    it('should reject interval less than 1', () => {
      const config = {
        intervalHours: 0,
        firstDoseTime: '06:00',
      };
      const result = validateScheduleConfig('every_x_hours', config);
      expect(result.success).toBe(false);
    });

    it('should reject interval more than 24', () => {
      const config = {
        intervalHours: 25,
        firstDoseTime: '06:00',
      };
      const result = validateScheduleConfig('every_x_hours', config);
      expect(result.success).toBe(false);
    });
  });

  describe('Xth Weekday Validation', () => {
    it('should validate correct configuration', () => {
      const config = {
        weekday: 2,
        occurrence: 3,
        time: '10:00',
      };
      const result = validateScheduleConfig('xth_weekday', config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid weekday', () => {
      const config = {
        weekday: 7,
        occurrence: 1,
        time: '10:00',
      };
      const result = validateScheduleConfig('xth_weekday', config);
      expect(result.success).toBe(false);
    });

    it('should reject invalid occurrence', () => {
      const config = {
        weekday: 2,
        occurrence: 6,
        time: '10:00',
      };
      const result = validateScheduleConfig('xth_weekday', config);
      expect(result.success).toBe(false);
    });
  });

  describe('Tapering Validation', () => {
    it('should validate correct configuration', () => {
      const config = {
        startDose: 4,
        decrementAmount: 1,
        decrementIntervalDays: 7,
        startDate: new Date().toISOString(),
        time: '09:00',
      };
      const result = validateScheduleConfig('tapering', config);
      expect(result.success).toBe(true);
    });

    it('should reject zero or negative start dose', () => {
      const config = {
        startDose: 0,
        decrementAmount: 1,
        decrementIntervalDays: 7,
        startDate: new Date().toISOString(),
        time: '09:00',
      };
      const result = validateScheduleConfig('tapering', config);
      expect(result.success).toBe(false);
    });

    it('should reject invalid decrement interval', () => {
      const config = {
        startDose: 4,
        decrementAmount: 1,
        decrementIntervalDays: 0,
        startDate: new Date().toISOString(),
        time: '09:00',
      };
      const result = validateScheduleConfig('tapering', config);
      expect(result.success).toBe(false);
    });
  });
});
