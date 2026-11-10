import { describe, it, expect, vi, beforeAll } from 'vitest';

// lib/settings/compartments also exports a store hook; keep the DB layer out of this test.
vi.mock('@/lib/db/operations', () => ({ updateProfile: vi.fn() }));
vi.mock('@/store', () => ({ useStore: vi.fn() }));
import i18n from '@/lib/i18n';
import { DEFAULT_COMPARTMENT_BOUNDARIES } from '@/lib/settings/compartments';
import {
  compartmentsOf,
  daysOfSupply,
  paceLabel,
  scheduleTimes,
  shortSchedule,
  traySlots,
} from '@/components/medicines/schedule-summary';
import { getSupplyState } from '@/components/medicines/medicine-info';
import type { Medication } from '@/types';

const B = DEFAULT_COMPARTMENT_BOUNDARIES;
const fmt = (t: string) => t;

function med(overrides: Partial<Medication> = {}): Medication {
  const now = new Date(2026, 10, 9, 9, 0);
  return {
    id: 'm1',
    profileId: 'p1',
    name: 'Metformin',
    dosageAmount: 1,
    dosageUnit: 'pills',
    scheduleType: 'multiple_daily',
    scheduleConfig: JSON.stringify({ times: [{ time: '08:00' }, { time: '20:00' }] }),
    inventoryCount: 29,
    trackSupply: true,
    bypassDnd: false,
    isActive: true,
    isPrn: false,
    refillReminderType: null,
    refillReminderValue: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Medication;
}

beforeAll(() => {
  i18n.locale = 'en';
});

describe('schedule summary', () => {
  it('lists the reminder times of each schedule type', () => {
    expect(scheduleTimes('multiple_daily', { times: [{ time: '20:00' }, { time: '08:00' }] })).toEqual([
      '08:00',
      '20:00',
    ]);
    expect(scheduleTimes('once_daily', { time: '09:30' })).toEqual(['09:30']);
    expect(scheduleTimes('every_x_hours', { intervalHours: 8, firstDoseTime: '06:00' })).toEqual([
      '06:00',
      '14:00',
      '22:00',
    ]);
    expect(scheduleTimes('prn', {})).toEqual([]);
  });

  it('maps times to compartments only when each compartment holds one time', () => {
    expect(compartmentsOf(['08:00', '20:00'], B)).toEqual(['morning', 'evening']);
    expect(compartmentsOf(['22:30', '07:00'], B)).toEqual(['morning', 'night']);
    expect(compartmentsOf(['07:00', '09:00'], B)).toBeNull();
    expect(compartmentsOf([], B)).toBeNull();
  });

  it('says compartment names for daily schedules, else times or the schedule', () => {
    expect(shortSchedule('multiple_daily', { times: [{ time: '08:00' }, { time: '20:00' }] }, B, fmt)).toBe(
      'morning and evening'
    );
    expect(shortSchedule('once_daily', { time: '08:00' }, B, fmt)).toBe('every morning');
    expect(shortSchedule('multiple_daily', { times: [{ time: '07:00' }, { time: '09:00' }] }, B, fmt)).toBe(
      'every day at 07:00 and 09:00'
    );
    expect(
      shortSchedule('every_x_days', { intervalDays: 2, startDate: new Date().toISOString(), time: '08:00' }, B, fmt)
    ).toBe('every 2 days at 08:00');
  });

  it('fills the mini tray per compartment', () => {
    const slots = traySlots(['08:00', '20:00'], B, fmt);
    expect(slots.map((s) => s.times ?? null)).toEqual([['08:00'], null, ['20:00'], null]);
  });
});

describe('supply pace', () => {
  it('rounds to days, weeks or months', () => {
    expect(paceLabel(0)).toBe('runs out today');
    expect(paceLabel(3)).toBe('about 3 days');
    expect(paceLabel(15)).toBe('about 2 weeks');
    expect(paceLabel(45)).toBe('about 6 weeks');
    expect(paceLabel(90)).toBe('about 3 months');
    expect(paceLabel(null)).toBeNull();
  });

  it('estimates days from the schedule (29 pills at 2 a day ≈ 15 days)', () => {
    expect(daysOfSupply(med())).toBe(15);
    expect(daysOfSupply(med(), 89)).toBe(45);
    expect(daysOfSupply(med({ isPrn: true, scheduleType: 'prn', scheduleConfig: '{}' }))).toBeNull();
    expect(daysOfSupply(med(), 0)).toBe(0);
  });

  it('writes the list line, with "refill soon" only once a refill reminder is reached', () => {
    expect(getSupplyState(med()).line).toBe('29 pills left, about 2 weeks');
    // No refill reminder: a short supply is still a plain count.
    expect(getSupplyState(med({ inventoryCount: 6 })).line).toBe('6 pills left, about 3 days');
    expect(
      getSupplyState(
        med({ inventoryCount: 6, refillReminderType: 'days', refillReminderValue: 7 })
      ).line
    ).toBe('6 pills left, refill soon');
    expect(getSupplyState(med({ inventoryCount: 0 })).line).toBe('None left, refill now');
  });

  it('is amber only for a reached refill reminder or a tracked count of 0', () => {
    expect(getSupplyState(med({ inventoryCount: 6 })).warn).toBe(false);
    expect(
      getSupplyState(
        med({ inventoryCount: 6, refillReminderType: 'days', refillReminderValue: 7 })
      ).warn
    ).toBe(true);
    expect(
      getSupplyState(
        med({ inventoryCount: 29, refillReminderType: 'days', refillReminderValue: 7 })
      ).warn
    ).toBe(false);
    expect(getSupplyState(med({ inventoryCount: 0 })).warn).toBe(true);
    expect(getSupplyState(med({ inventoryCount: 0, trackSupply: false })).warn).toBe(false);
    expect(getSupplyState(med({ inventoryCount: 0, isActive: false })).warn).toBe(false);
  });
});
