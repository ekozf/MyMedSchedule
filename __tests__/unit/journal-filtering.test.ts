import { describe, it, expect } from 'vitest';
import {
  activeFilterCount,
  amountStep,
  doseTiming,
  countLogs,
  dayChoiceFor,
  dayForChoice,
  defaultOccurrence,
  doseOccurrences,
  filterLogs,
  groupByDay,
  isInFuture,
  partialAmount,
  withDay,
  withTime,
  DEFAULT_FILTERS,
} from '@/components/journal/filtering';
import type { IntakeAction, IntakeLog } from '@/types';

const NOW = new Date(2026, 10, 9, 14, 30); // Monday 9 November 2026, 14:30

let seq = 0;
function log(at: Date, action: IntakeAction = 'taken', medicationId = 'm1'): IntakeLog {
  seq += 1;
  return {
    id: `l${seq}`,
    medicationId,
    profileId: 'p1',
    actualTime: at,
    action,
    dosageAmount: 1,
    createdAt: at,
    updatedAt: at,
  };
}

describe('filterLogs', () => {
  const logs = [
    log(new Date(2026, 10, 9, 8, 0), 'taken', 'm1'),
    log(new Date(2026, 10, 9, 20, 0), 'partial', 'm2'),
    log(new Date(2026, 10, 8, 8, 0), 'skipped', 'm1'),
    log(new Date(2026, 9, 20, 8, 0), 'taken', 'm1'), // 20 days ago
    log(new Date(2026, 6, 1, 8, 0), 'taken', 'm2'), // months ago
  ];

  it('keeps the range and sorts newest first', () => {
    const out = filterLogs(logs, DEFAULT_FILTERS, NOW);
    expect(out.map((l) => l.actualTime.getDate())).toEqual([9, 9, 8]);
    expect(out[0].action).toBe('partial'); // 20:00 before 08:00
    expect(filterLogs(logs, { ...DEFAULT_FILTERS, range: '30' }, NOW)).toHaveLength(4);
    expect(filterLogs(logs, { ...DEFAULT_FILTERS, range: 'all' }, NOW)).toHaveLength(5);
  });

  it('each status segment matches only its own status', () => {
    const all = { ...DEFAULT_FILTERS, range: 'all' as const };
    expect(filterLogs(logs, { ...all, action: 'taken' }, NOW).map((l) => l.action)).toEqual([
      'taken',
      'taken',
      'taken',
    ]);
    expect(filterLogs(logs, { ...all, action: 'partial' }, NOW).map((l) => l.action)).toEqual([
      'partial',
    ]);
    expect(filterLogs(logs, { ...all, action: 'skipped' }, NOW)).toHaveLength(1);
  });

  it('filters by medicine', () => {
    const out = filterLogs(logs, { ...DEFAULT_FILTERS, range: 'all', medicationId: 'm2' }, NOW);
    expect(out.every((l) => l.medicationId === 'm2')).toBe(true);
    expect(out).toHaveLength(2);
  });
});

describe('groupByDay / countLogs', () => {
  it('groups sorted logs per day and marks the rail ends', () => {
    const sorted = filterLogs(
      [
        log(new Date(2026, 10, 9, 8, 0)),
        log(new Date(2026, 10, 9, 12, 0), 'skipped'),
        log(new Date(2026, 10, 8, 9, 0), 'partial'),
      ],
      { ...DEFAULT_FILTERS, range: 'all' },
      NOW
    );
    const sections = groupByDay(sorted);
    expect(sections.map((s) => s.key)).toEqual(['2026-11-09', '2026-11-08']);
    expect(sections[0].data.map((i) => [i.first, i.last])).toEqual([
      [true, false],
      [false, true],
    ]);
    expect(sections[1].data[0]).toMatchObject({ first: true, last: true });
    expect(countLogs(sections[0].data.map((i) => i.log))).toEqual({
      total: 2,
      taken: 1,
      skipped: 1,
      partial: 0,
    });
  });
});

