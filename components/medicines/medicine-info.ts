/**
 * Pure helpers that turn a `Medication` into plain-language bits for the Medicines screens
 * (schedule summary, next/last dose labels, supply and expiry state). No DB access, so they are
 * safe to use with mock data.
 *
 * @example
 * const { formatTime, formatTimeString } = useTimeFormat();
 * describeSchedule(med, formatTimeString); // "Every day at 08:00"
 * nextDoseLine(date, formatTime);          // "Next today at 20:00"
 * getSupplyState(med);                     // { show, low, empty, progress, daysLeft, … }
 */
import { differenceInCalendarDays, format, isSameYear } from 'date-fns';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { getScheduleDescription } from '@/lib/schedule/calculator';
import { getRunningLowStatus, type RunningLowStatus } from '@/lib/medications/refill';
import { formatDose, formatNumber, formatUnit } from '@/lib/ui/format';
import type { IntakeLog, Medication } from '@/types';

const t = (key: string, options?: Record<string, unknown>) =>
  i18n.t(`ui.medicines.${key}`, options);

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toLocaleUpperCase(getCurrentLocale()) + s.slice(1) : s;
}

function parseConfig(med: Medication): Record<string, any> | null {
  try {
    const parsed = JSON.parse(med.scheduleConfig);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** Localized weekday name for 0=Sunday … 6=Saturday. */
function weekdayName(index: number, length: 'short' | 'long'): string {
  // 7 January 2024 is a Sunday.
  const d = new Date(2024, 0, 7 + index);
  // Dutch short names read best as "ma, wo" (date-fns 'EEE' gives "maa").
  const pattern = length === 'long' ? 'EEEE' : getCurrentLocale() === 'nl' ? 'EEEEEE' : 'EEE';
  return format(d, pattern, { locale: getDateFnsLocale() });
}

function listTimes(times: string[], formatTimeString: (t: string) => string): string {
  return times.map(formatTimeString).join(', ');
}

const OCCURRENCES = ['first', 'second', 'third', 'fourth', 'last'] as const;

/**
 * Plain-language schedule ("Every day at 08:00", "Every Mon, Wed at 20:00", "Only when needed").
 * Times follow the 12/24h preference. Falls back to the legacy `getScheduleDescription`.
 */
export function describeSchedule(
  med: Medication,
  formatTimeString: (time: string) => string
): string {
  if (med.isPrn || med.scheduleType === 'prn') return t('schedule.prn');
  const c = parseConfig(med);
  if (!c) return getScheduleDescription(med);
  const time = typeof c.time === 'string' ? formatTimeString(c.time) : '';

  try {
    switch (med.scheduleType) {
      case 'once_daily':
        if (!c.time) break;
        return t('schedule.daily', { time });
      case 'multiple_daily': {
        const times: string[] = (c.times ?? [])
          .map((x: { time?: string }) => x?.time)
          .filter((x: unknown): x is string => typeof x === 'string' && x.length > 0);
        if (times.length === 0) break;
        return t('schedule.timesDaily', {
          count: times.length,
          times: listTimes(times, formatTimeString),
        });
      }
      case 'every_x_days':
        if (!c.intervalDays || !c.time) break;
        return t('schedule.everyXDays', { count: c.intervalDays, time });
      case 'specific_weekdays': {
        const days: number[] = Array.isArray(c.weekdays)
          ? [...c.weekdays].sort((a, b) => a - b)
          : [];
        if (days.length === 0 || !c.time) break;
        if (days.length === 7) return t('schedule.daily', { time });
        // Monday-first reading order.
        const ordered = [...days.filter((d) => d !== 0), ...days.filter((d) => d === 0)];
        return t('schedule.weekdays', {
          days: ordered.map((d) => weekdayName(d, 'short')).join(', '),
          time,
        });
      }
      case 'xth_weekday': {
        const occ = OCCURRENCES[(c.occurrence ?? 1) - 1];
        if (!occ || c.weekday === undefined || !c.time) break;
        return t('schedule.xthWeekday', {
          occurrence: t(`schedule.occurrence.${occ}`),
          weekday: weekdayName(c.weekday, 'long'),
          time,
        });
      }
      case 'cycle':
        if (!c.daysOn || !c.time) break;
        return t('schedule.cycle', {
          on: t('schedule.daysOn', { count: c.daysOn }),
          off: t('schedule.daysOff', { count: c.daysOff ?? 0 }),
          time,
        });
      case 'every_x_hours':
        if (!c.intervalHours || !c.firstDoseTime) break;
        return t('schedule.everyXHours', {
          count: c.intervalHours,
          time: formatTimeString(c.firstDoseTime),
        });
      case 'tapering':
        if (!c.startDose || !c.decrementAmount || !c.decrementIntervalDays) break;
        return t('schedule.tapering', {
          count: c.decrementIntervalDays,
          start: formatDose(c.startDose, med.dosageUnit),
          step: formatDose(c.decrementAmount, med.dosageUnit),
        });
    }
  } catch {
    // fall through
  }
  return getScheduleDescription(med);
}

/** Day word for a date near `now`: today/tomorrow/yesterday key, weekday within a week, else date. */
function dayPart(
  date: Date,
  now: Date
): { key: 'today' | 'tomorrow' | 'yesterday' | 'on'; day?: string } {
  const diff = differenceInCalendarDays(date, now);
  if (diff === 0) return { key: 'today' };
  if (diff === 1) return { key: 'tomorrow' };
  if (diff === -1) return { key: 'yesterday' };
  const locale = getDateFnsLocale();
  if (Math.abs(diff) < 7) return { key: 'on', day: format(date, 'EEEE', { locale }) };
  return {
    key: 'on',
    day: format(date, isSameYear(date, now) ? 'd MMM' : 'd MMM yyyy', { locale }),
  };
}

/** "Today at 20:00", "Monday at 08:00", "12 Oct at 08:00" (standalone, capitalised). */
export function formatWhen(date: Date, formatTime: (d: Date) => string, now = new Date()): string {
  const { key, day } = dayPart(date, now);
  return capitalize(t(`when.${key}`, { day, time: formatTime(date) }));
}

/** "Next today at 20:00" / "Next Monday at 08:00". */
export function nextDoseLine(
  date: Date,
  formatTime: (d: Date) => string,
  now = new Date()
): string {
  const { key, day } = dayPart(date, now);
  const k = key === 'yesterday' ? 'today' : key;
  return t(`next.${k}`, { day, time: formatTime(date) });
}

/** Most recent log where a dose was actually taken (taken or partial), or null. */
export function findLastTaken(logs: IntakeLog[]): IntakeLog | null {
  let best: IntakeLog | null = null;
  for (const log of logs) {
    if (log.action !== 'taken' && log.action !== 'partial') continue;
    if (!best || new Date(log.actualTime).getTime() > new Date(best.actualTime).getTime()) {
      best = log;
    }
  }
  return best;
}

export function isExpired(med: Medication, now = new Date()): boolean {
  return !!med.expirationDate && new Date(med.expirationDate) < now;
}

export interface ExpiryInfo {
  expired: boolean;
  /** Within 30 days and not yet expired. */
  soon: boolean;
  /** "Expires in 12 days" / "Expired 3 days ago". */
  relative: string;
  /** "Use by 12 Oct 2026". */
  date: string;
}

export function getExpiryInfo(med: Medication, now = new Date()): ExpiryInfo | null {
  if (!med.expirationDate) return null;
  const exp = new Date(med.expirationDate);
  if (Number.isNaN(exp.getTime())) return null;
  const expired = exp < now;
  const days = differenceInCalendarDays(exp, now);
  let relative: string;
  if (days > 0) relative = t('safety.expiresIn', { count: days });
  else if (days === 0) relative = t(expired ? 'safety.expiredToday' : 'safety.expiresToday');
  else relative = t('safety.expiredAgo', { count: Math.abs(days) });
  return {
    expired,
    soon: !expired && days <= 30,
    relative,
    date: t('safety.useBy', {
      date: format(exp, 'd MMMM yyyy', { locale: getDateFnsLocale() }),
    }),
  };
}

/** Units measured by mass/volume: their supply reads better as doses ("84 doses left"). */
const MEASURED_UNITS: readonly string[] = ['milligrams', 'grams', 'milliliters'];

/** "42,000" / "42.000" — thousands grouped with the locale's separator. */
function formatGrouped(n: number): string {
  const s = formatNumber(n);
  const comma = getCurrentLocale() === 'nl' || getCurrentLocale() === 'tr';
  const [int, frac] = s.split(comma ? ',' : '.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, comma ? '.' : ',');
  return frac ? `${grouped}${comma ? ',' : '.'}${frac}` : grouped;
}

export interface SupplyState {
  /** Whether the supply is worth showing on the list card. */
  show: boolean;
  count: number;
  /** "24 pills left", or "84 doses left" for mg / g / ml. */
  leftLabel: string;
  /** mg / g / ml with a known dose: whole doses left (else null). */
  dosesLeft: number | null;
  /** mg / g / ml with a known dose: the raw amount, "42,000 mg" (else null). */
  amountLabel: string | null;
  /** 0..1 vs the pack size, or null when no pack size is known. */
  progress: number | null;
  /** "About 12 days left" (only when the refill reminder is day-based). */
  daysLabel: string | null;
  low: boolean;
  empty: boolean;
  status: RunningLowStatus | null;
  /** Running-low sentence for the detail card / sheets, or null. */
  lowMessage: string | null;
  /** "When 7 days are left" / "When 10 doses are left" / "Off". */
  reminderLabel: string;
  tone: 'accent' | 'warning' | 'danger';
}

export function getSupplyState(med: Medication, now = new Date()): SupplyState {
  const status = getRunningLowStatus(med, now);
  const count = Math.max(0, med.inventoryCount ?? 0);
  const hasReminder = !!med.refillReminderType && !!med.refillReminderValue;
  const empty = med.isActive && count <= 0;
  const low = !!status?.isRunningLow;

  let daysLabel: string | null = null;
  if (status?.basis === 'days' && status.remainingDays !== null && count > 0) {
    daysLabel =
      status.remainingDays <= 0
        ? t('supply.runsOutToday')
        : t('supply.daysLeft', { count: status.remainingDays });
  }

  let lowMessage: string | null = null;
  if (empty) lowMessage = t('supply.empty');
  else if (status?.isRunningLow) {
    lowMessage =
      status.basis === 'days'
        ? t('supply.lowDays', {
            days: t('supply.dayCount', { count: status.remainingDays ?? status.threshold }),
            doses: t('supply.doseCount', { count: status.remainingDoses }),
          })
        : t('supply.lowDoses', { doses: t('supply.doseCount', { count: status.remainingDoses }) });
  }

  let reminderLabel = i18n.t('ui.common.off');
  if (hasReminder) {
    reminderLabel =
      med.refillReminderType === 'days'
        ? t('supply.remindDays', { count: med.refillReminderValue })
        : t('supply.remindDoses', { count: med.refillReminderValue });
  }

  const packageSize = med.packageSize && med.packageSize > 0 ? med.packageSize : null;

  const byDoses = MEASURED_UNITS.includes(med.dosageUnit) && med.dosageAmount > 0;
  const dosesLeft = byDoses ? Math.floor(count / med.dosageAmount + 1e-9) : null;

  return {
    show: count > 0 || hasReminder || med.isActive,
    count,
    leftLabel: t('supply.left', {
      amount:
        dosesLeft !== null
          ? t('supply.doseCount', { count: dosesLeft })
          : formatDose(count, med.dosageUnit),
    }),
    dosesLeft,
    amountLabel: byDoses ? `${formatGrouped(count)} ${formatUnit(count, med.dosageUnit)}` : null,
    progress: packageSize ? Math.min(1, count / packageSize) : null,
    daysLabel,
    low,
    empty,
    status,
    lowMessage,
    reminderLabel,
    tone: empty ? 'danger' : low ? 'warning' : 'accent',
  };
}

/** "No more than 4 pills a day". */
export function maxPerDayLabel(med: Medication): string | null {
  if (!med.maxDailyDose) return null;
  return t('safety.maxPerDay', { amount: formatDose(med.maxDailyDose, med.dosageUnit) });
}

/** "At least 6 hours between doses". */
export function minHoursLabel(med: Medication): string | null {
  if (!med.minHoursBetweenDoses) return null;
  return t('safety.minHours', {
    count: med.minHoursBetweenDoses,
    hours: formatNumber(med.minHoursBetweenDoses),
  });
}

export function sortMedicines(meds: Medication[]): Medication[] {
  return [...meds].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
