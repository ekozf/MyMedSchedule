import { describe, it, expect, vi } from 'vitest';

// lib/settings/compartments also exports a store hook; keep the DB layer out of this test.
vi.mock('@/lib/db/operations', () => ({ updateProfile: vi.fn() }));
vi.mock('@/store', () => ({ useStore: vi.fn() }));
import {
  asNeededDayText,
  asNeededForDay,
  buildEntries,
  compartmentSheetSubtitle,
  compartmentSub,
  compartmentNames,
  compartmentSubText,
  compartmentTileSub,
  compartmentTileSubA11y,
  computeDayStats,
  greetingKey,
  groupByCompartment,
  indexLogs,
  laterWhen,
  nowCompartment,
  splitBold,
  statusLine,
  trayRowHeights,
  trayState,
  upNext,
  upNextIsDue,
  upNextWhen,
  type DoseEntry,
} from '@/components/today/logic';
import i18n from '@/lib/i18n';
import { DEFAULT_COMPARTMENT_BOUNDARIES } from '@/lib/settings/compartments';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import type { IntakeLog, Medication } from '@/types';

const DAY = new Date(2026, 10, 9); // Monday 9 November 2026
const at = (h: number, m = 0, day = DAY) => {
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
};
const fmt = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function dose(id: string, time: Date): ScheduledDose {
  return {
    medicationId: id,
    medicationName: id,
    time,
    dosageAmount: 1,
    dosageUnit: 'pills',
    isPrn: false,
  };
}

function log(d: ScheduledDose, action: IntakeLog['action'], actual = d.time): IntakeLog {
  return {
    id: `${d.medicationId}-${d.time.toISOString()}`,
    medicationId: d.medicationId,
    profileId: 'p',
    scheduledTime: d.time,
    actualTime: actual,
    action,
    dosageAmount: 1,
    createdAt: actual,
    updatedAt: actual,
  };
}

function entries(doses: ScheduledDose[], logs: IntakeLog[], now: Date): DoseEntry[] {
  return buildEntries(doses, indexLogs(logs), new Map<string, Medication>(), now);
}

const B = DEFAULT_COMPARTMENT_BOUNDARIES;

describe('groupByCompartment', () => {
  it('always returns the four compartments in order', () => {
    const groups = groupByCompartment([], B);
    expect(groups.map((g) => g.id)).toEqual(['morning', 'midday', 'evening', 'night']);
    expect(groups.every((g) => g.total === 0)).toBe(true);
  });

  it('buckets by the default boundaries (11:00, 16:00, 21:00), boundaries inclusive at the start', () => {
    const doses = [
      dose('a', at(0, 30)),
      dose('b', at(10, 59)),
      dose('c', at(11, 0)),
      dose('d', at(15, 59)),
      dose('e', at(16, 0)),
      dose('f', at(21, 0)),
      dose('g', at(23, 30)),
    ];
    const groups = groupByCompartment(entries(doses, [], at(7)), B);
    const ids = (i: number) => groups[i].entries.map((e) => e.dose.medicationId);
    expect(ids(0)).toEqual(['a', 'b']);
    expect(ids(1)).toEqual(['c', 'd']);
    expect(ids(2)).toEqual(['e']);
    expect(ids(3)).toEqual(['f', 'g']);
  });

  it('uses custom boundaries', () => {
    const custom = { midday: '12:00', evening: '17:00', night: '22:00' };
    const groups = groupByCompartment(
      entries([dose('a', at(11, 30)), dose('b', at(21, 30))], [], at(7)),
      custom
    );
    expect(groups[0].entries).toHaveLength(1); // 11:30 is still morning
    expect(groups[2].entries).toHaveLength(1); // 21:30 is still evening
  });

  it('sorts entries by time inside a compartment and counts states', () => {
    const d1 = dose('late', at(8));
    const d2 = dose('taken', at(7));
    const d3 = dose('skipped', at(9));
    const groups = groupByCompartment(
      entries([d1, d2, d3], [log(d2, 'taken'), log(d3, 'skipped')], at(10)),
      B
    );
    const m = groups[0];
    expect(m.entries.map((e) => e.dose.medicationId)).toEqual(['taken', 'late', 'skipped']);
    expect(m).toMatchObject({ total: 3, done: 1, skipped: 1, handled: 2, late: 1 });
    expect(m.pending.map((e) => e.dose.medicationId)).toEqual(['late']);
  });
});

