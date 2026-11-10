/**
 * Plain-language schedule and supply bits shared by the Medicines list, the medicine page and the
 * add / edit flow: the reminder times of a schedule, which compartments (Morning, Midday, Evening,
 * Night) they fall in, a short line such as "morning and evening", and the supply pace
 * ("about 2 weeks"). Pure functions apart from i18n, so they are unit-tested.
 *
 * @example
 * const times = scheduleTimes('multiple_daily', config);            // ['08:00', '20:00']
 * compartmentsOf(times, boundaries);                                 // ['morning', 'evening']
 * shortSchedule('multiple_daily', config, boundaries, fmt, 'pills'); // "morning and evening"
 * paceLabel(15);                                                     // "about 2 weeks"
 */
import i18n, { getCurrentLocale } from '@/lib/i18n';
import {
  COMPARTMENT_ORDER,
  compartmentFor,
  compartmentLabelKey,
} from '@/lib/settings/compartments';
import { formatDose, formatNumber, formatUnit } from '@/lib/ui/format';
import { getRunningLowStatus } from '@/lib/medications/refill';
import type {
  CompartmentBoundaries,
  CompartmentId,
  DosageUnit,
  Medication,
  ScheduleType,
} from '@/types';
import {
  everyXHoursTimes,
  isValidTime,
  normalizeConfig,
  sortTimes,
  timeToMinutes,
  type AnyScheduleConfig,
  type ScheduleConfigMap,
} from '@/components/editor/form-model';
import { describeSchedule, everyDayLine, joinList } from '@/components/editor/describe';

/** Schedule types that repeat every day at fixed times (shown as compartments). */
const DAILY_TYPES: ScheduleType[] = ['once_daily', 'multiple_daily'];

export function capitalize(s: string): string {
  return s.length ? s.charAt(0).toLocaleUpperCase(getCurrentLocale()) + s.slice(1) : s;
}

function lowerFirst(s: string): string {
  return s.length ? s.charAt(0).toLocaleLowerCase(getCurrentLocale()) + s.slice(1) : s;
}

/** The stored config of a medicine, completed with defaults (never throws). */
export function configOf(
  med: Pick<Medication, 'scheduleType' | 'scheduleConfig' | 'dosageAmount'>
) {
  let raw: unknown = {};
  try {
    raw = JSON.parse(med.scheduleConfig);
  } catch {
    raw = {};
  }
  return normalizeConfig(med.scheduleType, raw, { dosageAmount: med.dosageAmount });
}

