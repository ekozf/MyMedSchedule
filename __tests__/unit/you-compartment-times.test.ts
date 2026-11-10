import { describe, it, expect, vi } from 'vitest';

// lib/settings/compartments also exports a store hook; keep the DB layer out of this test.
vi.mock('@/lib/db/operations', () => ({ updateProfile: vi.fn() }));
vi.mock('@/store', () => ({ useStore: vi.fn() }));
import {
  boundariesInOrder,
  compartmentTimesValue,
  fitsOneLine,
  partsOfDayRanges,
  partsOfDayValue,
  fromHHmm,
  toHHmm,
} from '@/components/you/compartment-times';
import { DEFAULT_COMPARTMENT_BOUNDARIES } from '@/lib/settings/compartments';

describe('partsOfDayValue', () => {
  it('names each part with its start time', () => {
    expect(partsOfDayValue(DEFAULT_COMPARTMENT_BOUNDARIES, (t) => t)).toBe(
      'Midday 11:00 · Evening 16:00 · Night 21:00'
    );
  });
});

describe('compartmentTimesValue', () => {
  it('lists the start of midday, evening and night', () => {
    expect(compartmentTimesValue(DEFAULT_COMPARTMENT_BOUNDARIES, (t) => t)).toBe(
      '11:00 · 16:00 · 21:00'
    );
  });

  it('uses the given formatter (12-hour clock)', () => {
    const fmt = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    };
    expect(compartmentTimesValue({ midday: '12:00', evening: '17:30', night: '22:00' }, fmt)).toBe(
      '12:00 PM · 5:30 PM · 10:00 PM'
    );
  });

  it('falls back to the defaults for out-of-order stored values', () => {
    expect(
      compartmentTimesValue({ midday: '18:00', evening: '16:00', night: '21:00' }, (t) => t)
    ).toBe('11:00 · 16:00 · 21:00');
  });
});

describe('partsOfDayRanges', () => {
  it('says the ranges in words', () => {
    expect(partsOfDayRanges(DEFAULT_COMPARTMENT_BOUNDARIES, (t) => t)).toBe(
      'Morning until 11:00 · Midday · Evening from 16:00 · Night from 21:00'
    );
  });

  it('only uses the long form when it fits on one line', () => {
    const long = partsOfDayRanges(DEFAULT_COMPARTMENT_BOUNDARIES, (t) => t);
    expect(fitsOneLine(long, 300)).toBe(false);
    expect(fitsOneLine(long, 700)).toBe(true);
    expect(fitsOneLine(long, 700, 1.5)).toBe(false);
  });
});

describe('boundariesInOrder', () => {
  it('accepts strictly increasing times', () => {
    expect(boundariesInOrder({ midday: '10:30', evening: '15:00', night: '20:45' })).toBe(true);
    expect(boundariesInOrder(DEFAULT_COMPARTMENT_BOUNDARIES)).toBe(true);
  });

  it('rejects equal or reversed times', () => {
    expect(boundariesInOrder({ midday: '16:00', evening: '16:00', night: '21:00' })).toBe(false);
    expect(boundariesInOrder({ midday: '11:00', evening: '22:00', night: '21:00' })).toBe(false);
  });
});

describe('toHHmm / fromHHmm', () => {
  it('round-trips a time of day', () => {
    const d = fromHHmm('07:05', new Date(2026, 10, 9, 15, 30));
    expect(d.getHours()).toBe(7);
    expect(d.getMinutes()).toBe(5);
    expect(d.getDate()).toBe(9);
    expect(toHHmm(d)).toBe('07:05');
  });

  it('pads single digits', () => {
    expect(toHHmm(new Date(2026, 0, 1, 9, 3))).toBe('09:03');
  });
});