describe('states and sub lines', () => {
  it('done / empty / now / default', () => {
    const d1 = dose('a', at(8));
    const d2 = dose('b', at(20));
    const groups = groupByCompartment(entries([d1, d2], [log(d1, 'taken')], at(17)), B);
    // 17:00: the evening dose is three hours away, so nothing looks like "take now".
    const nowId = nowCompartment(groups, at(17), B, true);
    expect(nowId).toBeNull();
    expect(trayState(groups[0], nowId)).toBe('done');
    expect(trayState(groups[1], nowId)).toBe('empty');
    expect(trayState(groups[2], nowId)).toBe('default');
    expect(trayState(groups[3], nowId)).toBe('empty');
    expect(compartmentSubText(groups[2], fmt)).toBe('From 20:00');
    // 19:50: inside the 15-minute due window → evening becomes "now".
    const dueGroups = groupByCompartment(entries([d1, d2], [log(d1, 'taken')], at(19, 50)), B);
    const dueId = nowCompartment(dueGroups, at(19, 50), B, true);
    expect(dueId).toBe('evening');
    expect(trayState(dueGroups[2], dueId)).toBe('now');
    expect(compartmentSubText(dueGroups[2], fmt)).toBe('Due at 20:00');
  });

  it('a tray row whose two compartments are both empty is compact (84), others keep 150', () => {
    expect(trayRowHeights(groupByCompartment([], B))).toEqual([84, 84]);
    // Morning only: top row full, bottom row (evening, night) compact.
    const morning = groupByCompartment(entries([dose('a', at(8))], [], at(7)), B);
    expect(trayRowHeights(morning)).toEqual([150, 84]);
    // Night only: one non-empty tile keeps its row at 150.
    const night = groupByCompartment(entries([dose('n', at(23))], [], at(7)), B);
    expect(trayRowHeights(night)).toEqual([84, 150]);
  });

  it('only a compartment with a due or late dose is "now"', () => {
    const late = dose('late', at(8));
    const later = dose('later', at(20));
    // 17:00 (evening is current but only has a future dose): the late morning dose wins.
    const groups = groupByCompartment(entries([late, later], [], at(17)), B);
    expect(nowCompartment(groups, at(17), B, true)).toBe('morning');
    expect(trayState(groups[2], 'morning')).toBe('default');
  });

  it('now falls back to the earliest unfinished compartment when the current one is done or empty', () => {
    const d1 = dose('a', at(8));
    const d2 = dose('b', at(20));
    // 13:00: midday is empty → earliest unfinished is morning (a late dose)
    const groups = groupByCompartment(entries([d1, d2], [], at(13)), B);
    expect(nowCompartment(groups, at(13), B, true)).toBe('morning');
    // not today → no "now"
    expect(nowCompartment(groups, at(13), B, false)).toBeNull();
    // everything handled → none
    const done = groupByCompartment(
      entries([d1, d2], [log(d1, 'taken'), log(d2, 'skipped')], at(22)),
      B
    );
    expect(nowCompartment(done, at(22), B, true)).toBeNull();
  });

  it('sub line texts', () => {
    const now = at(9, 30);
    const taken = dose('t', at(7));
    const skipped = dose('s', at(7, 30));
    const late1 = dose('l1', at(8));
    const late2 = dose('l2', at(8, 30));
    const due = dose('due', at(13));
    const evening1 = dose('e1', at(18));
    const evening2 = dose('e2', at(20));

    const allTaken = groupByCompartment(entries([taken], [log(taken, 'taken')], now), B)[0];
    expect(compartmentSubText(allTaken, fmt)).toBe('All taken');

    const doneSkipped = groupByCompartment(
      entries([taken, skipped], [log(taken, 'taken'), log(skipped, 'skipped')], now),
      B
    )[0];
    expect(compartmentSubText(doneSkipped, fmt)).toBe('Done, 1 skipped');

    const late = groupByCompartment(entries([late1, late2], [], now), B)[0];
    expect(compartmentSubText(late, fmt)).toBe('2 late');

    const g = groupByCompartment(entries([due, evening1, evening2], [], now), B);
    expect(compartmentSubText(g[1], fmt)).toBe('From 13:00');
    expect(compartmentSubText(g[2], fmt)).toBe('From 18:00');
    expect(compartmentSub(g[3])).toBeNull();
  });

  it('a partial dose is never "All taken"', () => {
    const now = at(9, 30);
    const a = dose('a', at(7));
    const b = dose('b', at(7, 30));
    const c = dose('c', at(8));
    const onePartial = groupByCompartment(
      entries([a, b], [log(a, 'taken'), log(b, 'partial')], now),
      B
    )[0];
    expect(onePartial).toMatchObject({ done: 2, partial: 1, handled: 2 });
    expect(compartmentSubText(onePartial, fmt)).toBe('Done, 1 partial');
    expect(compartmentSheetSubtitle(onePartial, fmt)).toBe('Done, 1 partial');

    const both = groupByCompartment(
      entries([a, b, c], [log(a, 'taken'), log(b, 'partial'), log(c, 'skipped')], now),
      B
    )[0];
    expect(compartmentSubText(both, fmt)).toBe('Done, 1 partial, 1 skipped');
  });

  it('a past day says "not logged" instead of "late"', () => {
    const d = dose('a', at(8));
    const nextDay = new Date(2026, 10, 10, 9);
    const g = groupByCompartment(entries([d], [], nextDay), B)[0];
    expect(compartmentSubText(g, fmt)).toBe('1 not logged');
  });

  it('sheet subtitles', () => {
    const now = at(19);
    const a = dose('a', at(8));
    const b = dose('b', at(8));
    const both = groupByCompartment(
      entries([a, b], [log(a, 'taken', at(8, 12)), log(b, 'taken', at(8, 12))], now),
      B
    )[0];
    expect(compartmentSheetSubtitle(both, fmt)).toBe('Both taken at 08:12');

    const one = groupByCompartment(entries([dose('c', at(20))], [], now), B)[2];
    expect(compartmentSheetSubtitle(one, fmt)).toBe('One to take');

    const two = groupByCompartment(
      entries([dose('c', at(20)), dose('d', at(20, 30))], [], now),
      B
    )[2];
    expect(compartmentSheetSubtitle(two, fmt)).toBe('2 to take, from 20:00');
  });
});

