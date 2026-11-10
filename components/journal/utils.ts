/**
 * Journal text helpers (localized): day headings, the summary line, entry detail lines.
 * The pure filtering / date logic lives in `./filtering` and is re-exported here.
 */
import { format, isSameDay, isSameMonth, isSameYear, addDays } from 'date-fns';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { formatDose } from '@/lib/ui/format';
import type { IntakeAction, IntakeLog, Medication } from '@/types';
import { type JournalCounts, type RangeKey } from './filtering';

export * from './filtering';

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "Monday 9" (this month), "Saturday 31 October", "Friday 3 July 2025"; Turkish puts the day first. */
function weekdayDate(date: Date, now: Date): string {
  const tr = getCurrentLocale() === 'tr';
  // Turkish reads oddly without the month ("9 Pazartesi"), so it always gets one.
  const withMonth = tr || !isSameMonth(date, now) || !isSameYear(date, now);
  let pattern = tr ? 'd MMMM EEEE' : withMonth ? 'EEEE d MMMM' : 'EEEE d';
  if (!isSameYear(date, now)) pattern = tr ? 'd MMMM yyyy EEEE' : `${pattern} yyyy`;
  return capitalize(format(date, pattern, { locale: getDateFnsLocale() }));
}

/** Day header: "Today, Monday 9", "Yesterday, Sunday 8", "Saturday 7". */
export function dayHeading(date: Date, now: Date = new Date()): string {
  const d = weekdayDate(date, now);
  if (isSameDay(date, now)) return i18n.t('ui.journal.day.today', { date: d });
  if (isSameDay(date, addDays(now, -1))) return i18n.t('ui.journal.day.yesterday', { date: d });
  return d;
}

/** Long date for the entry sheet subtitle and the picked-day row: "Monday 9 November". */
export function longDate(date: Date, now: Date = new Date()): string {
  const tr = getCurrentLocale() === 'tr';
  let pattern = tr ? 'd MMMM EEEE' : 'EEEE d MMMM';
  if (!isSameYear(date, now)) pattern = tr ? 'd MMMM yyyy EEEE' : `${pattern} yyyy`;
  return capitalize(format(date, pattern, { locale: getDateFnsLocale() }));
}

/** Right side of a day header: "2 taken", or "1 dose" when nothing was taken that day. */
export function dayCountLabel(counts: JournalCounts): string {
  const taken = counts.taken + counts.partial;
  return taken > 0
    ? i18n.t('ui.journal.summary.taken', { count: taken })
    : i18n.t('ui.journal.day.doses', { count: counts.total });
}

/** "11 doses this week · 9 taken · 1 partial · 1 skipped" (zero counts left out). */
export function summaryText(counts: JournalCounts, range: RangeKey): string {
  const lead = i18n.t(`ui.journal.summary.lead.${range === 'all' ? 'all' : `d${range}`}`, {
    count: counts.total,
  });
  const parts = [lead];
  if (counts.taken > 0) parts.push(i18n.t('ui.journal.summary.taken', { count: counts.taken }));
  if (counts.partial > 0)
    parts.push(i18n.t('ui.journal.summary.partial', { count: counts.partial }));
  if (counts.skipped > 0)
    parts.push(i18n.t('ui.journal.summary.skipped', { count: counts.skipped }));
  return parts.join(' · ');
}

/** Status word: Taken / Partial / Skipped. */
export function statusLabel(action: IntakeAction): string {
  return i18n.t(`ui.journal.actions.${action}`);
}

/** "when needed" / "logged later" for an entry without a planned time. */
export function unscheduledLabel(medication?: Medication): string {
  return i18n.t(medication?.isPrn ? 'ui.journal.row.asNeeded' : 'ui.journal.row.loggedLater');
}

/**
 * "1 pill · planned 20:00" / "when needed" / "planned 08:00 · Felt unwell" (amount only for taken
 * and partial; a skipped dose's reason at the end).
 */
export function entryDetail(
  log: IntakeLog,
  medication: Medication | undefined,
  formatTime: (d: Date) => string
): string {
  const parts: string[] = [];
  if (log.action !== 'skipped' && log.dosageAmount > 0) {
    parts.push(formatDose(log.dosageAmount, medication?.dosageUnit ?? 'units'));
  }
  parts.push(
    log.scheduledTime
      ? i18n.t('ui.journal.row.planned', { time: formatTime(new Date(log.scheduledTime)) })
      : unscheduledLabel(medication)
  );
  // A skipped dose's note is its reason ("Felt unwell"): part of the detail line.
  const reason = skipReason(log);
  if (reason) parts.push(reason);
  return parts.join(' · ');
}

/** The reason of a skipped dose (its note), or null. */
export function skipReason(log: IntakeLog): string | null {
  return log.action === 'skipped' && log.notes?.trim() ? log.notes.trim() : null;
}

/** A note shown in quotes. */
export function quoted(note: string): string {
  return i18n.t('ui.journal.row.quoted', { note });
}
