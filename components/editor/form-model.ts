/**
 * Pure form model for adding / editing a medicine: types, per-type schedule defaults, mappers to the
 * DB inputs and step validation. No React, no i18n (issues are returned as keys) — unit-testable.
 *
 * @example
 * const form = createEmptyForm();                     // add flow
 * const form = formFromMedication(med);              // edit screen
 * validateStep('when', form).ok;                      // gate the Next button
 * await createMedication(toCreateInput(form, profileId));
 */
import { addHours, startOfDay } from 'date-fns';
import type {
  CycleConfig,
  EveryXDaysConfig,
  EveryXHoursConfig,
  MultipleDailyConfig,
  OnceDailyConfig,
  SpecificWeekdaysConfig,
  TaperingConfig,
  XthWeekdayConfig,
} from '@/lib/schedule/calculator';
import type { CreateMedicationInput, UpdateMedicationInput } from '@/lib/db/operations';
import { validateScheduleConfig } from '@/lib/validation/medication';
import type { DosageUnit, Medication, ScheduleType } from '@/types';

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------

export type RefillType = 'none' | 'days' | 'doses';

/** Schedule config shape per schedule type (mirrors lib/schedule/calculator.ts). */
export interface ScheduleConfigMap {
  once_daily: OnceDailyConfig;
  multiple_daily: MultipleDailyConfig;
  every_x_days: EveryXDaysConfig;
  specific_weekdays: SpecificWeekdaysConfig;
  xth_weekday: XthWeekdayConfig;
  cycle: CycleConfig;
  every_x_hours: EveryXHoursConfig;
  tapering: TaperingConfig;
  prn: Record<string, never>;
}

export type AnyScheduleConfig = ScheduleConfigMap[ScheduleType];

export interface MedicineForm {
  name: string;
  /** As printed on the box ("500 mg"). Optional; '' when not set. */
  strength: string;
  imageUri: string | null;
  notes: string;
  dosageAmount: number;
  dosageUnit: DosageUnit;
  scheduleType: ScheduleType;
  scheduleConfig: AnyScheduleConfig;
  inventoryCount: number;
  /**
   * Stored "track supply" flag. The effective value is `tracksSupply(form)`: entering any count
   * turns tracking on; a new medicine left at 0 (or skipped) is not tracked.
   */
  trackSupply: boolean;
  packageSize: number | null;
  refillReminderType: RefillType;
  refillReminderValue: number | null;
  expirationDate: Date | null;
  maxDailyDose: number | null;
  minHoursBetweenDoses: number | null;
  bypassDnd: boolean;
}

export const SCHEDULE_TYPES: ScheduleType[] = [
  'once_daily',
  'multiple_daily',
  'every_x_days',
  'specific_weekdays',
  'xth_weekday',
  'cycle',
  'every_x_hours',
  'tapering',
  'prn',
];

/**
 * What the schedule step offers. "Every day" covers both stored daily types: one time is stored
 * as `once_daily`, two or more as `multiple_daily` (see `storedSchedule`).
 */
export type ScheduleChoice = 'daily' | Exclude<ScheduleType, 'once_daily' | 'multiple_daily'>;

/** Step 3 shows these first ("How often?"). */
export const COMMON_CHOICES: ScheduleChoice[] = ['daily', 'specific_weekdays', 'prn'];
/** The rest, behind "Other schedules", in the spec's order. */
export const OTHER_CHOICES: ScheduleChoice[] = [
  'every_x_days',
  'xth_weekday',
  'cycle',
  'every_x_hours',
  'tapering',
];

/** The choice a stored schedule type belongs to (both daily types → "Every day"). */
export function choiceFor(type: ScheduleType): ScheduleChoice {
  return type === 'once_daily' || type === 'multiple_daily' ? 'daily' : type;
}

/** The schedule type to switch to for a choice (keeps the current daily type for "Every day"). */
export function typeForChoice(choice: ScheduleChoice, current: ScheduleType): ScheduleType {
  if (choice !== 'daily') return choice;
  return choiceFor(current) === 'daily' ? current : 'once_daily';
}

export const DOSAGE_UNITS: DosageUnit[] = [
  'pills',
  'milligrams',
  'grams',
  'milliliters',
  'puffs',
  'drops',
  'patches',
  'units',
];

/** "Measured in" shows these first; the rest sit behind "More…". */
export const COMMON_UNITS: DosageUnit[] = ['pills', 'milliliters', 'puffs', 'drops'];
export const OTHER_UNITS: DosageUnit[] = DOSAGE_UNITS.filter((u) => !COMMON_UNITS.includes(u));

