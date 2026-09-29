/**
 * Plain-language schedule text for the editor (weekday names from the date-fns locale, times in
 * the profile's 12/24 h clock).
 *
 * @example
 * describeSchedule('specific_weekdays', { weekdays: [1, 3, 5], time: '08:00' }, fmt)
 * // → "Every Mon, Wed and Fri at 08:00"
 */
import { format } from 'date-fns';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { formatDose, formatShortDate } from '@/lib/ui/format';
import type { DosageUnit, ScheduleType } from '@/types';
import { sortTimes, type AnyScheduleConfig, type ScheduleConfigMap } from './form-model';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.${key}`, opts);

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toLocaleUpperCase(getCurrentLocale()) + s.slice(1) : s;
}

// 7 Jan 2024 is a Sunday, so index = JS weekday (0 = Sunday).
const weekdayDate = (d: number) => new Date(2024, 0, 7 + d);

/** "Monday" (localized). `inline` keeps the locale's own casing for use mid-sentence. */
export function weekdayName(d: number, inline = false): string {
  const s = format(weekdayDate(d), 'EEEE', { locale: getDateFnsLocale() });
  return inline ? s : capitalize(s);
}

/** "Mon" (Dutch uses the 2-letter form: "ma"). */
export function weekdayShort(d: number, inline = false): string {
  const pattern = getCurrentLocale() === 'nl' ? 'EEEEEE' : 'EEE';
  const s = format(weekdayDate(d), pattern, { locale: getDateFnsLocale() });
  return inline ? s : capitalize(s);
}

/** Two-letter label for round toggles ("Mo"). */
export function weekdayMini(d: number): string {
  return capitalize(format(weekdayDate(d), 'EEEEEE', { locale: getDateFnsLocale() }));
}

/** JS weekday numbers in the locale's week order (Mon first for nl/tr/en-GB style locales). */
export function weekdayOrder(): number[] {
  // Same source as the design system's CalendarSheet (getWeekStartsOn), kept local so this file
  // stays free of React Native imports.
  const start = getDateFnsLocale().options?.weekStartsOn ?? 0;
  return Array.from({ length: 7 }, (_, i) => (start + i) % 7);
}

/** "a, b and c". */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(t('describe.listJoin'))}${t('describe.listLast')}${items[items.length - 1]}`;
}

export function occurrenceWord(n: number): string {
  return t(`occurrence.word.${n}`);
}

export function occurrenceShort(n: number): string {
  return t(`occurrence.short.${n}`);
}

export function scheduleTypeTitle(type: ScheduleType): string {
  return t(`type.${type}.title`);
}

/**
 * One friendly sentence for a schedule, e.g. "Every 2 days at 08:00".
 * `fmt` formats "HH:mm" in the user's clock (from `useTimeFormat().formatTimeString`).
 */
export function describeSchedule(
  type: ScheduleType,
  config: AnyScheduleConfig,
  fmt: (time: string) => string,
  unit: DosageUnit = 'pills'
): string {
  switch (type) {
    case 'once_daily': {
      const c = config as ScheduleConfigMap['once_daily'];
      return t('describe.once_daily', { time: fmt(c.time) });
    }
    case 'multiple_daily': {
      const c = config as ScheduleConfigMap['multiple_daily'];
      const times = sortTimes(c.times ?? []).map((x) => fmt(x.time));
      return t('describe.multiple_daily', { count: times.length, times: joinList(times) });
    }
    case 'every_x_days': {
      const c = config as ScheduleConfigMap['every_x_days'];
      return t('describe.every_x_days', { count: c.intervalDays, time: fmt(c.time) });
    }
    case 'specific_weekdays': {
      const c = config as ScheduleConfigMap['specific_weekdays'];
      const days = c.weekdays ?? [];
      if (!days.length) return t('describe.specific_weekdays_none');
      if (days.length === 7) return t('describe.specific_weekdays_all', { time: fmt(c.time) });
      const order = weekdayOrder();
      const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      return t('describe.specific_weekdays', {
        days: joinList(sorted.map((d) => weekdayShort(d, true))),
        time: fmt(c.time),
      });
    }
    case 'xth_weekday': {
      const c = config as ScheduleConfigMap['xth_weekday'];
      return t('describe.xth_weekday', {
        occurrence: occurrenceWord(c.occurrence),
        weekday: weekdayName(c.weekday, true),
        time: fmt(c.time),
      });
    }
    case 'cycle': {
      const c = config as ScheduleConfigMap['cycle'];
      if (c.daysOff === 0) return t('describe.cycle_noBreak', { time: fmt(c.time) });
      return t('describe.cycle', {
        on: t('count.days', { count: c.daysOn }),
        off: t('count.days', { count: c.daysOff }),
        time: fmt(c.time),
      });
    }
    case 'every_x_hours': {
      const c = config as ScheduleConfigMap['every_x_hours'];
      return t('describe.every_x_hours', { count: c.intervalHours, time: fmt(c.firstDoseTime) });
    }
    case 'tapering': {
      const c = config as ScheduleConfigMap['tapering'];
      return t('describe.tapering', {
        start: formatDose(c.startDose, unit),
        step: formatDose(c.decrementAmount, unit),
        days: t('count.days', { count: c.decrementIntervalDays }),
      });
    }
    case 'prn':
      return t('describe.prn');
  }
}

/** "Starts Mon 5 Oct" for types with a start date, else null. */
export function describeStart(type: ScheduleType, config: AnyScheduleConfig): string | null {
  const c = config as Record<string, unknown>;
  const iso =
    type === 'cycle'
      ? c.cycleStartDate
      : type === 'every_x_days' || type === 'tapering'
        ? c.startDate
        : null;
  if (typeof iso !== 'string') return null;
  return t('describe.startsOn', { date: formatShortDate(new Date(iso)) });
}