describe('past dose date maths', () => {
  it('maps dates to day segments and back', () => {
    expect(dayChoiceFor(new Date(2026, 10, 9, 1, 0), NOW)).toBe('today');
    expect(dayChoiceFor(new Date(2026, 10, 8, 23, 0), NOW)).toBe('yesterday');
    expect(dayChoiceFor(new Date(2026, 10, 1), NOW)).toBe('pick');
    expect(dayForChoice('yesterday', NOW, NOW)).toEqual(new Date(2026, 10, 8));
    expect(dayForChoice('pick', new Date(2026, 10, 1, 17, 5), NOW)).toEqual(new Date(2026, 10, 1));
  });

  it('combines a day and a time', () => {
    const t = withTime(dayForChoice('yesterday', NOW, NOW), new Date(2000, 0, 1, 21, 15, 42));
    expect(t).toEqual(new Date(2026, 10, 8, 21, 15, 0));
    expect(withDay(new Date(2026, 10, 9, 7, 45), new Date(2026, 9, 3))).toEqual(
      new Date(2026, 9, 3, 7, 45)
    );
  });

  it('allows a minute of tolerance for "now"', () => {
    expect(isInFuture(new Date(NOW.getTime() + 30_000), NOW)).toBe(false);
    expect(isInFuture(new Date(NOW.getTime() + 5 * 60_000), NOW)).toBe(true);
  });

  it('picks sensible steps and partial amounts', () => {
    expect(amountStep(1)).toBe(0.5);
    expect(amountStep(20)).toBe(1);
    expect(amountStep(250)).toBe(10);
    expect(amountStep(1000)).toBe(50);
    expect(partialAmount(1)).toBe(0.5);
    expect(partialAmount(2)).toBe(1);
    expect(partialAmount(500)).toBe(250);
  });
});

describe('doseOccurrences ("Which dose?")', () => {
  const day = new Date(2026, 10, 9);
  const at = (h: number) => {
    const d = new Date(day);
    d.setHours(h, 0, 0, 0);
    return d;
  };
  const doses = [
    { medicationId: 'm', time: at(20) },
    { medicationId: 'm', time: at(8) },
  ];

  it('lists the planned times in order with what is already logged', () => {
    const logs = [
      { medicationId: 'm', scheduledTime: at(8), action: 'taken' as const },
      { medicationId: 'other', scheduledTime: at(20), action: 'skipped' as const },
      { medicationId: 'm', scheduledTime: undefined, action: 'taken' as const },
    ];
    expect(doseOccurrences(doses, logs)).toEqual([
      { key: at(8).toISOString(), time: at(8), status: 'taken' },
      { key: at(20).toISOString(), time: at(20), status: null },
    ]);
  });

  it('the newest matching log wins (list order) and duplicate times show once', () => {
    const logs = [
      { medicationId: 'm', scheduledTime: at(8), action: 'skipped' as const },
      { medicationId: 'm', scheduledTime: at(8), action: 'taken' as const },
    ];
    const list = doseOccurrences([...doses, { medicationId: 'm', time: at(8) }], logs);
    expect(list).toHaveLength(2);
    expect(list[0].status).toBe('skipped');
  });

  it('starts on the latest planned dose that has passed and is not logged', () => {
    const none = doseOccurrences(doses, []);
    expect(defaultOccurrence(none, at(21))).toBe(at(20).toISOString());
    expect(defaultOccurrence(none, at(12))).toBe(at(8).toISOString());
    expect(defaultOccurrence(none, at(7))).toBe('other');
    const logged = doseOccurrences(doses, [
      { medicationId: 'm', scheduledTime: at(8), action: 'taken' },
    ]);
    expect(defaultOccurrence(logged, at(12))).toBe('other');
    expect(defaultOccurrence([], at(12))).toBe('other');
  });
});

describe('activeFilterCount', () => {
  it('counts filters that differ from the defaults', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, range: 'all' })).toBe(1);
    expect(activeFilterCount({ range: '30', medicationId: 'm1', action: 'skipped' })).toBe(3);
  });
});

describe('doseTiming', () => {
  const planned = new Date(2026, 10, 9, 8, 0);
  const at = (h: number, m = 0) => new Date(2026, 10, 9, h, m);
  it('tags a dose taken more than 2 hours off its planned time', () => {
    expect(doseTiming({ action: 'taken', scheduledTime: planned, actualTime: at(5, 59) })).toBe(
      'early'
    );
    expect(doseTiming({ action: 'partial', scheduledTime: planned, actualTime: at(10, 1) })).toBe(
      'late'
    );
  });
  it('leaves within 2 hours, skipped and unscheduled doses untagged', () => {
    expect(doseTiming({ action: 'taken', scheduledTime: planned, actualTime: at(6) })).toBeNull();
    expect(doseTiming({ action: 'taken', scheduledTime: planned, actualTime: at(10) })).toBeNull();
    expect(
      doseTiming({ action: 'skipped', scheduledTime: planned, actualTime: at(12) })
    ).toBeNull();
    expect(doseTiming({ action: 'taken', actualTime: at(12) })).toBeNull();
  });
});
