/**
 * Pure Journal logic (no React Native, no i18n): filtering, grouping by day, counts, and the date
 * maths behind "Log a past dose". Unit tested in `__tests__/unit/journal-filtering.test.ts`.
 */
import { addDays, format, isSameDay, startOfDay, subDays } from 'date-fns';
import type { IntakeAction, IntakeLog } from '@/types';

export type RangeKey = '7' | '30' | '90' | 'all';
/** Status segment: each value matches exactly that action. */
export type ActionFilter = 'all' | IntakeAction;

export interface JournalFilters {
  range: RangeKey;
  /** 'all' or a medication id. */
  medicationId: string;
  action: ActionFilter;
}

export const DEFAULT_FILTERS: JournalFilters = { range: '7', medicationId: 'all', action: 'all' };

export const RANGE_KEYS: RangeKey[] = ['7', '30', '90', 'all'];
/** Order used by the status segments and the summary line. */
export const ACTIONS: IntakeAction[] = ['taken', 'partial', 'skipped'];

/** How many filters differ from the defaults (range, medicine, status): the Filter chip's badge. */
export function activeFilterCount(filters: JournalFilters): number {
  return (
    (filters.range !== DEFAULT_FILTERS.range ? 1 : 0) +
    (filters.medicationId !== 'all' ? 1 : 0) +
    (filters.action !== 'all' ? 1 : 0)
  );
}

/** More than this far from the planned time, a taken dose is tagged "early" or "late". */
export const OFF_TIME_MS = 2 * 60 * 60 * 1000;

/**
 * "early" when a scheduled dose was taken (fully or partly) more than 2 hours before its planned
 * time, "late" when more than 2 hours after; otherwise (or skipped / unscheduled) null.
 */
export function doseTiming(
  log: Pick<IntakeLog, 'action' | 'scheduledTime' | 'actualTime'>
): 'early' | 'late' | null {
  if (log.action === 'skipped' || !log.scheduledTime) return null;
  const diff = new Date(log.actualTime).getTime() - new Date(log.scheduledTime).getTime();
  if (diff < -OFF_TIME_MS) return 'early';
  if (diff > OFF_TIME_MS) return 'late';
  return null;
}

export function matchesAction(action: IntakeAction, filter: ActionFilter): boolean {
  return filter === 'all' || action === filter;
}

/** Range → `actualTime >= now - N days`, medicine and status match; newest first. */
export function filterLogs(
  logs: IntakeLog[],
  filters: JournalFilters,
  now: Date = new Date()
): IntakeLog[] {
  const cutoff = filters.range === 'all' ? null : subDays(now, Number(filters.range));
  return logs
    .filter(
      (log) =>
        (!cutoff || new Date(log.actualTime) >= cutoff) &&
        (filters.medicationId === 'all' || log.medicationId === filters.medicationId) &&
        matchesAction(log.action, filters.action)
    )
    .sort((a, b) => new Date(b.actualTime).getTime() - new Date(a.actualTime).getTime());
}

export interface JournalItem {
  log: IntakeLog;
  /** Position in the whole (filtered) list. */
  index: number;
  /** First / last entry of its day (the rail stops at the ends). */
  first: boolean;
  last: boolean;
}

export interface DaySection {
  key: string;
  date: Date;
  data: JournalItem[];
}

/** Groups already-sorted logs into day sections (keeps order). */
export function groupByDay(logs: IntakeLog[]): DaySection[] {
  const sections: DaySection[] = [];
  let current: DaySection | null = null;
  logs.forEach((log, index) => {
    const date = new Date(log.actualTime);
    const key = format(date, 'yyyy-MM-dd');
    if (!current || current.key !== key) {
      current = { key, date, data: [] };
      sections.push(current);
    }
    current.data.push({ log, index, first: current.data.length === 0, last: false });
  });
  for (const s of sections) s.data[s.data.length - 1].last = true;
  return sections;
}

export interface JournalCounts {
  total: number;
  taken: number;
  skipped: number;
  partial: number;
}

