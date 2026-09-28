/**
 * Locale-aware formatting helpers for the redesign.
 *
 * @example
 * const { formatTime, formatTimeString, is24h } = useTimeFormat();
 * formatTime(new Date());            // "08:00" or "8:00 AM"
 * formatTimeString('20:30');         // "20:30" or "8:30 PM"
 * formatDayLabel(date);              // "Today" | "Tomorrow" | "Yesterday" | "Friday"
 * formatLongDate(date);              // "Friday, 3 July" (nl: "Vrijdag 3 juli", tr: "3 Temmuz Cuma")
 * formatShortDate(date);             // "Fri 3 Jul"
 * formatDose(1, 'pills');            // "1 pill"; formatDose(500, 'milligrams') → "500 mg"
 * formatNumber(1.5);                 // "1.5" (nl/tr: "1,5")
 */
import { useCallback, useMemo } from 'react';
import { format, isSameDay, isSameYear, addDays } from 'date-fns';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { useStore } from '@/store';
import type { DosageUnit } from '@/types';

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toLocaleUpperCase(getCurrentLocale()) + s.slice(1) : s;
}

/** Format a Date as a time of day. */
export function formatTime(date: Date, is24h: boolean = true): string {
  return format(date, is24h ? 'HH:mm' : 'h:mm a', { locale: getDateFnsLocale() });
}

/** Parse "HH:mm" (24h) into a Date today. Returns null when malformed. */
export function parseTimeString(time: string, base: Date = new Date()): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const d = new Date(base);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

/** Format an "HH:mm" (24h) string in the requested clock. Returns the input when malformed. */
export function formatTimeString(time: string, is24h: boolean = true): string {
  const d = parseTimeString(time);
  return d ? formatTime(d, is24h) : time;
}

/** Reads the active profile's 24-hour preference (default: 24h). */
export function useTimeFormat() {
  const is24h = useStore((s) => s.activeProfile?.settings?.use24HourTime ?? true);
  const fmtTime = useCallback((date: Date) => formatTime(date, is24h), [is24h]);
  const fmtTimeString = useCallback((time: string) => formatTimeString(time, is24h), [is24h]);
  return useMemo(
    () => ({ is24h, formatTime: fmtTime, formatTimeString: fmtTimeString }),
    [is24h, fmtTime, fmtTimeString]
  );
}

/** "Today" / "Tomorrow" / "Yesterday" or the capitalised weekday name. */
export function formatDayLabel(date: Date, now: Date = new Date()): string {
  if (isSameDay(date, now)) return i18n.t('ui.common.today');
  if (isSameDay(date, addDays(now, 1))) return i18n.t('ui.common.tomorrow');
  if (isSameDay(date, addDays(now, -1))) return i18n.t('ui.common.yesterday');
  return capitalize(format(date, 'EEEE', { locale: getDateFnsLocale() }));
}

/** "Friday, 3 July" (year appended when not the current year). */
export function formatLongDate(date: Date, now: Date = new Date()): string {
  const locale = getCurrentLocale();
  let pattern = locale === 'tr' ? 'd MMMM EEEE' : locale === 'nl' ? 'EEEE d MMMM' : 'EEEE, d MMMM';
  if (!isSameYear(date, now)) pattern = locale === 'tr' ? 'd MMMM yyyy EEEE' : `${pattern} yyyy`;
  return capitalize(format(date, pattern, { locale: getDateFnsLocale() }));
}

/** "Fri 3 Jul" (year appended when not the current year). */
export function formatShortDate(date: Date, now: Date = new Date()): string {
  const pattern = isSameYear(date, now) ? 'EEE d MMM' : 'EEE d MMM yyyy';
  return capitalize(format(date, pattern, { locale: getDateFnsLocale() }));
}

/** Number with at most 2 decimals, trailing zeros trimmed, locale decimal separator. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '';
  const rounded = Math.round(n * 100) / 100;
  const s = String(rounded);
  const locale = getCurrentLocale();
  return locale === 'nl' || locale === 'tr' ? s.replace('.', ',') : s;
}

/** Localized unit word for an amount ("pill" / "pills" / "mg"). */
export function formatUnit(amount: number, unit: DosageUnit | string): string {
  return i18n.t(`ui.common.units.${unit}`, { count: amount, defaultValue: unit });
}

/** "1 pill", "2 pills", "0.5 pills", "500 mg". */
export function formatDose(amount: number, unit: DosageUnit | string): string {
  return `${formatNumber(amount)} ${formatUnit(amount, unit)}`;
}