export const NAME_MAX = 100;
export const STRENGTH_MAX = 40;
export const NOTES_MAX = 500;
export const MAX_DAILY_TIMES = 12;
export const DEFAULT_TIME = '08:00';
export const DEFAULT_REFILL_VALUE = 7;

// ---------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------

const TIME_RE = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

export function isValidTime(t: unknown): t is string {
  return typeof t === 'string' && TIME_RE.test(t);
}

/** "HH:mm" (24h) → minutes after midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes after midnight (wrapped to 0..1439) → "HH:mm". */
export function minutesToTime(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Date → "HH:mm" (24h, local). */
export function dateToTime(d: Date): string {
  return minutesToTime(d.getHours() * 60 + d.getMinutes());
}

/** "HH:mm" → Date today at that time (local). */
export function timeToDate(t: string, base: Date = new Date()): Date {
  const d = new Date(base);
  const mins = isValidTime(t) ? timeToMinutes(t) : timeToMinutes(DEFAULT_TIME);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

/** Start of the local day as an ISO string (the shape the validators and calculator expect). */
export function dayToIso(d: Date): string {
  return startOfDay(d).toISOString();
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function isoOr(v: unknown, fallback: string): string {
  return typeof v === 'string' && !Number.isNaN(new Date(v).getTime()) ? v : fallback;
}

// ---------------------------------------------------------------------------------------------
// Schedule defaults
// ---------------------------------------------------------------------------------------------

/**
 * Complete, valid default config for a schedule type (specific_weekdays starts with no days on
 * purpose: the user must pick at least one).
 */
export function defaultConfigFor(
  type: ScheduleType,
  opts: { now?: Date; dosageAmount?: number } = {}
): AnyScheduleConfig {
  const now = opts.now ?? new Date();
  const today = dayToIso(now);
  switch (type) {
    case 'once_daily':
      return { time: DEFAULT_TIME };
    case 'multiple_daily':
      return { times: [{ time: '08:00' }, { time: '20:00' }] };
    case 'every_x_days':
      return { intervalDays: 2, startDate: today, time: DEFAULT_TIME };
    case 'specific_weekdays':
      return { weekdays: [], time: DEFAULT_TIME };
    case 'xth_weekday':
      return { occurrence: 1, weekday: 1, time: DEFAULT_TIME };
    case 'cycle':
      return { daysOn: 21, daysOff: 7, cycleStartDate: today, time: DEFAULT_TIME };
    case 'every_x_hours':
      return { intervalHours: 8, firstDoseTime: DEFAULT_TIME };
    case 'tapering': {
      const start = opts.dosageAmount && opts.dosageAmount > 0 ? opts.dosageAmount : 1;
      // A quarter of the start dose, in 0.5 steps (min 0.5): 4 → 3 → 2 → 1, 1 → 0.5.
      const dec = Math.max(0.5, Math.round((start / 4) * 2) / 2);
      return {
        startDose: start,
        decrementAmount: dec,
        decrementIntervalDays: 7,
        startDate: today,
        time: DEFAULT_TIME,
      };
    }
    case 'prn':
      return {};
  }
}

/**
 * Fill any missing / malformed keys of a (possibly legacy) config with defaults, so every editor
 * always works on a complete object. Valid values are kept as they are.
 */
export function normalizeConfig(
  type: ScheduleType,
  raw: unknown,
  opts: { now?: Date; dosageAmount?: number } = {}
): AnyScheduleConfig {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = defaultConfigFor(type, opts) as unknown as Record<string, unknown>;
  switch (type) {
    case 'once_daily':
      return { time: isValidTime(c.time) ? c.time : (d.time as string) };
    case 'multiple_daily': {
      const times = Array.isArray(c.times)
        ? (c.times as unknown[])
            .map((t) => (t && typeof t === 'object' ? (t as Record<string, unknown>) : null))
            .filter((t): t is Record<string, unknown> => !!t && isValidTime(t.time))
            .map((t) =>
              typeof t.dosageAmount === 'number' && t.dosageAmount > 0
                ? { time: t.time as string, dosageAmount: t.dosageAmount }
                : { time: t.time as string }
            )
        : [];
      return { times: times.length ? sortTimes(times) : (d.times as MultipleDailyConfig['times']) };
    }
    case 'every_x_days':
      return {
        intervalDays: num(c.intervalDays, d.intervalDays as number),
        startDate: isoOr(c.startDate, d.startDate as string),
        time: isValidTime(c.time) ? c.time : (d.time as string),
      };
    case 'specific_weekdays':
      return {
        weekdays: Array.isArray(c.weekdays)
          ? [
              ...new Set(
                (c.weekdays as unknown[]).filter((n): n is number => typeof n === 'number')
              ),
            ]
              .filter((n) => n >= 0 && n <= 6)
              .sort((a, b) => a - b)
          : [],
        time: isValidTime(c.time) ? c.time : (d.time as string),
      };
    case 'xth_weekday':
      return {
        occurrence: num(c.occurrence, d.occurrence as number),
        weekday: num(c.weekday, d.weekday as number),
        time: isValidTime(c.time) ? c.time : (d.time as string),
      };
    case 'cycle':
      return {
        daysOn: num(c.daysOn, d.daysOn as number),
        daysOff: num(c.daysOff, d.daysOff as number),
        cycleStartDate: isoOr(c.cycleStartDate, d.cycleStartDate as string),
        time: isValidTime(c.time) ? c.time : (d.time as string),
      };
    case 'every_x_hours':
      return {
        intervalHours: num(c.intervalHours, d.intervalHours as number),
        firstDoseTime: isValidTime(c.firstDoseTime) ? c.firstDoseTime : (d.firstDoseTime as string),
      };
    case 'tapering':
      return {
        startDose: num(c.startDose, d.startDose as number),
        decrementAmount: num(c.decrementAmount, d.decrementAmount as number),
        decrementIntervalDays: num(c.decrementIntervalDays, d.decrementIntervalDays as number),
        startDate: isoOr(c.startDate, d.startDate as string),
        time: isValidTime(c.time) ? c.time : (d.time as string),
      };
    case 'prn':
      return {};
  }
}

// ---------------------------------------------------------------------------------------------
// Schedule helpers used by editors & previews
// ---------------------------------------------------------------------------------------------

export function sortTimes<T extends { time: string }>(times: T[]): T[] {
  return [...times].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

/** A sensible next time to add to a multiple_daily list: 4 h after the last one, not a duplicate. */
export function nextFreeTime(times: { time: string }[]): string {
  if (!times.length) return DEFAULT_TIME;
  const taken = new Set(times.map((t) => t.time));
  const last = timeToMinutes(sortTimes(times)[times.length - 1].time);
  for (let step = 0; step < 24 * 4; step++) {
    const candidate = minutesToTime(last + 240 + step * 60);
    if (!taken.has(candidate)) return candidate;
  }
  return DEFAULT_TIME;
}

/**
 * Times of day produced by an every_x_hours schedule. Mirrors the calculator: doses start at
 * `firstDoseTime` and repeat until midnight (each day starts again at the first dose time).
 */
export function everyXHoursTimes(config: EveryXHoursConfig): string[] {
  if (!isValidTime(config.firstDoseTime) || !(config.intervalHours >= 1)) return [];
  const start = timeToDate(config.firstDoseTime, new Date(2000, 0, 3));
  const end = new Date(2000, 0, 4);
  const out: string[] = [];
  for (let d = start; d < end && out.length < 24; d = addHours(d, config.intervalHours)) {
    out.push(dateToTime(d));
  }
  return out;
}

/** Dose steps of a tapering schedule until it reaches zero ("4 → 3 → 2 → 1"). */
export function taperingSteps(config: TaperingConfig, max = 8): { doses: number[]; more: boolean } {
  const doses: number[] = [];
  if (!(config.startDose > 0) || !(config.decrementAmount > 0)) return { doses, more: false };
  for (let dose = config.startDose; dose > 0.0001; dose = round2(dose - config.decrementAmount)) {
    if (doses.length === max) return { doses, more: true };
    doses.push(round2(dose));
  }
  return { doses, more: false };
}

/** Pattern of the first `days` days of a cycle: true = take, false = break. */
export function cyclePattern(config: CycleConfig, days = 28): boolean[] {
  const len = config.daysOn + config.daysOff;
  if (!(config.daysOn >= 1) || !(len >= 1)) return [];
  return Array.from({ length: days }, (_, i) => i % len < config.daysOn);
}

/** Start date ISO field of the config, when the type has one. */
export function getStartDate(type: ScheduleType, config: AnyScheduleConfig): string | null {
  const c = config as Record<string, unknown>;
  if (type === 'every_x_days' || type === 'tapering') return (c.startDate as string) ?? null;
  if (type === 'cycle') return (c.cycleStartDate as string) ?? null;
  return null;
}

/** True when the schedule type has a start date and it is the same day as in `initial`. */
export function isStartDateUnchanged(
  type: ScheduleType,
  config: AnyScheduleConfig,
  initialType: ScheduleType | null | undefined,
  initialConfig: AnyScheduleConfig | null | undefined
): boolean {
  if (!initialType || !initialConfig || initialType !== type) return false;
  const a = getStartDate(type, config);
  const b = getStartDate(initialType, initialConfig);
  if (!a || !b) return false;
  return startOfDay(new Date(a)).getTime() === startOfDay(new Date(b)).getTime();
}

// ---------------------------------------------------------------------------------------------
// Form creation
// ---------------------------------------------------------------------------------------------

export function createEmptyForm(now: Date = new Date()): MedicineForm {
  return {
    name: '',
    strength: '',
    imageUri: null,
    notes: '',
    dosageAmount: 1,
    dosageUnit: 'pills',
    scheduleType: 'once_daily',
    scheduleConfig: defaultConfigFor('once_daily', { now }),
    inventoryCount: 0,
    trackSupply: false,
    packageSize: null,
    refillReminderType: 'none',
    refillReminderValue: null,
    expirationDate: null,
    maxDailyDose: null,
    minHoursBetweenDoses: null,
    bypassDnd: false,
  };
}

/**
 * The supply or extras fields back at their defaults (supply not tracked, no pack size, no refill
 * reminder / no note, no limits, no expiry): what a new medicine has until someone sets them.
 */
export function skipDefaults(step: 'supply' | 'extras'): Partial<MedicineForm> {
  const e = createEmptyForm();
  if (step === 'supply') {
    return {
      inventoryCount: e.inventoryCount,
      trackSupply: false,
      packageSize: e.packageSize,
      refillReminderType: e.refillReminderType,
      refillReminderValue: e.refillReminderValue,
    };
  }
  return {
    notes: e.notes,
    maxDailyDose: e.maxDailyDose,
    minHoursBetweenDoses: e.minHoursBetweenDoses,
    expirationDate: e.expirationDate,
    bypassDnd: e.bypassDnd,
  };
}

export function formFromMedication(med: Medication): MedicineForm {
  let raw: unknown = {};
  try {
    raw = JSON.parse(med.scheduleConfig);
  } catch {
    raw = {};
  }
  const type = med.scheduleType;
  const refillType: RefillType = med.refillReminderType ?? 'none';
  return {
    name: med.name,
    strength: med.strength ?? '',
    imageUri: med.imageUri ?? null,
    notes: med.notes ?? '',
    dosageAmount: med.dosageAmount,
    dosageUnit: med.dosageUnit,
    scheduleType: type,
    scheduleConfig: normalizeConfig(type, raw, { dosageAmount: med.dosageAmount }),
    inventoryCount: med.inventoryCount ?? 0,
    trackSupply: med.trackSupply !== false,
    packageSize: med.packageSize ?? null,
    refillReminderType: refillType,
    refillReminderValue: refillType === 'none' ? null : (med.refillReminderValue ?? null),
    expirationDate: med.expirationDate ?? null,
    maxDailyDose: med.maxDailyDose ?? null,
    minHoursBetweenDoses: med.minHoursBetweenDoses ?? null,
    bypassDnd: med.bypassDnd,
  };
}

// ---------------------------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------------------------

/** A per-time amount that is set and differs from the usual amount (otherwise it means nothing). */
export function hasAmountOverride(dosageAmount: number | undefined, usualAmount?: number): boolean {
  return (
    dosageAmount !== undefined &&
    dosageAmount > 0 &&
    (usualAmount === undefined || dosageAmount !== usualAmount)
  );
}

/**
 * The config exactly as it is stored (PRN stores `{}`; per-time amounts only when set). With
 * `usualAmount`, per-time amounts equal to it are dropped too (see `hasAmountOverride`).
 */
export function cleanConfig(
  type: ScheduleType,
  config: AnyScheduleConfig,
  usualAmount?: number
): AnyScheduleConfig {
  if (type === 'prn') return {};
  if (type === 'multiple_daily') {
    const c = config as MultipleDailyConfig;
    return {
      times: sortTimes(c.times).map((t) =>
        hasAmountOverride(t.dosageAmount, usualAmount)
          ? { time: t.time, dosageAmount: t.dosageAmount }
          : { time: t.time }
      ),
    };
  }
  return config;
}

/**
 * The schedule exactly as it is stored: "Every day" with one time is `once_daily`, with more it is
 * `multiple_daily` (per-time amounts mean nothing with a single time, so they are dropped).
 */
export function storedSchedule(
  type: ScheduleType,
  config: AnyScheduleConfig,
  usualAmount?: number
): { scheduleType: ScheduleType; scheduleConfig: AnyScheduleConfig } {
  if (type === 'multiple_daily') {
    const times = (config as MultipleDailyConfig).times ?? [];
    if (times.length === 1 && isValidTime(times[0].time)) {
      return { scheduleType: 'once_daily', scheduleConfig: { time: times[0].time } };
    }
  }
  return { scheduleType: type, scheduleConfig: cleanConfig(type, config, usualAmount) };
}

/** The form with per-time amounts equal to the usual amount removed (Next from "When", save). */
export function dropRedundantAmounts(form: MedicineForm): MedicineForm {
  if (form.scheduleType !== 'multiple_daily') return form;
  const c = form.scheduleConfig as MultipleDailyConfig;
  if (
    !c.times.some(
      (t) => t.dosageAmount !== undefined && !hasAmountOverride(t.dosageAmount, form.dosageAmount)
    )
  ) {
    return form;
  }
  return {
    ...form,
    scheduleConfig: {
      times: c.times.map((t) =>
        t.dosageAmount !== undefined && !hasAmountOverride(t.dosageAmount, form.dosageAmount)
          ? { time: t.time }
          : t
      ),
    },
  };
}

/**
 * Whether the supply is counted: any count turns it on; a medicine that was never given a count
 * (skipped, or left at 0 when adding) is not tracked. A tracked medicine that ran out (0) stays
 * tracked.
 */
export function tracksSupply(form: Pick<MedicineForm, 'trackSupply' | 'inventoryCount'>): boolean {
  return form.trackSupply || form.inventoryCount > 0;
}

/** Input for `createMedication` — same shape and rules as the old add screen. */
export function toCreateInput(form: MedicineForm, profileId: string): CreateMedicationInput {
  const tracked = tracksSupply(form);
  const stored = storedSchedule(form.scheduleType, form.scheduleConfig, form.dosageAmount);
  // No refill reminder without a count to count down.
  const refill = tracked ? form.refillReminderType : 'none';
  return {
    profileId,
    name: form.name.trim(),
    strength: form.strength.trim() || undefined,
    imageUri: form.imageUri ?? undefined,
    notes: form.notes.trim() || undefined,
    dosageAmount: form.dosageAmount,
    dosageUnit: form.dosageUnit,
    scheduleType: stored.scheduleType,
    scheduleConfig: stored.scheduleConfig,
    inventoryCount: form.inventoryCount || 0,
    trackSupply: tracked,
    packageSize: form.packageSize ?? undefined,
    expirationDate: form.expirationDate ?? undefined,
    refillReminderType: refill !== 'none' ? refill : undefined,
    refillReminderValue:
      refill !== 'none' && form.refillReminderValue ? form.refillReminderValue : undefined,
    maxDailyDose: form.maxDailyDose ?? undefined,
    minHoursBetweenDoses: form.minHoursBetweenDoses ?? undefined,
    bypassDnd: form.bypassDnd,
    isPrn: form.scheduleType === 'prn',
  };
}

/**
 * `updateMedication` treats `undefined` as "leave unchanged" but writes `null` through to the
 * column, so a value the user removed must be sent as null to actually be cleared. The input type
 * doesn't model null for these columns, hence the cast.
 */
const CLEARED = null as unknown as undefined;

function optional<T>(value: T | null, initial: T | null | undefined): T | undefined {
  if (value !== null) return value;
  return initial !== null && initial !== undefined ? CLEARED : undefined;
}

/**
 * Input for `updateMedication` — same shape as the old edit screen (refill 'none' → null), plus
 * values the user removed (photo, notes, package size, limits) are cleared instead of silently
 * kept. `initial` is the form as loaded. The schedule (type + config) and the supply count are
 * only sent when they changed from `initial`.
 */
export function toUpdateInput(form: MedicineForm, initial?: MedicineForm): UpdateMedicationInput {
  const tracked = tracksSupply(form);
  const refill = tracked ? form.refillReminderType : 'none';
  const strength = form.strength.trim();
  const notes = form.notes.trim();
  // Any scheduleType/scheduleConfig in an update resets the schedule start and clears a moved
  // dose in the backend, so only send them when the schedule really changed.
  const scheduleChanged = !initial || !schedulesEqual(form, initial);
  const stored = storedSchedule(form.scheduleType, form.scheduleConfig, form.dosageAmount);
  // Supply changes while the form is open (doses logged meanwhile); don't overwrite them.
  const inventoryChanged = !initial || form.inventoryCount !== initial.inventoryCount;
  return {
    name: form.name.trim(),
    strength: strength || (initial?.strength.trim() ? null : undefined),
    imageUri: optional(form.imageUri, initial?.imageUri),
    notes: notes || (initial?.notes.trim() ? CLEARED : undefined),
    dosageAmount: form.dosageAmount,
    dosageUnit: form.dosageUnit,
    scheduleType: scheduleChanged ? stored.scheduleType : undefined,
    scheduleConfig: scheduleChanged ? stored.scheduleConfig : undefined,
    inventoryCount: inventoryChanged ? form.inventoryCount || 0 : undefined,
    trackSupply: tracked,
    packageSize: optional(form.packageSize, initial?.packageSize),
    // null clears a previously stored expiration date.
    expirationDate: form.expirationDate ?? (initial?.expirationDate ? null : undefined),
    refillReminderType: refill === 'none' ? null : refill,
    refillReminderValue: refill === 'none' ? null : form.refillReminderValue || undefined,
    maxDailyDose: optional(form.maxDailyDose, initial?.maxDailyDose),
    minHoursBetweenDoses: optional(form.minHoursBetweenDoses, initial?.minHoursBetweenDoses),
    bypassDnd: form.bypassDnd,
    isPrn: form.scheduleType === 'prn',
    // Per-time amounts only: the schedule start stays. Changed times: the default (start of today)
    // until save.ts decides with today's logs (`scheduleStartForEdit`).
    scheduleStart:
      initial && scheduleChanged && !scheduleTimingChanged(form, initial) ? 'keep' : undefined,
  };
}

/** A temporary Medication object (for `getScheduleDescription` and previews). */
export function toPreviewMedication(form: MedicineForm, id = 'preview'): Medication {
  const now = new Date();
  const stored = storedSchedule(form.scheduleType, form.scheduleConfig, form.dosageAmount);
  return {
    id,
    profileId: 'preview',
    name: form.name.trim(),
    strength: form.strength.trim() || undefined,
    imageUri: form.imageUri ?? undefined,
    notes: form.notes.trim() || undefined,
    dosageAmount: form.dosageAmount,
    dosageUnit: form.dosageUnit,
    scheduleType: stored.scheduleType,
    scheduleConfig: JSON.stringify(stored.scheduleConfig),
    inventoryCount: form.inventoryCount,
    trackSupply: tracksSupply(form),
    packageSize: form.packageSize ?? undefined,
    maxDailyDose: form.maxDailyDose ?? undefined,
    minHoursBetweenDoses: form.minHoursBetweenDoses ?? undefined,
    expirationDate: form.expirationDate ?? undefined,
    refillReminderType: form.refillReminderType === 'none' ? null : form.refillReminderType,
    refillReminderValue: form.refillReminderValue,
    bypassDnd: form.bypassDnd,
    isActive: true,
    isPrn: form.scheduleType === 'prn',
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

/**
 * Pages of the editor. The guided add flow has four steps (`FLOW_STEPS`): name, amount, schedule
 * (how often + when, merged) and review. `supply` and `extras` are not steps: they open as pages
 * from the review / the edit list / the medicine page.
 */
export type StepId = 'name' | 'dose' | 'schedule' | 'supply' | 'extras' | 'review';

/** The guided add flow, always four steps (as-needed medicines just pick the type on step 3). */
export const FLOW_STEPS: StepId[] = ['name', 'dose', 'schedule', 'review'];

/** Every editable page, in the order `validateAll` checks them. */
export const EDIT_SECTIONS: Exclude<StepId, 'review'>[] = [
  'name',
  'dose',
  'schedule',
  'supply',
  'extras',
];

/** Steps of the guided add flow (four for every schedule type). */
export function stepsFor(_form?: Pick<MedicineForm, 'scheduleType'>): StepId[] {
  return FLOW_STEPS;
}

/** Pages behind the edit list (and the add flow's supply / extras pages). */
export type SectionId =
  | 'name'
  | 'dose'
  | 'schedule'
  | 'supply'
  | 'refill'
  | 'extras'
  | 'note'
  | 'limits'
  | 'expiry';

export const SECTION_IDS: SectionId[] = [
  'name',
  'dose',
  'schedule',
  'supply',
  'refill',
  'extras',
  'note',
  'limits',
  'expiry',
];

export function isSectionId(value: unknown): value is SectionId {
  return typeof value === 'string' && (SECTION_IDS as string[]).includes(value);
}

/**
 * The validation step behind a page (Note, Limits and Expiry date are parts of the extras, Refill
 * of supply).
 */
export function sectionStep(section: SectionId): Exclude<StepId, 'review'> {
  if (section === 'note' || section === 'limits' || section === 'expiry') return 'extras';
  if (section === 'refill') return 'supply';
  return section;
}

/** A new scheduled medicine without a counted supply gets the "Count my supply" sheet. */
export function wantsSupplyNudge(
  form: Pick<MedicineForm, 'scheduleType' | 'trackSupply' | 'inventoryCount'>
): boolean {
  return form.scheduleType !== 'prn' && !tracksSupply(form);
}

/** Why a step can't continue. Keys map to `ui.editor.issues.<key>`. */
export type StepIssue =
  | 'nameRequired'
  | 'nameTooLong'
  | 'strengthTooLong'
  | 'doseRequired'
  | 'pickDay'
  | 'addTime'
  | 'tooManyTimes'
  | 'badTime'
  | 'startInPast'
  | 'intervalRange'
  | 'daysOnRange'
  | 'daysOffRange'
  | 'hoursRange'
  | 'taperingValues'
  | 'refillValue'
  | 'notesTooLong'
  | 'positiveValue'
  | 'schedule';

export interface StepResult {
  ok: boolean;
  issue?: StepIssue;
  /** Raw validator message (English), for logs / debugging only. */
  detail?: string;
}

export interface ValidateOptions {
  /** Accept a past start date (edit screen, start date unchanged). */
  allowPastStartDate?: boolean;
  now?: Date;
}

const OK: StepResult = { ok: true };

/** First friendly issue in a schedule config (checked in the order the editor shows fields). */
function scheduleIssue(
  type: ScheduleType,
  config: AnyScheduleConfig,
  opts: ValidateOptions
): StepIssue | undefined {
  const c = config as unknown as Record<string, unknown>;
  const today = startOfDay(opts.now ?? new Date()).getTime();
  const isPast = (iso: unknown) =>
    typeof iso === 'string' && startOfDay(new Date(iso)).getTime() < today;
  const int = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

  switch (type) {
    case 'multiple_daily': {
      const times = (c.times as MultipleDailyConfig['times']) ?? [];
      if (!times.length) return 'addTime';
      if (times.length > MAX_DAILY_TIMES) return 'tooManyTimes';
      if (times.some((t) => !isValidTime(t.time))) return 'badTime';
      if (times.some((t) => t.dosageAmount !== undefined && !(t.dosageAmount > 0)))
        return 'positiveValue';
      return undefined;
    }
    case 'specific_weekdays':
      if (!Array.isArray(c.weekdays) || !c.weekdays.length) return 'pickDay';
      break;
    case 'every_x_days':
      if (!int(c.intervalDays, 1, 365)) return 'intervalRange';
      if (!opts.allowPastStartDate && isPast(c.startDate)) return 'startInPast';
      break;
    case 'cycle':
      if (!int(c.daysOn, 1, 365)) return 'daysOnRange';
      if (!int(c.daysOff, 0, 365)) return 'daysOffRange';
      if (!opts.allowPastStartDate && isPast(c.cycleStartDate)) return 'startInPast';
      break;
    case 'every_x_hours':
      if (!int(c.intervalHours, 1, 24)) return 'hoursRange';
      if (!isValidTime(c.firstDoseTime)) return 'badTime';
      return undefined;
    case 'tapering':
      if (
        !((c.startDose as number) > 0) ||
        !((c.decrementAmount as number) > 0) ||
        !int(c.decrementIntervalDays, 1, Number.MAX_SAFE_INTEGER)
      )
        return 'taperingValues';
      if (!opts.allowPastStartDate && isPast(c.startDate)) return 'startInPast';
      break;
    default:
      break;
  }
  if (type !== 'prn' && 'time' in c && !isValidTime(c.time)) return 'badTime';
  return undefined;
}

/** Validate the schedule with the backend rules (zod) and a friendly issue key. */
export function validateSchedule(
  type: ScheduleType,
  config: AnyScheduleConfig,
  opts: ValidateOptions = {}
): StepResult {
  const cleaned = cleanConfig(type, config);
  const result = validateScheduleConfig(type, cleaned, {
    allowPastStartDate: opts.allowPastStartDate,
  });
  if (result.success) return OK;
  return {
    ok: false,
    issue: scheduleIssue(type, config, opts) ?? 'schedule',
    detail: result.error,
  };
}

export function validateStep(
  step: StepId,
  form: MedicineForm,
  opts: ValidateOptions = {}
): StepResult {
  switch (step) {
    case 'name': {
      const name = form.name.trim();
      if (!name) return { ok: false, issue: 'nameRequired' };
      if (name.length > NAME_MAX) return { ok: false, issue: 'nameTooLong' };
      if (form.strength.trim().length > STRENGTH_MAX)
        return { ok: false, issue: 'strengthTooLong' };
      return OK;
    }
    case 'dose':
      return form.dosageAmount > 0 ? OK : { ok: false, issue: 'doseRequired' };
    case 'schedule':
      if (form.scheduleType === 'prn') return OK;
      return validateSchedule(form.scheduleType, form.scheduleConfig, opts);
    case 'supply':
      if (form.refillReminderType !== 'none' && !((form.refillReminderValue ?? 0) > 0))
        return { ok: false, issue: 'refillValue' };
      if (form.packageSize !== null && !(form.packageSize > 0))
        return { ok: false, issue: 'positiveValue' };
      return OK;
    case 'extras':
      if (form.notes.trim().length > NOTES_MAX) return { ok: false, issue: 'notesTooLong' };
      if (form.maxDailyDose !== null && !(form.maxDailyDose > 0))
        return { ok: false, issue: 'positiveValue' };
      if (form.minHoursBetweenDoses !== null && !(form.minHoursBetweenDoses > 0))
        return { ok: false, issue: 'positiveValue' };
      return OK;
    case 'review':
      return validateAll(form, opts).result;
  }
}

/** Validate every step; returns the first failing step (for Save on review / edit). */
export function validateAll(
  form: MedicineForm,
  opts: ValidateOptions = {}
): { result: StepResult; step?: StepId } {
  for (const step of EDIT_SECTIONS) {
    const result = validateStep(step, form, opts);
    if (!result.ok) return { result, step };
  }
  return { result: OK };
}

/** JSON with object keys sorted, so equal configs compare equal whatever their key order. */
function stableJson(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort()
          .map((k) => [k, sort((v as Record<string, unknown>)[k])])
      );
    }
    return v;
  };
  return JSON.stringify(sort(value));
}

/** Same schedule as stored (`storedSchedule`, key order ignored). */
export function schedulesEqual(a: MedicineForm, b: MedicineForm): boolean {
  const sa = storedSchedule(a.scheduleType, a.scheduleConfig, a.dosageAmount);
  const sb = storedSchedule(b.scheduleType, b.scheduleConfig, b.dosageAmount);
  return (
    sa.scheduleType === sb.scheduleType &&
    stableJson(sa.scheduleConfig) === stableJson(sb.scheduleConfig)
  );
}

/** The schedule type or its times changed (per-time amount changes don't count). */
export function scheduleTimingChanged(a: MedicineForm, b: MedicineForm): boolean {
  const strip = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(strip);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .filter(([k]) => k !== 'dosageAmount')
          .map(([k, x]) => [k, strip(x)])
      );
    }
    return v;
  };
  const sa = storedSchedule(a.scheduleType, a.scheduleConfig, a.dosageAmount);
  const sb = storedSchedule(b.scheduleType, b.scheduleConfig, b.dosageAmount);
  return (
    sa.scheduleType !== sb.scheduleType ||
    stableJson(strip(sa.scheduleConfig)) !== stableJson(strip(sb.scheduleConfig))
  );
}

/** Structural equality used for "unsaved changes" detection. */
export function formsEqual(a: MedicineForm, b: MedicineForm): boolean {
  const norm = (f: MedicineForm) =>
    JSON.stringify({
      ...f,
      expirationDate: f.expirationDate ? startOfDay(f.expirationDate).getTime() : null,
      scheduleConfig: cleanConfig(f.scheduleType, f.scheduleConfig, f.dosageAmount),
    });
  return norm(a) === norm(b);
}

/** Stepper step/min for an amount in this unit (mg moves in 5s, countable units in halves). */
export function doseStep(unit: DosageUnit): { step: number; min: number } {
  if (unit === 'milligrams') return { step: 5, min: 0.5 };
  return { step: 0.5, min: 0.25 };
}
