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
 * medicineDisplayName(med);                // "Metformin 500 mg"
 * nextUnloggedDose(med, logs, now);        // skips doses already taken / skipped early
 */
import { addDays, differenceInCalendarDays, format, isSameYear, startOfDay } from 'date-fns';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import {
  getAllDosesForDate,
  getScheduleDescription,
  type ScheduledDose,
} from '@/lib/schedule/calculator';
import { doseKey, indexLogs } from '@/components/today/logic';
import { getRunningLowStatus, type RunningLowStatus } from '@/lib/medications/refill';
import { formatDose, formatNumber, formatUnit } from '@/lib/ui/format';
import type { InventoryAdjustment } from '@/lib/db/operations';
import type { IntakeLog, Medication } from '@/types';
import { daysOfSupply, paceLabel } from './schedule-summary';

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

/**
 * How a medicine is named everywhere it is identified: "Metformin 500 mg" (the strength is
 * optional free text from the box). Pure, safe for Today / PDF / previews.
 */
export function medicineDisplayName(med: { name: string; strength?: string | null }): string {
  const name = med.name.trim();
  const strength = med.strength?.trim();
  return strength ? `${name} ${strength}` : name;
}

/** How far ahead to look for the next dose (same horizon as `getNextDose`). */
const NEXT_DOSE_DAYS = 30;

/**
 * The next scheduled dose after `now` that has no log yet (taken, partial or skipped). Uses the
 * same occurrences and log matching as Today (`getAllDosesForDate` + `indexLogs` by scheduled
 * time), so a 20:00 dose recorded early at 14:36 no longer shows as "next". Null for as-needed or
 * paused medicines, or when nothing is due in the next 30 days.
 */
export function nextUnloggedDose(
  med: Medication,
  logs: IntakeLog[],
  now: Date = new Date()
): ScheduledDose | null {
  if (med.isPrn || !med.isActive) return null;
  const index = indexLogs(logs.filter((l) => l.medicationId === med.id));
  const first = startOfDay(now);
  for (let i = 0; i <= NEXT_DOSE_DAYS; i++) {
    for (const dose of getAllDosesForDate([med], addDays(first, i))) {
      if (dose.time.getTime() <= now.getTime()) continue;
      if (index.has(doseKey(dose.medicationId, dose.time))) continue;
      return dose;
    }
  }
  return null;
}

/**
 * Which scheduled dose a log was recorded for, when that is worth saying: "Recorded for today's
 * 20:00 dose". Null for as-needed logs (no scheduled time).
 */
export function loggedForLine(
  log: IntakeLog,
  formatTime: (d: Date) => string,
  now = new Date()
): string | null {
  if (!log.scheduledTime) return null;
  const scheduled = new Date(log.scheduledTime);
  const { key, day } = dayPart(scheduled, now);
  return t(`page.loggedFor.${key}`, { day, time: formatTime(scheduled) });
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
  /** False when the person chose not to count this medicine (no warnings, no bar). */
  tracked: boolean;
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
  /** "24 pills" / "84 doses" (no "left"). */
  amount: string;
  /** Days the supply lasts at the current schedule (null = unknown, e.g. as needed). */
  daysLeft: number | null;
  /** "about 2 weeks" (lower case) or null. */
  pace: string | null;
  /** "Refill soon": a refill reminder is set and its threshold is reached. */
  refillSoon: boolean;
  /**
   * Draw the supply in the amber "refill soon" treatment: only when `refillSoon`, or when a
   * tracked count is 0 ("None left") on an active medicine. Otherwise the count is neutral.
   */
  warn: boolean;
  /** List card line: "29 pills left, about 2 weeks" / "6 pills left, refill soon". */
  line: string;
}

export function getSupplyState(med: Medication, now = new Date()): SupplyState {
  const tracked = med.trackSupply !== false;
  const status = tracked ? getRunningLowStatus(med, now) : null;
  const count = Math.max(0, med.inventoryCount ?? 0);
  const hasReminder = tracked && !!med.refillReminderType && !!med.refillReminderValue;
  const empty = tracked && med.isActive && count <= 0;
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

  const amount =
    dosesLeft !== null
      ? t('supply.doseCount', { count: dosesLeft })
      : formatDose(count, med.dosageUnit);
  const daysLeft = tracked ? daysOfSupply(med, count, now) : null;
  const pace = tracked && count > 0 ? paceLabel(daysLeft) : null;
  const refillSoon = tracked && count > 0 && hasReminder && low;
  const warn = tracked && med.isActive && (refillSoon || count <= 0);
  const line = !tracked
    ? t('list.supplyNotTracked')
    : count <= 0
      ? t('list.supplyNone')
      : refillSoon
        ? t('list.supplyLow', { amount })
        : pace
          ? t('list.supplyPace', { amount, pace })
          : t('list.supplyPlain', { amount });

  return {
    tracked,
    amount,
    daysLeft,
    pace,
    refillSoon,
    warn,
    line,
    show: count > 0 || hasReminder || med.isActive,
    count,
    leftLabel: t('supply.left', { amount }),
    dosesLeft,
    amountLabel: byDoses ? `${formatGrouped(count)} ${formatUnit(count, med.dosageUnit)}` : null,
    progress: tracked && packageSize ? Math.min(1, count / packageSize) : null,
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

/**
 * Bar value for a tracked supply: the count against the pack size. Null without a pack size (a
 * bar needs a baseline to mean anything; the count and pace are shown as text instead) or when
 * the supply isn't tracked.
 */
export function supplyProgress(supply: SupplyState): number | null {
  if (!supply.tracked) return null;
  return supply.progress;
}

/** A dose limit (most in one day or time between doses) is set. */
export function medicineHasLimits(
  med: Pick<Medication, 'maxDailyDose' | 'minHoursBetweenDoses'>
): boolean {
  return !!(med.maxDailyDose || med.minHoursBetweenDoses);
}

/** A note, a limit or an expiry date is set. */
export function medicineHasExtras(
  med: Pick<Medication, 'notes' | 'maxDailyDose' | 'minHoursBetweenDoses' | 'expirationDate'>
): boolean {
  return !!(
    med.notes?.trim() ||
    med.maxDailyDose ||
    med.minHoursBetweenDoses ||
    med.expirationDate
  );
}

const SUPPLY_REASONS = ['refill', 'lost', 'correction', 'other'];

/**
 * The "Last change" value for the supply card: "+30 pills (Refill) · 9 Nov" (no brackets without
 * a reason; the year only when it isn't this year).
 */
export function lastChangeValue(
  adjustment: Pick<InventoryAdjustment, 'previousCount' | 'newCount' | 'reason' | 'createdAt'>,
  unit: Medication['dosageUnit'],
  now: Date = new Date()
): string {
  const delta = Math.round((adjustment.newCount - adjustment.previousCount) * 100) / 100;
  const sign = delta > 0 ? '+' : delta < 0 ? '\u2212' : '';
  const change = `${sign}${formatDose(Math.abs(delta), unit)}`;
  const date = new Date(adjustment.createdAt);
  const day = format(date, isSameYear(date, now) ? 'd MMM' : 'd MMM yyyy', {
    locale: getDateFnsLocale(),
  });
  const reason =
    adjustment.reason && SUPPLY_REASONS.includes(adjustment.reason)
      ? t(`supplySheet.reasons.${adjustment.reason}`)
      : null;
  return reason
    ? t('supply.lastChangeWithReason', { change, reason, date: day })
    : t('supply.lastChangeValue', { change, date: day });
}