describe('skipped is not success', () => {
  it('a compartment with only skipped doses is neutral and says "1 skipped"', () => {
    const now = at(21);
    const d = dose('Metformin', at(20));
    const g = groupByCompartment(entries([d], [log(d, 'skipped')], now), B)[2];
    expect(trayState(g, null)).toBe('skipped');
    expect(compartmentSubText(g, fmt)).toBe('1 skipped');
    expect(compartmentTileSub(g, fmt)).toBe('Metformin · 1 skipped');
    expect(compartmentSheetSubtitle(g, fmt)).toBe('1 skipped');
  });

  it('with at least one dose taken it stays green: "Done, 1 skipped"', () => {
    const now = at(21);
    const a = dose('a', at(20));
    const b = dose('b', at(20));
    const g = groupByCompartment(entries([a, b], [log(a, 'taken'), log(b, 'skipped')], now), B)[2];
    expect(trayState(g, null)).toBe('done');
    expect(compartmentSubText(g, fmt)).toBe('Done, 1 skipped');
  });

  it('a partial dose counts as taken (green)', () => {
    const d = dose('a', at(20));
    const g = groupByCompartment(entries([d], [log(d, 'partial')], at(21)), B)[2];
    expect(trayState(g, null)).toBe('done');
  });

  it('status line when everything was skipped', () => {
    const d = dose('a', at(8));
    const stats = computeDayStats(entries([d], [log(d, 'skipped')], at(9)));
    expect(statusLine(stats, 'today')).toBe('<b>Nothing taken</b> · 1 skipped.');
    expect(statusLine(stats, 'past')).toBe('<b>Nothing taken</b> · 1 skipped.');
  });
});

