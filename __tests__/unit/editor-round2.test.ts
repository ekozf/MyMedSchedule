import { describe, it, expect, beforeAll, vi } from 'vitest';

// lib/ui/format pulls in settings that touch the database and the store.
vi.mock('@/lib/db/operations', () => ({ updateProfile: vi.fn() }));
vi.mock('@/store', () => ({ useStore: vi.fn() }));
import i18n from '@/lib/i18n';
import { getDosesForDate, getScheduleStartMoment } from '@/lib/schedule/calculator';
import { extrasSet, unsetExtrasText } from '@/components/editor/describe';
import { firstDoseAfter, firstReminderText } from '@/components/editor/first-reminder';
import {
  COMMON_UNITS,
  DOSAGE_UNITS,
  OTHER_UNITS,
  createEmptyForm,
  stepsFor,
  toUpdateInput,
  type MedicineForm,
} from '@/components/editor/form-model';
import { scheduleStartForEdit } from '@/components/editor/schedule-start';
import type { Medication } from '@/types';

const fmt = (t: string) => t;

function med(overrides: Partial<Medication> = {}): Medication {
  const created = new Date(2026, 10, 9, 13, 0);
  return {
    id: 'm1',
    profileId: 'p1',
    name: 'Metformin',
    dosageAmount: 1,
    dosageUnit: 'pills',
    scheduleType: 'multiple_daily',
    scheduleConfig: JSON.stringify({ times: [{ time: '08:00' }, { time: '20:00' }] }),
    inventoryCount: 12,
    bypassDnd: false,
    isActive: true,
    isPrn: false,
    scheduleStartDate: created,
    createdAt: created,
    updatedAt: created,
    ...overrides,
  } as Medication;
}

function form(overrides: Partial<MedicineForm> = {}): MedicineForm {
  return { ...createEmptyForm(new Date(2026, 10, 9, 13, 0)), name: 'Metformin', ...overrides };
}

beforeAll(() => {
  i18n.locale = 'en';
});

describe('a new schedule starts when the medicine is added', () => {
  it('skips times earlier on the day it was added', () => {
    const doses = getDosesForDate(med(), new Date(2026, 10, 9));
    expect(doses.map((d) => d.time.getHours())).toEqual([20]);
  });

  it('keeps every time on the following days', () => {
    const doses = getDosesForDate(med(), new Date(2026, 10, 10));
    expect(doses.map((d) => d.time.getHours())).toEqual([8, 20]);
  });

  it('does not hide doses after a later schedule change (start differs from created)', () => {
    const m = med({
      createdAt: new Date(2026, 10, 1, 9, 0),
      scheduleStartDate: new Date(2026, 10, 9, 13, 0),
    });
    expect(getScheduleStartMoment(m)).toBeNull();
    expect(getDosesForDate(m, new Date(2026, 10, 9))).toHaveLength(2);
  });

  it('changes nothing for a start date at midnight', () => {
    const m = med({
      createdAt: new Date(2026, 10, 9),
      scheduleStartDate: new Date(2026, 10, 9),
    });
    expect(getDosesForDate(m, new Date(2026, 10, 9))).toHaveLength(2);
  });
});

describe('a schedule edited later', () => {
  const edited = new Date(2026, 10, 9, 16, 10);

  it('starts at the edit moment when flagged exact', () => {
    const m = med({
      createdAt: new Date(2026, 10, 9, 16, 3),
      updatedAt: edited,
      scheduleStartDate: edited,
      scheduleStartExact: true,
    });
    expect(getScheduleStartMoment(m)).toEqual(edited);
    expect(getDosesForDate(m, new Date(2026, 10, 9)).map((d) => d.time.getHours())).toEqual([20]);
    expect(getDosesForDate(m, new Date(2026, 10, 10))).toHaveLength(2);
  });

  it('stays at the start of the day when not flagged', () => {
    const m = med({
      createdAt: new Date(2026, 10, 9, 16, 3),
      scheduleStartDate: edited,
      scheduleStartExact: false,
    });
    expect(getDosesForDate(m, new Date(2026, 10, 9))).toHaveLength(2);
  });
});

