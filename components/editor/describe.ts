/**
 * Plain-language schedule text for the editor (weekday names from the date-fns locale, times in
 * the profile's 12/24 h clock).
 *
 * @example
 * describeSchedule('specific_weekdays', { weekdays: [1, 3, 5], time: '08:00' }, fmt)
 * // → "Every Mon, Wed and Fri at 08:00"
 */
import { format, isSameYear } from 'date-fns';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { formatDose, formatShortDate } from '@/lib/ui/format';
import type { DosageUnit, ScheduleType } from '@/types';
import {
  hasAmountOverride,
  sortTimes,
  type AnyScheduleConfig,
  type MedicineForm,
  type ScheduleConfigMap,
  tracksSupply,
} from './form-model';

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

/** "9 Nov" (with the year when it isn't this year), for dated previews. */
export function dayMonth(d: Date, now: Date = new Date()): string {
  return format(d, isSameYear(d, now) ? 'd MMM' : 'd MMM yyyy', { locale: getDateFnsLocale() });
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

/** "Every day" for both daily types (the editor offers them as one choice). */
export function scheduleTypeTitle(type: ScheduleType): string {
  const choice = type === 'once_daily' || type === 'multiple_daily' ? 'daily' : type;
  return t(`type.${choice}.title`);
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

/**
 * The "Times" row value for every-day medicines on one line ("08:00 and 20:00"); null for other
 * types (they keep the full sentence) or more than three times (too long for one line).
 */
export function reviewTimesValue(
  type: ScheduleType,
  config: AnyScheduleConfig,
  fmt: (time: string) => string
): string | null {
  if (type !== 'once_daily' && type !== 'multiple_daily') return null;
  const c = config as { time?: string; times?: { time: string }[] };
  const times =
    type === 'once_daily' ? (c.time ? [c.time] : []) : sortTimes(c.times ?? []).map((x) => x.time);
  if (!times.length || times.length > 3) return null;
  return joinList(times.map(fmt));
}

export type UnsetExtra = 'notes' | 'limits' | 'expiry';

/**
 * Which optional extras are set, and which of notes / safety limits / expiry date are not (the
 * last row names only those). "Safety limits" counts as unset only when neither limit is set.
 */
export function extrasSet(form: MedicineForm) {
  const set = {
    notes: form.notes.trim().length > 0,
    maxPerDay: form.maxDailyDose !== null,
    minHours: form.minHoursBetweenDoses !== null,
    expiry: form.expirationDate !== null,
    dnd: form.bypassDnd,
  };
  const unsetItems: UnsetExtra[] = [];
  if (!set.notes) unsetItems.push('notes');
  if (!set.maxPerDay && !set.minHours) unsetItems.push('limits');
  if (!set.expiry) unsetItems.push('expiry');
  return { ...set, anySet: Object.values(set).some(Boolean), unsetItems };
}

/** "Safety limits, expiry date" (first item capitalised). */
export function unsetExtrasText(items: UnsetExtra[]): string {
  const text = items.map((k) => i18n.t(`ui.editor.screens.unset.${k}`)).join(', ');
  return text.charAt(0).toLocaleUpperCase(getCurrentLocale()) + text.slice(1);
}

/**
 * The times of a schedule that runs every day with the same amount each time (every day, several
 * times a day without per-time amounts, or all seven weekdays), sorted. Null otherwise.
 */
export function everyDayTimes(
  type: ScheduleType,
  config: AnyScheduleConfig,
  usualAmount?: number
): string[] | null {
  switch (type) {
    case 'once_daily':
      return [(config as ScheduleConfigMap['once_daily']).time];
    case 'multiple_daily': {
      const times = sortTimes((config as ScheduleConfigMap['multiple_daily']).times ?? []);
      if (!times.length || times.some((x) => hasAmountOverride(x.dosageAmount, usualAmount)))
        return null;
      return times.map((x) => x.time);
    }
    case 'specific_weekdays': {
      const c = config as ScheduleConfigMap['specific_weekdays'];
      return (c.weekdays ?? []).length === 7 ? [c.time] : null;
    }
    default:
      return null;
  }
}

/** "1 pill at 08:00 and 20:00, every day" when it runs daily with one amount, else null. */
export function everyDayLine(
  form: Pick<MedicineForm, 'scheduleType' | 'scheduleConfig' | 'dosageAmount' | 'dosageUnit'>,
  fmt: (time: string) => string
): string | null {
  const times = everyDayTimes(form.scheduleType, form.scheduleConfig, form.dosageAmount);
  if (!times) return null;
  return t('screens.headerDaily', {
    dose: formatDose(form.dosageAmount, form.dosageUnit),
    times: joinList(times.map(fmt)),
  });
}

/** "When 7 days are left" / "When 10 doses are left" / "Off". */
export function refillValue(form: MedicineForm): string {
  if (!tracksSupply(form) || form.refillReminderType === 'none') return t('review.off');
  const count = form.refillReminderValue ?? 0;
  return form.refillReminderType === 'days'
    ? t('review.refillDaysLeft', { count })
    : t('review.refillDosesLeft', { count });
}

/** "4 pills a day · 6 hours apart · Expires Fri 3 Jul", or null when no limit is set. */
export function limitsSummary(form: MedicineForm): string | null {
  const parts = [
    form.maxDailyDose !== null
      ? t('edit.perDay', { amount: formatDose(form.maxDailyDose, form.dosageUnit) })
      : null,
    form.minHoursBetweenDoses !== null
      ? t('edit.apart', { hours: t('count.hours', { count: form.minHoursBetweenDoses }) })
      : null,
    form.expirationDate ? t('edit.expires', { date: formatShortDate(form.expirationDate) }) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