describe('tile names', () => {
  const now = at(13);
  it('names up to two medicines, then +N', () => {
    const one = groupByCompartment(entries([dose('Metformin', at(20))], [], now), B)[2];
    expect(compartmentNames(one)).toBe('Metformin');
    expect(compartmentTileSub(one, fmt)).toBe('Metformin · from 20:00');

    const three = groupByCompartment(
      entries(
        [dose('Metformin', at(8)), dose('Lisinopril', at(8)), dose('Aspirin', at(9))],
        [],
        at(10)
      ),
      B
    )[0];
    expect(compartmentNames(three)).toBe('Metformin, Lisinopril +1');
    expect(compartmentTileSub(three, fmt)).toBe('Metformin, Lisinopril +1 · 3 late');
    expect(compartmentTileSubA11y(three, fmt)).toBe('Metformin, Lisinopril, Aspirin, 3 late');
  });

  it('while doses are left, names only the medicines still to take', () => {
    const a = dose('Metformin', at(12));
    const b = dose('Omeprazole', at(12, 30));
    const c = dose('Aspirin', at(12, 30));
    const g = groupByCompartment(
      entries([a, b, c], [log(a, 'taken'), log(c, 'skipped')], at(12, 10)),
      B
    )[1];
    expect(g.id).toBe('midday');
    expect(g.pending.length).toBe(1);
    expect(compartmentNames(g)).toBe('Omeprazole');
    expect(compartmentTileSub(g, fmt)).toBe('Omeprazole · from 12:30');
    expect(compartmentTileSubA11y(g, fmt)).toBe('Omeprazole, From 12:30');

    // Finished: every medicine of the compartment again ("all taken").
    const done = groupByCompartment(
      entries([a, b], [log(a, 'taken'), log(b, 'taken')], at(13)),
      B
    )[1];
    expect(compartmentTileSub(done, fmt)).toBe('Metformin, Omeprazole · all taken');
  });

  it('each medicine is named once', () => {
    const twice = groupByCompartment(
      entries([dose('Metformin', at(18)), { ...dose('Metformin', at(20)) }], [], now),
      B
    )[2];
    expect(compartmentNames(twice)).toBe('Metformin');
  });

  it('uses the name the screen passes (name plus strength)', () => {
    const one = groupByCompartment(entries([dose('Metformin', at(20))], [], now), B)[2];
    const withStrength = (e: { dose: { medicationName: string } }) =>
      `${e.dose.medicationName} 500 mg`;
    expect(compartmentTileSub(one, fmt, withStrength)).toBe('Metformin 500 mg · from 20:00');
    expect(compartmentTileSubA11y(one, fmt, withStrength)).toBe('Metformin 500 mg, From 20:00');
  });

  it('empty compartments have no sub line', () => {
    const g = groupByCompartment([], B)[0];
    expect(compartmentTileSub(g, fmt)).toBeUndefined();
  });
});