/** Reminder times of day ("HH:mm", sorted, unique) for a schedule. As needed → []. */
export function scheduleTimes(type: ScheduleType, config: AnyScheduleConfig): string[] {
  let times: string[] = [];
  switch (type) {
    case 'prn':
      return [];
    case 'multiple_daily':
      times = sortTimes((config as ScheduleConfigMap['multiple_daily']).times ?? []).map(
        (t) => t.time
      );
      break;
    case 'every_x_hours':
      times = everyXHoursTimes(config as ScheduleConfigMap['every_x_hours']);
      break;
    default: {
      const time = (config as { time?: unknown }).time;
      times = isValidTime(time) ? [time] : [];
    }
  }
  const unique = [...new Set(times.filter(isValidTime))];
  return unique.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

/**
 * Compartments the times fall in, in day order, when each compartment holds at most one time.
 * Null when there are no times or two times share a compartment (then show the times instead).
 */
export function compartmentsOf(
  times: string[],
  boundaries?: CompartmentBoundaries
): CompartmentId[] | null {
  if (!times.length) return null;
  const ids = times.map((t) => compartmentFor(t, boundaries));
  if (new Set(ids).size !== ids.length) return null;
  return COMPARTMENT_ORDER.filter((id) => ids.includes(id));
}

/** Compartment name for use mid-sentence ("morning"). */
export function compartmentWord(id: CompartmentId): string {
  return i18n.t(compartmentLabelKey(id)).toLocaleLowerCase(getCurrentLocale());
}

/** Slots for `MiniTray`: the four compartments with the formatted times inside each. */
export function traySlots(
  times: string[],
  boundaries: CompartmentBoundaries | undefined,
  fmt: (time: string) => string
): { label: string; times?: string[] }[] {
  return COMPARTMENT_ORDER.map((id) => {
    const inside = times.filter((t) => compartmentFor(t, boundaries) === id).map(fmt);
    return { label: i18n.t(compartmentLabelKey(id)), times: inside.length ? inside : undefined };
  });
}

/**
 * Short schedule line for cards and summaries, starting lower case so it can follow a dose:
 * "every morning", "morning and evening", "every day at 07:30 and 13:30", "every 2 days at 08:00",
 * "only when needed".
 */
export function shortSchedule(
  type: ScheduleType,
  config: AnyScheduleConfig,
  boundaries: CompartmentBoundaries | undefined,
  fmt: (time: string) => string,
  unit: DosageUnit = 'pills'
): string {
  if (DAILY_TYPES.includes(type)) {
    const times = scheduleTimes(type, config);
    const ids = compartmentsOf(times, boundaries);
    if (ids && ids.length === 1) {
      return i18n.t('ui.medicines.list.every', { name: compartmentWord(ids[0]) });
    }
    if (ids) return joinList(ids.map(compartmentWord));
    if (times.length) {
      return lowerFirst(
        i18n.t('ui.editor.describe.once_daily', { time: joinList(times.map(fmt)) })
      );
    }
  }
  return lowerFirst(describeSchedule(type, config, fmt, unit));
}

/**
 * Dose and schedule in one plain line, as on the review header and the medicine page: "1 pill at
 * 08:00 and 20:00, every day"; other schedules "1 pill, every 2 days at 08:00".
 */
export function scheduleLine(
  form: {
    scheduleType: ScheduleType;
    scheduleConfig: AnyScheduleConfig;
    dosageAmount: number;
    dosageUnit: DosageUnit;
  },
  boundaries: CompartmentBoundaries | undefined,
  fmt: (time: string) => string
): string {
  return (
    everyDayLine(form, fmt) ??
    i18n.t('ui.editor.screens.headerLine', {
      dose: formatDose(form.dosageAmount, form.dosageUnit),
      schedule: shortSchedule(
        form.scheduleType,
        form.scheduleConfig,
        boundaries,
        fmt,
        form.dosageUnit
      ),
    })
  );
}

/** `shortSchedule` for a stored medicine. */
export function medicineSchedule(
  med: Medication,
  boundaries: CompartmentBoundaries | undefined,
  fmt: (time: string) => string
): string {
  if (med.isPrn) return lowerFirst(i18n.t('ui.editor.describe.prn'));
  return shortSchedule(med.scheduleType, configOf(med), boundaries, fmt, med.dosageUnit);
}

// ---------------------------------------------------------------------------------------------
// Supply pace

/**
 * Whole days the supply lasts at the current schedule (same estimate as the refill reminder),
 * 0 when empty, null when unknown (as needed, or a schedule without doses).
 */
export function daysOfSupply(
  med: Medication,
  count: number = med.inventoryCount ?? 0,
  now: Date = new Date()
): number | null {
  if (med.isPrn || med.scheduleType === 'prn') return null;
  if (!(count > 0)) return 0;
  const status = getRunningLowStatus(
    { ...med, inventoryCount: count, refillReminderType: 'days', refillReminderValue: 1 },
    now
  );
  return status?.remainingDays ?? null;
}

/** "runs out today", "about 9 days", "about 2 weeks", "about 3 months" (lower case). */
export function paceLabel(days: number | null): string | null {
  if (days === null || !Number.isFinite(days)) return null;
  if (days <= 0) return i18n.t('ui.medicines.pace.today');
  if (days < 14) return i18n.t('ui.medicines.pace.days', { count: Math.round(days) });
  if (days < 60) return i18n.t('ui.medicines.pace.weeks', { count: Math.round(days / 7) });
  return i18n.t('ui.medicines.pace.months', { count: Math.round(days / 30) });
}

/**
 * Visible "12 now → 42 after · about 3 weeks" and the spoken
 * "12 pills now, 42 after, about 3 weeks".
 */
export function supplySummary(
  med: Medication,
  from: number,
  to: number
): { text: string; a11y: string } {
  const values = { from: formatNumber(from), to: formatNumber(to) };
  const text = i18n.t('ui.medicines.sheet.summary', values);
  const a11y = i18n.t('ui.medicines.sheet.summaryA11y', {
    ...values,
    unit: formatUnit(from, med.dosageUnit),
  });
  const pace = to > 0 ? paceLabel(daysOfSupply(med, to)) : null;
  return pace ? { text: `${text} · ${pace}`, a11y: `${a11y}, ${pace}` } : { text, a11y };
}
