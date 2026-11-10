import { describe, it, expect } from 'vitest';
import { addDays, startOfDay } from 'date-fns';
import {
  COMMON_CHOICES,
  OTHER_CHOICES,
  SCHEDULE_TYPES,
  choiceFor,
  createEmptyForm,
  dayToIso,
  schedulesEqual,
  skipDefaults,
  storedSchedule,
  toCreateInput,
  toUpdateInput,
  typeForChoice,
  validateStep,
  type MedicineForm,
} from '@/components/editor/form-model';
import { nextCycleBreak, taperingPlan } from '@/components/editor/schedule/plan';

const today = startOfDay(new Date(2026, 10, 9)); // Mon 9 Nov 2026

function taper(
  patch: Partial<{ startDose: number; decrementAmount: number; decrementIntervalDays: number }>
): MedicineForm {
  return {
    ...createEmptyForm(today),
    scheduleType: 'tapering',
    scheduleConfig: {
      startDose: 1,
      decrementAmount: 0.5,
      decrementIntervalDays: 7,
      startDate: dayToIso(today),
      time: '08:00',
      ...patch,
    },
  };
}

describe('How often? choices', () => {
  it('shows every day, certain days and as needed first, the other five behind a button', () => {
    expect(COMMON_CHOICES).toEqual(['daily', 'specific_weekdays', 'prn']);
    expect(OTHER_CHOICES).toEqual([
      'every_x_days',
      'xth_weekday',
      'cycle',
      'every_x_hours',
      'tapering',
    ]);
    const covered = new Set([...COMMON_CHOICES, ...OTHER_CHOICES]);
    for (const type of SCHEDULE_TYPES) expect(covered.has(choiceFor(type))).toBe(true);
  });

  it('"Every day" stands for both daily types', () => {
    expect(choiceFor('once_daily')).toBe('daily');
    expect(choiceFor('multiple_daily')).toBe('daily');
    expect(choiceFor('cycle')).toBe('cycle');
    expect(typeForChoice('daily', 'multiple_daily')).toBe('multiple_daily');
    expect(typeForChoice('daily', 'once_daily')).toBe('once_daily');
    expect(typeForChoice('daily', 'prn')).toBe('once_daily');
    expect(typeForChoice('tapering', 'once_daily')).toBe('tapering');
  });
});

describe('storedSchedule', () => {
  const daily = (times: { time: string; dosageAmount?: number }[]): MedicineForm => ({
    ...createEmptyForm(today),
    scheduleType: 'multiple_daily',
    scheduleConfig: { times },
  });

  it('stores one time as once_daily and more as multiple_daily', () => {
    expect(storedSchedule('multiple_daily', { times: [{ time: '09:00' }] })).toEqual({
      scheduleType: 'once_daily',
      scheduleConfig: { time: '09:00' },
    });
    expect(
      storedSchedule('multiple_daily', { times: [{ time: '20:00' }, { time: '08:00' }] })
    ).toEqual({
      scheduleType: 'multiple_daily',
      scheduleConfig: { times: [{ time: '08:00' }, { time: '20:00' }] },
    });
    expect(storedSchedule('once_daily', { time: '07:30' }).scheduleType).toBe('once_daily');
  });

  it('maps on save (add and edit)', () => {
    const one = daily([{ time: '09:00', dosageAmount: 2 }]);
    const created = toCreateInput(one, 'p1');
    expect(created.scheduleType).toBe('once_daily');
    expect(created.scheduleConfig).toEqual({ time: '09:00' });

    const initial: MedicineForm = {
      ...createEmptyForm(today),
      scheduleType: 'once_daily',
      scheduleConfig: { time: '08:00' },
    };
    const updated = toUpdateInput(daily([{ time: '10:00' }]), initial);
    expect(updated.scheduleType).toBe('once_daily');
    expect(updated.scheduleConfig).toEqual({ time: '10:00' });
  });

  it('a one-time multiple_daily equals the same once_daily (no needless schedule reset)', () => {
    const initial: MedicineForm = {
      ...createEmptyForm(today),
      scheduleType: 'once_daily',
      scheduleConfig: { time: '08:00' },
    };
    expect(schedulesEqual(daily([{ time: '08:00' }]), initial)).toBe(true);
    expect(toUpdateInput(daily([{ time: '08:00' }]), initial).scheduleType).toBeUndefined();
  });
});

describe('skipDefaults', () => {
  it('resets supply to 0 with no pack size or refill reminder, which is valid', () => {
    const form: MedicineForm = {
      ...createEmptyForm(today),
      inventoryCount: 30,
      packageSize: 60,
      refillReminderType: 'doses',
      refillReminderValue: 0, // invalid on purpose: skipping must still move on
    };
    const next = { ...form, ...skipDefaults('supply') };
    expect(next.inventoryCount).toBe(0);
    expect(next.packageSize).toBeNull();
    expect(next.refillReminderType).toBe('none');
    expect(validateStep('supply', next).ok).toBe(true);
  });

  it('clears the extras', () => {
    const form: MedicineForm = {
      ...createEmptyForm(today),
      notes: 'with food',
      maxDailyDose: 4,
      minHoursBetweenDoses: 4,
      bypassDnd: true,
      expirationDate: today,
    };
    const next = { ...form, ...skipDefaults('extras') };
    expect(next).toMatchObject({
      notes: '',
      maxDailyDose: null,
      minHoursBetweenDoses: null,
      bypassDnd: false,
      expirationDate: null,
    });
  });
});

describe('taperingPlan', () => {
  it('lists the dates the amount changes and the last dose day (from the calculator)', () => {
    const plan = taperingPlan(taper({}));
    expect(plan.steps.map((s) => s.dose)).toEqual([1, 0.5]);
    expect(plan.steps.map((s) => s.date.getTime())).toEqual([
      today.getTime(),
      addDays(today, 7).getTime(),
    ]);
    expect(plan.lastDay?.getTime()).toBe(addDays(today, 13).getTime());
    expect(plan.more).toBe(0);
  });

  it('shows three steps and counts the rest', () => {
    const plan = taperingPlan(
      taper({ startDose: 5, decrementAmount: 1, decrementIntervalDays: 2 })
    );
    expect(plan.steps.map((s) => s.dose)).toEqual([5, 4, 3]);
    expect(plan.more).toBe(2);
    expect(plan.lastDay?.getTime()).toBe(addDays(today, 9).getTime());
  });

  it('is empty for other schedule types', () => {
    expect(taperingPlan(createEmptyForm(today)).steps).toEqual([]);
  });
});

describe('nextCycleBreak', () => {
  const cycle = (start: Date, daysOn = 21, daysOff = 7) => ({
    daysOn,
    daysOff,
    cycleStartDate: dayToIso(start),
    time: '08:00',
  });

  it('gives the first break for a cycle that starts today', () => {
    const b = nextCycleBreak(cycle(today), today)!;
    expect(b.start.getTime()).toBe(addDays(today, 21).getTime());
    expect(b.end.getTime()).toBe(addDays(today, 27).getTime());
    expect(b.ongoing).toBe(false);
  });

  it('says a break is on now, and moves to the next cycle after it', () => {
    const start = addDays(today, -23);
    expect(nextCycleBreak(cycle(start), today)!.ongoing).toBe(true);
    const later = nextCycleBreak(cycle(addDays(today, -30)), today)!;
    expect(later.start.getTime()).toBe(addDays(today, 19).getTime());
  });

  it('is null without days off', () => {
    expect(nextCycleBreak(cycle(today, 21, 0), today)).toBeNull();
  });
});