export function countLogs(logs: Pick<IntakeLog, 'action'>[]): JournalCounts {
  const counts: JournalCounts = { total: logs.length, taken: 0, skipped: 0, partial: 0 };
  for (const log of logs) counts[log.action] += 1;
  return counts;
}

// ---- Log a past dose ------------------------------------------------------------------------

export type DayChoice = 'today' | 'yesterday' | 'pick';

/** Which day segment a date belongs to. */
export function dayChoiceFor(date: Date, now: Date = new Date()): DayChoice {
  if (isSameDay(date, now)) return 'today';
  if (isSameDay(date, addDays(now, -1))) return 'yesterday';
  return 'pick';
}

/** Start of the day a segment stands for (`picked` for "Pick a day"). */
export function dayForChoice(choice: DayChoice, picked: Date, now: Date = new Date()): Date {
  if (choice === 'today') return startOfDay(now);
  if (choice === 'yesterday') return startOfDay(addDays(now, -1));
  return startOfDay(picked);
}

/** Keeps the time of `base`, takes the calendar day of `day`. */
export function withDay(base: Date, day: Date): Date {
  const d = new Date(base);
  d.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return d;
}

/** Keeps the day of `base`, takes hours and minutes of `time` (seconds cleared). */
export function withTime(base: Date, time: Date): Date {
  const d = new Date(base);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

/** A minute of tolerance so "now" picked in a time picker never counts as the future. */
export function isInFuture(date: Date, now: Date = new Date()): boolean {
  return date.getTime() > now.getTime() + 60_000;
}

/** Stepper increment that suits the size of a dose (0.5 pill … 50 mg). */
export function amountStep(standardDose: number): number {
  if (standardDose < 5) return 0.5;
  if (standardDose < 50) return 1;
  if (standardDose < 500) return 10;
  return 50;
}

/** Starting amount for a partial dose: about half the usual dose, on the stepper's grid. */
export function partialAmount(standardDose: number): number {
  const step = amountStep(standardDose);
  return Math.max(step, Math.round(standardDose / 2 / step) * step);
}

/** One planned dose of a medicine on a day, with what was logged for it (if anything). */
export interface DoseOccurrence {
  /** ISO of the planned time; the chip value and the log's `scheduledTime`. */
  key: string;
  time: Date;
  /** Already logged for this planned time, else null. */
  status: IntakeAction | null;
}

/**
 * The "Which dose?" choices of "Log a past dose": the medicine's planned doses that day (from the
 * schedule calculator, so the times match Today), each with the status already logged for it.
 * A log matches when it has the same medicine and exactly that `scheduledTime` (Today's rule);
 * the first match in list order wins (logs come newest first).
 *
 * @example
 * doseOccurrences(getAllDosesForDate([med], day), logs)
 * // [{ key: '…T07:00:00.000Z', time: 08:00, status: 'taken' }, { …, time: 20:00, status: null }]
 */
export function doseOccurrences(
  doses: { medicationId: string; time: Date }[],
  logs: Pick<IntakeLog, 'medicationId' | 'scheduledTime' | 'action'>[]
): DoseOccurrence[] {
  return [...doses]
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .filter((d, i, all) => i === 0 || all[i - 1].time.getTime() !== d.time.getTime())
    .map((d) => {
      const log = logs.find(
        (l) =>
          l.medicationId === d.medicationId &&
          !!l.scheduledTime &&
          new Date(l.scheduledTime).getTime() === d.time.getTime()
      );
      return { key: d.time.toISOString(), time: d.time, status: log?.action ?? null };
    });
}

/**
 * Which "Which dose?" chip to start on: the latest planned dose that has passed and isn't logged
 * yet, else "other" (a free time).
 */
export function defaultOccurrence(occurrences: DoseOccurrence[], now: Date = new Date()): string {
  const open = occurrences.filter((o) => !o.status && o.time.getTime() <= now.getTime());
  return open.length ? open[open.length - 1].key : 'other';
}
