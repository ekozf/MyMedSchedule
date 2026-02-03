import { describe, it, expect } from 'vitest';
import { getDosesForDate } from '@/lib/schedule/calculator';
import type { Medication } from '@/types';

describe('Schedule Calculator - Notes Field', () => {
  const baseCreatedAt = new Date('2026-01-01T00:00:00');
  const baseMedication: Medication = {
    id: 'med-1',
    profileId: 'profile-1',
    name: 'Test Med',
    dosageAmount: 10,
    dosageUnit: 'pills',
    scheduleType: 'once_daily',
    scheduleConfig: JSON.stringify({ time: '09:00' }),
    inventoryCount: 100,
    bypassDnd: false,
    isActive: true,
    isPrn: false,
    createdAt: baseCreatedAt,
    updatedAt: baseCreatedAt,
  };

  it('should include notes in scheduled doses', () => {
    const med: Medication = {
      ...baseMedication,
      notes: 'Take with food',
    };

    const testDate = new Date('2026-02-03T00:00:00');
    const doses = getDosesForDate(med, testDate);

    expect(doses).toHaveLength(1);
    expect(doses[0].notes).toBe('Take with food');
  });

  it('should handle undefined notes', () => {
    const med: Medication = {
      ...baseMedication,
      notes: undefined,
    };

    const testDate = new Date('2026-02-03T00:00:00');
    const doses = getDosesForDate(med, testDate);

    expect(doses).toHaveLength(1);
    expect(doses[0].notes).toBeUndefined();
  });

  it('should include notes for multiple daily doses', () => {
    const med: Medication = {
      ...baseMedication,
      scheduleType: 'multiple_daily',
      scheduleConfig: JSON.stringify({
        times: [
          { time: '08:00' },
          { time: '20:00' },
        ],
      }),
      notes: 'Important instructions',
    };

    const testDate = new Date('2026-02-03');
    const doses = getDosesForDate(med, testDate);

    expect(doses).toHaveLength(2);
    expect(doses[0].notes).toBe('Important instructions');
    expect(doses[1].notes).toBe('Important instructions');
  });

  it('should include notes for cycle schedule', () => {
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
      notes: 'Cycle day info',
    };

    const testDate = new Date('2026-02-01');
    const doses = getDosesForDate(med, testDate);

    expect(doses).toHaveLength(1);
    expect(doses[0].notes).toBe('Cycle day info');
  });

  it('should include notes for every X hours schedule', () => {
    const med: Medication = {
      ...baseMedication,
      scheduleType: 'every_x_hours',
      scheduleConfig: JSON.stringify({
        intervalHours: 8,
        firstDoseTime: '06:00',
      }),
      notes: 'Around the clock',
    };

    const testDate = new Date('2026-02-03');
    const doses = getDosesForDate(med, testDate);

    expect(doses.length).toBeGreaterThan(0);
    doses.forEach(dose => {
      expect(dose.notes).toBe('Around the clock');
    });
  });

  it('should handle long notes', () => {
    const longNote = 'This is a very long note with detailed instructions about how to take this medication including timing, food requirements, and other important information that the user needs to see.';
    
    const med: Medication = {
      ...baseMedication,
      notes: longNote,
    };

    const testDate = new Date('2026-02-03');
    const doses = getDosesForDate(med, testDate);

    expect(doses).toHaveLength(1);
    expect(doses[0].notes).toBe(longNote);
  });

  it('should handle empty string notes', () => {
    const med: Medication = {
      ...baseMedication,
      notes: '',
    };

    const testDate = new Date('2026-02-03');
    const doses = getDosesForDate(med, testDate);

    expect(doses).toHaveLength(1);
    expect(doses[0].notes).toBe('');
  });
});
