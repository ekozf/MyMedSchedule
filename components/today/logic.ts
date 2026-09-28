/**
 * Pure Today-screen logic: dose status, grouping, day stats, late-overlap rule, partial steps.
 * No DB / store access so it can run in previews and tests.
 *
 * @example
 * const index = indexLogs(logs);
 * const entries = buildEntries(getAllDosesForDate(meds, day), index, medsById, now);
 * const stats = computeDayStats(entries);
 * const groups = groupEntries(entries);
 */
import { addMinutes, differenceInMinutes, endOfDay, isAfter, isBefore, startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { getNextDose, type ScheduledDose } from '@/lib/schedule/calculator';
import type { DosageUnit, IntakeLog, Medication } from '@/types';

export type DoseStatus = 'taken' | 'partial' | 'skipped' | 'due' | 'late' | 'missed' | 'upcoming';

export interface DoseEntry {
  /** Stable key: medicationId + scheduled ISO time. */
  key: string;
  dose: ScheduledDose;
  log: IntakeLog | null;
  status: DoseStatus;
  /** Minutes past the scheduled time (0 when not late). */
  minutesLate: number;
  /** This occurrence is the medicine's `nextDoseOverrideTime`. */
  moved: boolean;
}

/** Minutes before a dose during which it counts as "due" (Now). */
export const DUE_WINDOW_MIN = 15;
/** Late for this long or more → danger instead of warning. */
export const LATE_DANGER_MIN = 120;
/** "Early" window of the dose sheet (same as the old dialog). */
export const EARLY_WINDOW_MIN = 120;
/** Late-overlap window: next dose within this many minutes. */
export const OVERLAP_WINDOW_MIN = 120;

export function doseKey(medicationId: string, time: Date): string {
  return `${medicationId}|${time.toISOString()}`;
}

/**
 * Map of logs by medicationId + exact scheduledTime ISO (same matching rule as the old dashboard).
 * When several logs match, the first in list order wins (logs come sorted newest first).
 */
export function indexLogs(logs: IntakeLog[]): Map<string, IntakeLog> {
  const map = new Map<string, IntakeLog>();
  for (const log of logs) {
    if (!log.scheduledTime) continue;
    const key = doseKey(log.medicationId, log.scheduledTime);
    if (!map.has(key)) map.set(key, log);
  }
  return map;
}

/** Logs belonging to a day: by scheduledTime, falling back to actualTime (old dashboard rule). */
export function logsForDay(logs: IntakeLog[], day: Date): IntakeLog[] {
  const start = startOfDay(day);
  const end = endOfDay(day);
  return logs.filter((log) => {
    const t = log.scheduledTime ? new Date(log.scheduledTime) : new Date(log.actualTime);
    return t >= start && t <= end;
  });
}

/**
 * Status of one dose. Logged → taken/partial/skipped. Unlogged: `due` 0–15 min before,
 * `late` once past its time (today), `missed` when its day is already over, else `upcoming`.
 * (The old UI showed 0–2 h late doses as "upcoming"; that gap is fixed here.)
 */
export function getDoseStatus(
  dose: ScheduledDose,
  log: IntakeLog | null,
  now: Date
): { status: DoseStatus; minutesLate: number } {
  if (log) return { status: log.action, minutesLate: 0 };
  const minutesUntil = differenceInMinutes(dose.time, now);
  if (minutesUntil >= 0 && minutesUntil <= DUE_WINDOW_MIN) return { status: 'due', minutesLate: 0 };
  if (isAfter(now, dose.time)) {
    const minutesLate = differenceInMinutes(now, dose.time);
    return {
      status: isBefore(dose.time, startOfDay(now)) ? 'missed' : 'late',
      minutesLate,
    };
  }
  return { status: 'upcoming', minutesLate: 0 };
}

export function isMovedDose(dose: ScheduledDose, medication: Medication | undefined): boolean {
  if (!medication?.nextDoseOverrideTime) return false;
  return new Date(medication.nextDoseOverrideTime).getTime() === dose.time.getTime();
}

export function buildEntries(
  doses: ScheduledDose[],
  logIndex: Map<string, IntakeLog>,
  medsById: Map<string, Medication>,
  now: Date
): DoseEntry[] {
  return doses.map((dose) => {
    const key = doseKey(dose.medicationId, dose.time);
    const log = logIndex.get(key) ?? null;
    const { status, minutesLate } = getDoseStatus(dose, log, now);
    return {
      key,
      dose,
      log,
      status,
      minutesLate,
      moved: isMovedDose(dose, medsById.get(dose.medicationId)),
    };
  });
}

export const isLogged = (s: DoseStatus) => s === 'taken' || s === 'partial' || s === 'skipped';

// ---------------------------------------------------------------------------------------------
// Grouping by time of day

/** `earlyNight` (00–05) is shown first, `night` (21–24) last; both are labelled "Night". */
export type DayPart = 'earlyNight' | 'morning' | 'afternoon' | 'evening' | 'night';
const PART_ORDER: DayPart[] = ['earlyNight', 'morning', 'afternoon', 'evening', 'night'];

export function dayPartOf(date: Date): DayPart {
  const h = date.getHours();
  if (h < 5) return 'earlyNight';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

export interface DoseGroup {
  part: DayPart;
  entries: DoseEntry[];
}

/** Groups entries (already time-sorted) by part of day; empty groups are dropped. */
export function groupEntries(entries: DoseEntry[]): DoseGroup[] {
  const buckets = new Map<DayPart, DoseEntry[]>();
  for (const e of entries) {
    const part = dayPartOf(e.dose.time);
    const list = buckets.get(part) ?? [];
    list.push(e);
    buckets.set(part, list);
  }
  return PART_ORDER.filter((p) => buckets.has(p)).map((part) => ({
    part,
    entries: buckets.get(part)!,
  }));
}

// ---------------------------------------------------------------------------------------------
// Day stats

export interface DayStats {
  total: number;
  taken: number;
  partial: number;
  skipped: number;
  /** taken + partial (counts toward the ring). */
  done: number;
  /** done + skipped. */
  handled: number;
  late: number;
  missed: number;
  /** First entry that is due now, if any. */
  due: DoseEntry | null;
  /** First upcoming (unlogged, not late) entry, if any. */
  next: DoseEntry | null;
}

export function computeDayStats(entries: DoseEntry[]): DayStats {
  const s: DayStats = {
    total: entries.length,
    taken: 0,
    partial: 0,
    skipped: 0,
    done: 0,
    handled: 0,
    late: 0,
    missed: 0,
    due: null,
    next: null,
  };
  for (const e of entries) {
    switch (e.status) {
      case 'taken':
        s.taken += 1;
        break;
      case 'partial':
        s.partial += 1;
        break;
      case 'skipped':
        s.skipped += 1;
        break;
      case 'late':
        s.late += 1;
        break;
      case 'missed':
        s.missed += 1;
        break;
      case 'due':
        if (!s.due) s.due = e;
        if (!s.next) s.next = e;
        break;
      case 'upcoming':
        if (!s.next) s.next = e;
        break;
    }
  }
  s.done = s.taken + s.partial;
  s.handled = s.done + s.skipped;
  return s;
}

/** Cheap taken ÷ scheduled for a day (week strip rings, calendar dots). */
export function dayProgress(
  doses: ScheduledDose[],
  logIndex: Map<string, IntakeLog>,
  now: Date
): { total: number; done: number; handled: number; overdue: number } {
  let done = 0;
  let handled = 0;
  let overdue = 0;
  for (const d of doses) {
    const log = logIndex.get(doseKey(d.medicationId, d.time));
    if (log) {
      handled += 1;
      if (log.action !== 'skipped') done += 1;
    } else if (isAfter(now, d.time)) {
      overdue += 1;
    }
  }
  return { total: doses.length, done, handled, overdue };
}

// ---------------------------------------------------------------------------------------------
// Dose sheet rules (ported 1:1 from the former DoseActionDialog)

export function getTiming(dose: ScheduledDose, now: Date) {
  const minutesEarly = differenceInMinutes(dose.time, now);
  const isEarly = minutesEarly > 0 && minutesEarly <= EARLY_WINDOW_MIN;
  const isLate = isAfter(now, dose.time);
  const minutesLate = isLate ? differenceInMinutes(now, dose.time) : 0;
  return { minutesEarly, isEarly, isLate, minutesLate };
}

export interface LateOverlap {
  nextDoseTime: Date;
  minutesUntilNext: number;
}

/**
 * Late-dose overlap (old `computeLateOverlapWarning`): the dose is late and the medicine's next
 * scheduled dose (ignoring any override) is 0–120 min from now. Only for taken/partial.
 */
export function computeLateOverlap(
  medication: Medication | null | undefined,
  dose: ScheduledDose,
  now: Date,
  action: 'taken' | 'partial' | 'skipped' = 'taken'
): LateOverlap | null {
  if (!medication) return null;
  if (!isAfter(now, dose.time)) return null;
  if (action !== 'taken' && action !== 'partial') return null;

  const medNoOverride: Medication = { ...medication, nextDoseOverrideTime: undefined };
  const nextDose = getNextDose(medNoOverride, dose.time);
  if (!nextDose) return null;

  const minutesUntilNext = differenceInMinutes(nextDose.time, now);
  if (minutesUntilNext < 0) return null;
  if (minutesUntilNext > OVERLAP_WINDOW_MIN) return null;
  return { nextDoseTime: nextDose.time, minutesUntilNext };
}

/**
 * Suggested new time for the moved next dose: now + the usual gap between this dose and the next
 * one (clamped to 2–12 h so a daily medicine isn't pushed a whole day), rounded up to 5 minutes.
 */
export function suggestRescheduleTime(dose: ScheduledDose, nextDoseTime: Date, now: Date): Date {
  const gap = differenceInMinutes(nextDoseTime, dose.time);
  const minutes = Math.min(12 * 60, Math.max(120, Number.isFinite(gap) ? gap : 120));
  const t = addMinutes(now, minutes);
  t.setSeconds(0, 0);
  const rem = t.getMinutes() % 5;
  return rem ? addMinutes(t, 5 - rem) : t;
}

const COUNT_UNITS: DosageUnit[] = ['pills', 'puffs', 'drops', 'patches', 'units'];

/** Stepper step for a partial dose: 0.25 for small doses, 0.5 for countable units, nicer steps for mg/ml/g. */
export function partialStep(amount: number, unit: string): number {
  if (!(amount > 0)) return 0.5;
  if (amount <= 1) return 0.25;
  if (COUNT_UNITS.includes(unit as DosageUnit) || amount < 10) return 0.5;
  const raw = amount / 10;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const nice = [1, 2, 2.5, 5, 10].find((n) => n * magnitude >= raw) ?? 10;
  return nice * magnitude;
}

/** Default partial amount: half a dose, snapped to the step (never 0). */
export function defaultPartialAmount(amount: number, step: number): number {
  const half = Math.round(amount / 2 / step) * step;
  return Math.max(step, Math.round(half * 1000) / 1000);
}

// ---------------------------------------------------------------------------------------------
// Copy helpers

/** "45 min" · "1 h 20 min" (under 2 h) · "3 h" · "2 days". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  if (m < 60) return i18n.t('ui.today.duration.minutes', { count: m });
  if (m < 120) {
    const rest = m % 60;
    return rest
      ? i18n.t('ui.today.duration.hoursMinutes', { hours: 1, minutes: rest })
      : i18n.t('ui.today.duration.hours', { count: 1 });
  }
  if (m < 48 * 60) return i18n.t('ui.today.duration.hours', { count: Math.floor(m / 60) });
  return i18n.t('ui.today.duration.days', { count: Math.floor(m / (60 * 24)) });
}