describe('Up next, status line, greeting', () => {
  it('picks the first dose still to take today, late ones first', () => {
    const d1 = dose('taken', at(7));
    const d2 = dose('late', at(8));
    const d3 = dose('later', at(20));
    const list = entries([d3, d1, d2], [log(d1, 'taken')], at(9));
    const next = upNext(list, true);
    expect(next?.dose.medicationId).toBe('late');
    expect(upNextWhen(next!, at(8, 41))).toBe('41 minutes late');
    expect(upNext(list, false)).toBeNull();
    const later = list.find((e) => e.dose.medicationId === 'later')!;
    expect(upNextWhen(later, at(18))).toBe('in 2 hours');
  });

  it('Up next is only "take now" when the dose is due or late', () => {
    const d = dose('Metformin', at(20));
    const early = entries([d], [], at(13))[0];
    expect(upNextIsDue(early)).toBe(false);
    expect(
      i18n.t('ui.today.upNext.nextBody', {
        name: 'Metformin',
        dose: '1 pill',
        time: '20:00',
        when: upNextWhen(early, at(13)),
      })
    ).toBe('Next: Metformin, 1 pill at 20:00 (in 7 hours)');
    expect(upNextIsDue(entries([d], [], at(19, 46))[0])).toBe(true);
    expect(upNextIsDue(entries([d], [], at(20, 30))[0])).toBe(true);
    expect(i18n.t('ui.today.upNext.open.evening')).toBe('Open evening');
  });

  it('Up next banner reads "Metformin · 4 hours late" with "1 pill · planned for 08:00"', () => {
    const d = dose('Metformin', at(8));
    const late = entries([d], [], at(12))[0];
    expect(upNextIsDue(late)).toBe(true);
    expect(
      i18n.t('ui.today.upNext.bannerTitle', { name: 'Metformin', when: upNextWhen(late, at(12)) })
    ).toBe('Metformin · 4 hours late');
    expect(i18n.t('ui.today.upNext.detail', { dose: '1 pill', time: '08:00' })).toBe(
      '1 pill · planned for 08:00'
    );
    expect(i18n.t('ui.today.status.allDoneToday')).toBe('All done for today.');
  });

  it('status line', () => {
    const doses = [
      dose('a', at(7)),
      dose('b', at(8)),
      dose('c', at(13)),
      dose('d', at(18)),
      dose('e', at(22)),
    ];
    const logs = [log(doses[0], 'taken'), log(doses[1], 'taken')];
    const stats = computeDayStats(entries(doses, logs, at(9)));
    expect(statusLine(stats, 'today')).toBe('<b>2 of 5</b> doses taken · 3 more to go today.');
    expect(splitBold(statusLine(stats, 'today'))).toEqual([
      { text: '2 of 5', bold: true },
      { text: ' doses taken · 3 more to go today.', bold: false },
    ]);
    expect(statusLine(computeDayStats([]), 'today')).toBe('Nothing planned today.');
    const allDone = computeDayStats(entries([doses[0]], [logs[0]], at(9)));
    expect(statusLine(allDone, 'today')).toBe('All done for today.');
    // No big "0 of 2": nothing taken yet is said in words.
    const none = computeDayStats(entries(doses.slice(3), [], at(9)));
    expect(statusLine(none, 'today')).toBe('<b>Nothing taken yet</b> · 2 to go today.');
    // Partial doses are named, not counted as taken.
    const mixed = computeDayStats(
      entries(doses.slice(0, 3), [log(doses[0], 'taken'), log(doses[1], 'partial')], at(9))
    );
    expect(statusLine(mixed, 'today')).toBe(
      '<b>1 of 3</b> doses taken · 1 partial · 1 more to go today.'
    );
    const onlyPartial = computeDayStats(
      entries(doses.slice(0, 2), [log(doses[0], 'partial')], at(9))
    );
    expect(statusLine(onlyPartial, 'today')).toBe(
      '<b>0 of 2</b> doses taken · 1 partial · 1 more to go today.'
    );
  });

  it('an empty today points at the first dose on a later day', () => {
    const now = at(16, 3);
    const empty = computeDayStats([]);
    const tomorrow = laterWhen(at(8, 0, new Date(2026, 10, 10)), now, fmt);
    expect(tomorrow).toBe('tomorrow at 08:00');
    expect(statusLine(empty, 'today', { when: tomorrow, first: true })).toBe(
      'Nothing more today. First dose tomorrow at 08:00.'
    );
    expect(statusLine(empty, 'today', { when: tomorrow, first: false })).toBe(
      'Nothing more today. Next dose tomorrow at 08:00.'
    );
    // Later this week: the weekday; further out: the date.
    expect(laterWhen(at(8, 0, new Date(2026, 10, 12)), now, fmt)).toBe('Thursday at 08:00');
    expect(laterWhen(at(8, 0, new Date(2026, 10, 20)), now, fmt)).toBe('on 20 Nov at 08:00');
    // No scheduled medicine (no later dose), or another day: unchanged.
    expect(statusLine(empty, 'today', null)).toBe('Nothing planned today.');
    expect(statusLine(empty, 'future', { when: tomorrow, first: true })).toBe(
      'Nothing planned this day.'
    );
  });

  it('tile count is the number still to take until the compartment is finished', () => {
    const now = at(19);
    const a = dose('a', at(20));
    const b = dose('b', at(20));
    const open = groupByCompartment(entries([a, b], [log(a, 'taken')], now), B)[2];
    expect(open.pending.length).toBe(1);
    expect(i18n.t('ui.compartments.toTake', { count: 1 })).toBe('dose to take');
    expect(i18n.t('ui.compartments.toTake', { count: 2 })).toBe('doses to take');
    expect(i18n.t('ui.compartments.toTakeA11y', { count: open.pending.length })).toBe(
      '1 dose to take'
    );
    const finished = groupByCompartment(
      entries([a, b], [log(a, 'taken'), log(b, 'skipped')], now),
      B
    )[2];
    expect(finished.pending.length).toBe(0);
    expect(compartmentSubText(finished, fmt)).toBe('Done, 1 skipped');
  });

  it('greeting by time of day', () => {
    expect(greetingKey(at(9), true)).toBe('ui.today.greeting.morning');
    expect(greetingKey(at(12), true)).toBe('ui.today.greeting.afternoon');
    expect(greetingKey(at(18), true)).toBe('ui.today.greeting.evening');
    expect(greetingKey(at(9), false)).toBe('ui.today.greeting.hello');
  });
});

