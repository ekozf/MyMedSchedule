/**
 * Pure helpers for the Journal: filtering (same rules as the old History screen), grouping by
 * day, counts, and date/time merging for the "When?" fields.
 */
import { format, isSameDay, subDays, addDays } from 'date-fns';
import i18n from '@/lib/i18n';
import { formatShortDate } from '@/lib/ui/format';
import type { IntakeAction, IntakeLog, Medication } from '@/types';

export type RangeKey = '7' | '30' | '90' | 'all';
export type ActionFilter = 'all' | IntakeAction;

export interface JournalFilters {
  range: RangeKey;
  /** 'all' or a medication id. */
  medicationId: string;
  action: ActionFilter;
}

export const DEFAULT_FILTERS: JournalFilters = { range: '7', medicationId: 'all', action: 'all' };

export const RANGE_KEYS: RangeKey[] = ['7', '30', '90', 'all'];
export const ACTIONS: IntakeAction[] = ['taken', 'skipped', 'partial'];

/** Range → `actualTime >= now - N days`, medicine and action match; newest first. */
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
        (filters.action === 'all' || log.action === filters.action)
    )
    .sort((a, b) => new Date(b.actualTime).getTime() - new Date(a.actualTime).getTime());
}

export interface JournalItem {
  log: IntakeLog;
  /** Position in the whole (filtered) list — used to stagger entering animations. */
  index: number;
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

export function countLogs(logs: IntakeLog[]): JournalCounts {
  const counts: JournalCounts = { total: logs.length, taken: 0, skipped: 0, partial: 0 };
  for (const log of logs) counts[log.action] += 1;
  return counts;
}

/** "18 entries · 15 taken · 2 skipped · 1 partial" (zero counts left out). */
export function summaryText(counts: JournalCounts): string {
  const parts = [i18n.t('ui.journal.summary.entries', { count: counts.total })];
  for (const a of ACTIONS) {
    if (counts[a] > 0) parts.push(i18n.t(`ui.journal.summary.${a}`, { count: counts[a] }));
  }
  return parts.join(' · ');
}

/** Day header: "Today" / "Yesterday" / "Mon 28 Sep"; `detail` repeats the date for the first two. */
export function dayTitle(date: Date, now: Date = new Date()): { title: string; detail?: string } {
  if (isSameDay(date, now)) {
    return { title: i18n.t('ui.common.today'), detail: formatShortDate(date, now) };
  }
  if (isSameDay(date, addDays(now, -1))) {
    return { title: i18n.t('ui.common.yesterday'), detail: formatShortDate(date, now) };
  }
  return { title: formatShortDate(date, now) };
}

/** "Today" / "Yesterday" / "Mon 28 Sep" as a single label. */
export function dayLabel(date: Date, now: Date = new Date()): string {
  return dayTitle(date, now).title;
}

/** Label for an entry without a scheduled time. */
export function unscheduledLabel(medication?: Medication): string {
  return i18n.t(medication?.isPrn ? 'ui.journal.row.asNeeded' : 'ui.journal.row.loggedAfterwards');
}

/** Stepper increment that suits the size of a dose (0.5 pill … 50 mg). */
export function amountStep(standardDose: number): number {
  if (standardDose < 5) return 0.5;
  if (standardDose < 50) return 1;
  if (standardDose < 500) return 10;
  return 50;
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