describe('where an edited schedule starts', () => {
  const now = new Date(2026, 10, 9, 16, 10);
  const times = (...t: string[]) =>
    form({
      scheduleType: 'multiple_daily',
      scheduleConfig: { times: t.map((time) => ({ time })) },
    });
  const initial = times('08:00', '12:00');

  it('starts now when the times change', () => {
    expect(scheduleStartForEdit(times('08:00', '20:00'), initial, [], now)).toBe('now');
  });

  it('starts now when the type changes', () => {
    const daily = form({ scheduleType: 'once_daily', scheduleConfig: { time: '21:00' } });
    expect(scheduleStartForEdit(daily, initial, [], now)).toBe('now');
  });

  it('keeps the start of today when a passed time today is logged', () => {
    const logs = [{ scheduledTime: new Date(2026, 10, 9, 8, 0) }];
    expect(scheduleStartForEdit(times('08:00', '20:00'), initial, logs, now)).toBeUndefined();
  });

  it('ignores logs from other days or for times no longer scheduled', () => {
    const logs = [
      { scheduledTime: new Date(2026, 10, 8, 8, 0) },
      { scheduledTime: new Date(2026, 10, 9, 12, 0) },
      { scheduledTime: undefined },
    ];
    expect(scheduleStartForEdit(times('08:00', '20:00'), initial, logs, now)).toBe('now');
  });

  it('changes nothing when the schedule is the same', () => {
    expect(scheduleStartForEdit(times('08:00', '12:00'), initial, [], now)).toBeUndefined();
    const renamed = { ...initial, name: 'Other', dosageAmount: 2 };
    expect(toUpdateInput(renamed, initial).scheduleStart).toBeUndefined();
    expect(toUpdateInput(renamed, initial).scheduleType).toBeUndefined();
  });

  it('keeps the start when only a per-time amount changes', () => {
    const amounts = form({
      scheduleType: 'multiple_daily',
      scheduleConfig: { times: [{ time: '08:00', dosageAmount: 2 }, { time: '12:00' }] },
    });
    expect(scheduleStartForEdit(amounts, initial, [], now)).toBe('keep');
    expect(toUpdateInput(amounts, initial).scheduleStart).toBe('keep');
  });
});

describe('first reminder', () => {
  const now = new Date(2026, 10, 9, 13, 0);

  it('is later today when a time is still ahead', () => {
    const f = form({
      scheduleType: 'multiple_daily',
      scheduleConfig: { times: [{ time: '08:00' }, { time: '20:00' }] },
    });
    const first = firstDoseAfter(f, now)!;
    expect(first.getDate()).toBe(9);
    expect(first.getHours()).toBe(20);
    expect(firstReminderText(first, now, fmt)).toBe('First reminder: today at 20:00');
  });

  it('is tomorrow when today’s times have passed', () => {
    const first = firstDoseAfter(form({ scheduleConfig: { time: '08:00' } }), now)!;
    expect(firstReminderText(first, now, fmt)).toBe('First reminder: tomorrow at 08:00');
  });

  it('names the date further out', () => {
    const f = form({
      scheduleType: 'every_x_days',
      scheduleConfig: {
        intervalDays: 3,
        startDate: new Date(2026, 10, 12).toISOString(),
        time: '08:00',
      },
    });
    const first = firstDoseAfter(f, now)!;
    expect(first.getDate()).toBe(12);
    expect(firstReminderText(first, now, fmt)).toMatch(/^First reminder: .+ at 08:00$/);
  });

  it('is null for as-needed medicines', () => {
    expect(firstDoseAfter(form({ scheduleType: 'prn', scheduleConfig: {} }), now)).toBeNull();
  });
});

describe('review extras row', () => {
  it('lists everything when nothing is set', () => {
    const e = extrasSet(form());
    expect(e.anySet).toBe(false);
    expect(unsetExtrasText(e.unsetItems)).toBe('Notes, safety limits, expiry date');
  });

  it('lists only what is not set', () => {
    const e = extrasSet(form({ notes: 'Take with breakfast' }));
    expect(e.anySet).toBe(true);
    expect(unsetExtrasText(e.unsetItems)).toBe('Safety limits, expiry date');
  });

  it('has no row once notes, a limit and the expiry date are set', () => {
    const e = extrasSet(
      form({ notes: 'x', maxDailyDose: 4, expirationDate: new Date(2027, 0, 1) })
    );
    expect(e.unsetItems).toEqual([]);
  });
});

describe('add flow shape', () => {
  it('has 4 steps for every medicine (as-needed included; supply and extras are not steps)', () => {
    expect(stepsFor({ scheduleType: 'prn' })).toHaveLength(4);
    expect(stepsFor({ scheduleType: 'once_daily' })).toHaveLength(4);
    expect(stepsFor({ scheduleType: 'cycle' })).not.toContain('supply');
    expect(stepsFor({ scheduleType: 'cycle' })).not.toContain('extras');
  });

  it('shows four common units first and keeps all eight reachable', () => {
    expect(COMMON_UNITS).toEqual(['pills', 'milliliters', 'puffs', 'drops']);
    expect([...COMMON_UNITS, ...OTHER_UNITS].sort()).toEqual([...DOSAGE_UNITS].sort());
  });
});