describe('"When you need it" follows the picked day', () => {
  const prn = { id: 'ibu', name: 'Ibuprofen', isActive: true, isPrn: true } as unknown as Medication;
  const prnLog = (actual: Date, action: IntakeLog['action'] = 'taken'): IntakeLog => ({
    id: `ibu-${actual.toISOString()}`,
    medicationId: 'ibu',
    profileId: 'p',
    actualTime: actual,
    action,
    dosageAmount: 1,
    createdAt: actual,
    updatedAt: actual,
  });
  const yesterday = new Date(2026, 10, 8);
  const logs = [prnLog(at(9, 10, yesterday)), prnLog(at(15, 0, yesterday)), prnLog(at(10)), prnLog(at(11), 'skipped')];

  it('counts the picked day only (skips not counted)', () => {
    expect(asNeededForDay([prn], logs, DAY)[0]).toMatchObject({ taken: 1, lastAt: at(10) });
    expect(asNeededForDay([prn], logs, yesterday)[0]).toMatchObject({
      taken: 2,
      lastAt: at(15, 0, yesterday),
    });
  });

  it('says "today" only on today, nothing on a future day', () => {
    expect(asNeededDayText({ taken: 1, lastAt: at(10) }, 'today', fmt)).toBe('1 taken today, last at 10:00');
    expect(asNeededDayText({ taken: 0, lastAt: null }, 'today', fmt)).toBe('None today');
    expect(asNeededDayText({ taken: 2, lastAt: at(15) }, 'past', fmt)).toBe('2 taken, last at 15:00');
    expect(asNeededDayText({ taken: 0, lastAt: null }, 'past', fmt)).toBe('None taken');
    expect(asNeededDayText({ taken: 0, lastAt: null }, 'future', fmt)).toBeNull();
  });
});
