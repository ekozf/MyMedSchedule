import { describe, it, expect, vi, beforeAll } from 'vitest';

// schedule-summary pulls in lib/settings/compartments, which also exports a store hook.
vi.mock('@/lib/db/operations', () => ({ updateProfile: vi.fn() }));
vi.mock('@/store', () => ({ useStore: vi.fn() }));
import i18n from '@/lib/i18n';
import editorUi from '@/lib/i18n/locales/ui/editor';
import medicinesUi from '@/lib/i18n/locales/ui/medicines';
import { reviewTimesValue } from '@/components/editor/describe';
import { supplySummary } from '@/components/medicines/schedule-summary';
import type { Medication } from '@/types';

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
    inventoryCount: 12,
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

describe('review "Times" row', () => {
  it('puts every-day times on one line, sorted', () => {
    expect(reviewTimesValue('once_daily', { time: '08:00' }, fmt)).toBe('08:00');
    expect(
      reviewTimesValue('multiple_daily', { times: [{ time: '20:00' }, { time: '08:00' }] }, fmt)
    ).toBe('08:00 and 20:00');
  });

  it('falls back to the sentence for other types and long lists', () => {
    const four = ['06:00', '10:00', '14:00', '18:00'].map((time) => ({ time }));
    expect(reviewTimesValue('multiple_daily', { times: four }, fmt)).toBeNull();
    expect(
      reviewTimesValue(
        'every_x_days',
        { intervalDays: 2, startDate: '2026-11-09', time: '08:00' },
        fmt
      )
    ).toBeNull();
  });
});

describe('update supply summary', () => {
  it('reads "12 now → 42 after · about 3 weeks" and speaks it as words', () => {
    const s = supplySummary(med(), 12, 42);
    expect(s.text).toBe('12 now → 42 after · about 3 weeks');
    expect(s.a11y).toBe('12 pills now, 42 after, about 3 weeks');
  });

  it('leaves the pace out when nothing is left', () => {
    const s = supplySummary(med(), 12, 0);
    expect(s.text).toBe('12 now → 0 after');
    expect(s.a11y).toBe('12 pills now, 0 after');
  });
});

describe('editor wording', () => {
  const locales = ['en', 'nl', 'tr'] as const;
  type Tree = Record<string, unknown>;
  const at = (tree: Tree, path: string) =>
    path.split('.').reduce<unknown>((node, k) => (node as Tree | undefined)?.[k], tree);

  it('says "None" only for untouched extras; other unset values read "Not set"', () => {
    for (const l of locales) {
      expect(at(editorUi[l] as Tree, 'review.none')).toEqual(expect.any(String));
    }
    expect(at(editorUi.en as Tree, 'review.none')).toBe('None');
    expect(at(editorUi.en as Tree, 'review.notSet')).toBe('Not set');
  });

  it('has no "tap the number" footnote or "Skip for now" any more', () => {
    for (const l of locales) {
      expect(at(editorUi[l] as Tree, 'screens.tapToType')).toBeUndefined();
      expect(at(editorUi[l] as Tree, 'screens.skipForNow')).toBeUndefined();
    }
  });

  it('says "Maximum in one day" everywhere', () => {
    expect(at(editorUi.en as Tree, 'extras.maxPerDay')).toBe('Maximum in one day');
    expect(at(editorUi.en as Tree, 'review.maxPerDay')).toBe('Maximum in one day');
    expect(at(medicinesUi.en as Tree, 'page.maxPerDay')).toBe('Maximum in one day');
    expect(at(editorUi.en as Tree, 'extras.safety')).toBe('Dose limits from your prescription');
  });

  it('offers "Every day" once, with "Other schedules" for the rest', () => {
    expect(at(editorUi.en as Tree, 'type.daily.title')).toBe('Every day');
    expect(at(editorUi.en as Tree, 'type.daily.example')).toBe('Once or more a day');
    for (const l of locales) {
      expect(at(editorUi[l] as Tree, 'type.daily.title')).toBeTruthy();
      expect(at(editorUi[l] as Tree, 'screens.otherSchedules')).toBeTruthy();
      expect(at(editorUi[l] as Tree, 'screens.otherPatterns')).toBeUndefined();
      expect(at(medicinesUi[l] as Tree, 'setup.note')).toBeTruthy();
      expect(at(medicinesUi[l] as Tree, 'setup.limits')).toBeTruthy();
      expect(at(medicinesUi[l] as Tree, 'supplySheet.startTracking')).toBeTruthy();
      expect(at(medicinesUi[l] as Tree, 'supply.lastChange')).toBeTruthy();
    }
    // Distinct headings on the medicine page: "Supply and expiry", "Note", "Dose limits".
    expect(at(medicinesUi.en as Tree, 'setup.title')).toBeUndefined();
    for (const l of locales) {
      const page = (k: string) => at(medicinesUi[l] as Tree, `page.${k}`);
      expect(new Set([page('supplyExpiry'), page('notes'), page('safety')]).size).toBe(3);
      expect(at(editorUi[l] as Tree, 'edit.expiryTitle')).toBeTruthy();
      expect(at(editorUi[l] as Tree, 'review.supplyExpiry')).toBeTruthy();
    }
    expect(at(medicinesUi.en as Tree, 'page.notes')).toBe('Note');
    expect(at(medicinesUi.en as Tree, 'page.safety')).toBe('Dose limits');
    expect(at(editorUi.en as Tree, 'nudge.body')).toBe(
      'Want to count how many you have left? We’ll show how many days remain.'
    );
  });

  it('labels review rows like the wizard questions', () => {
    const review = (k: string) => at(editorUi.en as Tree, `review.${k}`);
    expect(review('each')).toBe('Amount each time');
    expect(review('inStock')).toBe('You have now');
    expect(review('packageSize')).toBe('Pack size');
    expect(review('refill')).toBe('Refill reminder');
    expect(review('when')).toBe('Times');
  });

  it('translates the new strings', () => {
    const keys = [
      'when.remove',
      'when.removeOnlyTitle',
      'when.removeOnlyMessage',
      'when.removeOnlyConfirm',
      'dose.unitHint',
      'review.notSet',
    ];
    for (const l of locales) {
      for (const k of keys) expect(typeof at(editorUi[l] as Tree, k), `${l} ${k}`).toBe('string');
      expect(typeof at(medicinesUi[l] as Tree, 'sheet.summaryA11y'), l).toBe('string');
    }
  });
});
