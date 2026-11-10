/**
 * Pure Today-screen logic: dose status, compartment bucketing, day stats, late-overlap rule,
 * partial steps and copy helpers. No DB / store access so it can run in tests.
 *
 * @example
 * const index = indexLogs(logsForDay(logs, day));
 * const entries = buildEntries(getAllDosesForDate(meds, day), index, medsById, now);
 * const stats = computeDayStats(entries);
 * const groups = groupByCompartment(entries, boundaries); // always 4, morning → night
 * const nowId = nowCompartment(groups, now, boundaries, isToday);
 */
import {
  addMinutes,
  differenceInCalendarDays,
  differenceInMinutes,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isSameYear,
  startOfDay,
} from 'date-fns';
import i18n from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { getNextDose, type ScheduledDose } from '@/lib/schedule/calculator';
import { COMPARTMENT_ORDER, compartmentFor } from '@/lib/settings/compartments';
import type {
  CompartmentBoundaries,
  CompartmentId,
  DosageUnit,
  IntakeAction,
  IntakeLog,
  Medication,
} from '@/types';

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
// Compartments (docs/DESIGN.md §5.2): the day is four compartments with per-profile boundaries.

/** Same union as the ds `Compartment` state (kept here so this file stays free of RN imports). */
export type TrayState = 'default' | 'now' | 'done' | 'skipped' | 'empty';

export interface CompartmentGroup {
  id: CompartmentId;
  /** Doses in this compartment, in time order. */
  entries: DoseEntry[];
  total: number;
  /** taken + partial (the "taken" count shown on the tile). */
  done: number;
  /** Logged as only part of the dose (counted in `done` too). */
  partial: number;
  skipped: number;
  /** done + skipped. */
  handled: number;
  /** Unlogged and past their time today. */
  late: number;
  /** Unlogged on a day that is already over. */
  missed: number;
  /** Unlogged doses, in time order. */
  pending: DoseEntry[];
}

const byTime = (a: DoseEntry, b: DoseEntry) => a.dose.time.getTime() - b.dose.time.getTime();

/** Entries in time order (stable for equal times). */
export function sortEntries(entries: DoseEntry[]): DoseEntry[] {
  return [...entries].sort(byTime);
}

function summarise(id: CompartmentId, entries: DoseEntry[]): CompartmentGroup {
  const g: CompartmentGroup = {
    id,
    entries,
    total: entries.length,
    done: 0,
    partial: 0,
    skipped: 0,
    handled: 0,
    late: 0,
    missed: 0,
    pending: [],
  };
  for (const e of entries) {
    if (e.status === 'partial') g.partial += 1;
    if (e.status === 'taken' || e.status === 'partial') g.done += 1;
    else if (e.status === 'skipped') g.skipped += 1;
    else {
      g.pending.push(e);
      if (e.status === 'late') g.late += 1;
      if (e.status === 'missed') g.missed += 1;
    }
  }
  g.handled = g.done + g.skipped;
  return g;
}

/**
 * Buckets entries into the four compartments by their (scheduled or moved) time, using the
 * profile's boundaries. Always returns four groups in `COMPARTMENT_ORDER`; empty ones have total 0.
 */
export function groupByCompartment(
  entries: DoseEntry[],
  boundaries: CompartmentBoundaries
): CompartmentGroup[] {
  const buckets = new Map<CompartmentId, DoseEntry[]>(COMPARTMENT_ORDER.map((id) => [id, []]));
  for (const e of sortEntries(entries)) {
    buckets.get(compartmentFor(e.dose.time, boundaries))!.push(e);
  }
  return COMPARTMENT_ORDER.map((id) => summarise(id, buckets.get(id)!));
}

export const isGroupDone = (g: CompartmentGroup) => g.total > 0 && g.handled === g.total;

/** Due within the next 15 minutes, or past its time and still not logged (today). */
export const isDueNow = (e: DoseEntry) => e.status === 'due' || e.status === 'late';

/**
 * The compartment to open now (amber outline): only one holding a dose that is due or late, so
 * future doses never look like "take now". The current compartment wins when it has one, else
 * the earliest with one. Only on today; null when nothing is due.
 */
export function nowCompartment(
  groups: CompartmentGroup[],
  now: Date,
  boundaries: CompartmentBoundaries,
  isToday: boolean
): CompartmentId | null {
  if (!isToday) return null;
  const hasDue = (g: CompartmentGroup) => g.pending.some(isDueNow);
  const currentId = compartmentFor(now, boundaries);
  const current = groups.find((g) => g.id === currentId);
  if (current && hasDue(current)) return current.id;
  return groups.find(hasDue)?.id ?? null;
}

export function trayState(g: CompartmentGroup, nowId: CompartmentId | null): TrayState {
  if (g.total === 0) return 'empty';
  // Finished with nothing taken (only skipped) is not success: neutral tile, no green.
  if (isGroupDone(g)) return g.done === 0 ? 'skipped' : 'done';
  return g.id === nowId ? 'now' : 'default';
}

/** Tray tile heights: a full row and a row whose two tiles are both empty. */
export const TRAY_TILE_HEIGHT = 150;
export const TRAY_EMPTY_ROW_HEIGHT = 84;

/**
 * Min height per tray row (2×2, rows = [morning, midday], [evening, night]). A row whose two
 * compartments are both empty collapses to 84; any row with a dose keeps 150.
 */
export function trayRowHeights(groups: CompartmentGroup[]): number[] {
  const rows = [groups.slice(0, 2), groups.slice(2, 4)];
  return rows.map((row) =>
    row.every((g) => g.total === 0) ? TRAY_EMPTY_ROW_HEIGHT : TRAY_TILE_HEIGHT
  );
}

/** What the tile's sub line says, as data (see `compartmentSubText`). */
export type CompartmentSub =
  | { kind: 'allTaken' }
  | { kind: 'doneWith'; partial: number; skipped: number }
  | { kind: 'skippedOnly'; count: number }
  | { kind: 'late'; count: number }
  | { kind: 'notLogged'; count: number }
  | { kind: 'dueAt'; time: Date }
  | { kind: 'from'; time: Date };

export function compartmentSub(g: CompartmentGroup): CompartmentSub | null {
  if (g.total === 0) return null;
  if (isGroupDone(g)) {
    if (g.done === 0) return { kind: 'skippedOnly', count: g.skipped };
    // "All taken" only when every dose was taken in full.
    return g.skipped > 0 || g.partial > 0
      ? { kind: 'doneWith', partial: g.partial, skipped: g.skipped }
      : { kind: 'allTaken' };
  }
  if (g.late > 0) return { kind: 'late', count: g.late };
  if (g.missed > 0) return { kind: 'notLogged', count: g.missed };
  // "Due at" only once a dose is inside the due window; later doses say "From 20:00".
  const due = g.pending.find((e) => e.status === 'due');
  if (due) return { kind: 'dueAt', time: due.dose.time };
  return { kind: 'from', time: g.pending[0].dose.time };
}

type Fmt = (d: Date) => string;

/**
 * "Done, 1 partial" · "Done, 1 skipped" · "Done, 1 partial, 1 skipped" (partial/skipped counts
 * as data → words).
 */
export function doneWithText(partial: number, skipped: number): string {
  const parts: string[] = [];
  if (partial > 0) parts.push(i18n.t('ui.today.tray.partialCount', { count: partial }));
  if (skipped > 0) parts.push(i18n.t('ui.today.tray.skippedCount', { count: skipped }));
  return i18n.t('ui.today.tray.doneWith', { list: parts.join(', ') });
}

/**
 * "All taken" · "Done, 1 partial" · "Done, 1 skipped" · "2 late" · "1 not logged" ·
 * "Due at 10:00" · "From 20:00".
 */
export function compartmentSubText(g: CompartmentGroup, fmt: Fmt): string | undefined {
  const sub = compartmentSub(g);
  if (!sub) return undefined;
  switch (sub.kind) {
    case 'allTaken':
      return i18n.t('ui.today.tray.allTaken');
    case 'doneWith':
      return doneWithText(sub.partial, sub.skipped);
    case 'skippedOnly':
      return i18n.t('ui.today.tray.skippedCount', { count: sub.count });
    case 'late':
      return i18n.t('ui.today.tray.late', { count: sub.count });
    case 'notLogged':
      return i18n.t('ui.today.tray.notLogged', { count: sub.count });
    case 'dueAt':
      return i18n.t('ui.today.tray.dueAt', { time: fmt(sub.time) });
    case 'from':
      return i18n.t('ui.today.tray.from', { time: fmt(sub.time) });
  }
}

/** How a dose's medicine is named (screens pass `medicineDisplayName`, "Metformin 500 mg"). */
export type DoseNamer = (entry: DoseEntry) => string;
const plainName: DoseNamer = (e) => e.dose.medicationName;

/**
 * The medicines in a compartment, in time order, each name once: up to `max` names joined with
 * ", ", then "+N" for the rest ("Metformin" · "Metformin, Lisinopril +1").
 */
export function compartmentNames(
  g: CompartmentGroup,
  max = 2,
  nameOf: DoseNamer = plainName
): string {
  const names = distinctNames(g, nameOf);
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')} +${names.length - max}`;
}

function distinctNames(g: CompartmentGroup, nameOf: DoseNamer = plainName): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const e of g.entries) {
    const n = nameOf(e);
    if (!seen.has(n)) {
      seen.add(n);
      names.push(n);
    }
  }
  return names;
}

/** First letter in lower case, so a status reads on after "Metformin · " ("from 20:00"). */
function lowerFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLocaleLowerCase(i18n.locale) + text.slice(1);
}

/**
 * The tile's sub line with the medicine names first: "Metformin · from 20:00" ·
 * "Metformin, Lisinopril +1 · 1 late" · "Metformin · 1 skipped".
 */
export function compartmentTileSub(
  g: CompartmentGroup,
  fmt: Fmt,
  nameOf: DoseNamer = plainName
): string | undefined {
  const status = compartmentSubText(g, fmt);
  if (!status) return undefined;
  const names = compartmentNames(g, 2, nameOf);
  if (!names) return status;
  return i18n.t('ui.today.tray.withNames', { names, status: lowerFirst(status) });
}

/**
 * Screen reader version of the tile's sub line: every medicine name, then the status
 * ("Metformin, Lisinopril, Aspirin, 1 late").
 */
export function compartmentTileSubA11y(
  g: CompartmentGroup,
  fmt: Fmt,
  nameOf: DoseNamer = plainName
): string | undefined {
  const status = compartmentSubText(g, fmt);
  if (!status) return undefined;
  return [...distinctNames(g, nameOf), status].join(', ');
}

/**
 * Compartment sheet subtitle: "Taken at 08:12" · "Both taken at 08:12" · "All 3 taken" ·
 * "Done, 1 partial" · "Done, 1 skipped" · "One to take" · "2 to take, from 20:00".
 */
export function compartmentSheetSubtitle(g: CompartmentGroup, fmt: Fmt): string {
  if (g.total === 0) return '';
  if (isGroupDone(g)) {
    if (g.done === 0) return i18n.t('ui.today.tray.skippedCount', { count: g.skipped });
    if (g.skipped > 0 || g.partial > 0) return doneWithText(g.partial, g.skipped);
    const times = g.entries.map((e) => (e.log ? fmt(new Date(e.log.actualTime)) : ''));
    const same = times.every((t) => t && t === times[0]);
    if (g.total === 1) return i18n.t('ui.today.compartment.takenAt', { time: times[0] });
    if (g.total === 2) {
      return same
        ? i18n.t('ui.today.compartment.bothTakenAt', { time: times[0] })
        : i18n.t('ui.today.compartment.bothTaken');
    }
    return same
      ? i18n.t('ui.today.compartment.allTakenAt', { count: g.total, time: times[0] })
      : i18n.t('ui.today.compartment.allTaken', { count: g.total });
  }
  const n = g.pending.length;
  if (n === 1) return i18n.t('ui.today.compartment.oneToTake');
  return i18n.t('ui.today.compartment.manyToTake', {
    count: n,
    time: fmt(g.pending[0].dose.time),
  });
}

/** First dose still to take today (late ones first, since entries are in time order). */
export function upNext(entries: DoseEntry[], isToday: boolean): DoseEntry | null {
  if (!isToday) return null;
  return (
    sortEntries(entries).find(
      (e) => e.status === 'late' || e.status === 'due' || e.status === 'upcoming'
    ) ?? null
  );
}

/** The Up next dose can be taken now (due or late); otherwise the card says "Nothing due now". */
export const upNextIsDue = (entry: DoseEntry) => isDueNow(entry);

/** "41 minutes late" · "in 2 hours" · "now". */
export function upNextWhen(entry: DoseEntry, now: Date): string {
  const diff = differenceInMinutes(entry.dose.time, now);
  if (entry.status === 'late' || diff < 0) {
    return i18n.t('ui.today.upNext.late', {
      duration: formatDurationLong(differenceInMinutes(now, entry.dose.time)),
    });
  }
  if (diff === 0) return i18n.t('ui.today.upNext.now');
  return i18n.t('ui.today.upNext.in', { duration: formatDurationLong(diff) });
}

export type DayKind = 'today' | 'past' | 'future';

/**
 * Status line under the greeting. `<b>…</b>` marks the bold part (see `splitBold`).
 * "<b>2 of 5</b> doses taken · 3 more to go today." · "<b>1 of 2</b> doses taken · 1 partial · 1 more to go
 * today." · "<b>Nothing taken yet</b> · 2 to go today." · "All done for today." ·
 * "<b>Nothing taken</b> · 1 skipped." (everything handled but nothing taken) ·
 * "Nothing planned today."
 * "Taken" counts only full doses; partial doses are named separately (never "all taken").
 */
/**
 * A later scheduled dose for an empty Today: `when` from `laterWhen` ("tomorrow at 08:00"),
 * `first` when that medicine has never been logged (just added).
 */
export interface LaterDose {
  when: string;
  first: boolean;
}

/** "tomorrow at 08:00" · "Monday at 08:00" · "on 12 Nov at 08:00" (mid-sentence, lower case). */
export function laterWhen(date: Date, now: Date, formatTime: (d: Date) => string): string {
  const diff = differenceInCalendarDays(date, now);
  const time = formatTime(date);
  if (diff <= 0) return i18n.t('ui.today.laterWhen.today', { time });
  if (diff === 1) return i18n.t('ui.today.laterWhen.tomorrow', { time });
  const locale = getDateFnsLocale();
  if (diff < 7) {
    return i18n.t('ui.today.laterWhen.weekday', { day: format(date, 'EEEE', { locale }), time });
  }
  const day = format(date, isSameYear(date, now) ? 'd MMM' : 'd MMM yyyy', { locale });
  return i18n.t('ui.today.laterWhen.date', { day, time });
}

/**
 * Status line under the greeting. `later`: the next dose after an empty today (only used when
 * the shown day is today and has no doses), e.g. "Nothing more today. First dose tomorrow at 08:00."
 */
export function statusLine(stats: DayStats, kind: DayKind, later?: LaterDose | null): string {
  if (stats.total === 0) {
    if (kind === 'today' && later) {
      return i18n.t(
        later.first ? 'ui.today.status.nothingMoreFirst' : 'ui.today.status.nothingMoreNext',
        { when: later.when }
      );
    }
    return i18n.t(kind === 'today' ? 'ui.today.status.nothingToday' : 'ui.today.status.nothingDay');
  }
  const remaining = stats.total - stats.handled;
  if (kind === 'future' && stats.handled === 0) {
    return i18n.t('ui.today.status.planned', { count: stats.total });
  }
  if (remaining === 0) {
    // Skipping everything is not "all done": say nothing was taken.
    if (stats.done === 0) {
      return i18n.t('ui.today.status.noneTakenSkipped', { count: stats.skipped });
    }
    return i18n.t(kind === 'today' ? 'ui.today.status.allDoneToday' : 'ui.today.status.allDoneDay');
  }
  const base = { done: stats.taken, total: stats.total, count: remaining };
  // "· 1 partial" between the taken part and what is left.
  const withPartial = (text: string) => {
    if (stats.partial === 0) return text;
    const i = text.indexOf(' · ');
    const extra = i18n.t('ui.today.status.partialPart', { count: stats.partial });
    return i < 0 ? `${text} · ${extra}` : `${text.slice(0, i)} · ${extra}${text.slice(i)}`;
  };
  if (kind === 'today') {
    // A big "0" reads as a letter in this typeface; say it in words instead.
    if (stats.taken === 0 && stats.partial === 0) {
      return i18n.t('ui.today.status.todayNone', { count: remaining });
    }
    return withPartial(i18n.t('ui.today.status.today', base));
  }
  if (kind === 'past') return withPartial(i18n.t('ui.today.status.past', base));
  return withPartial(i18n.t('ui.today.status.future', base));
}

/** Splits "a <b>b</b> c" into parts for nested bold Text. */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  const parts: { text: string; bold: boolean }[] = [];
  const re = /<b>(.*?)<\/b>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false });
    parts.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  return parts;
}

/** "Good morning" before 12, "Good afternoon" before 18, else "Good evening"; "Hello" on other days. */
export function greetingKey(now: Date, isToday: boolean): string {
  if (!isToday) return 'ui.today.greeting.hello';
  const h = now.getHours();
  if (h < 12) return 'ui.today.greeting.morning';
  if (h < 18) return 'ui.today.greeting.afternoon';
  return 'ui.today.greeting.evening';
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

/** "45 minutes" · "1 hour 20 minutes" (under 2 h) · "3 hours" · "2 days". */
export function formatDurationLong(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  if (m < 60) return i18n.t('ui.today.durationLong.minutes', { count: m });
  if (m < 120) {
    const rest = m % 60;
    return rest
      ? i18n.t('ui.today.durationLong.hourMinutes', { count: rest })
      : i18n.t('ui.today.durationLong.hours', { count: 1 });
  }
  if (m < 48 * 60) return i18n.t('ui.today.durationLong.hours', { count: Math.floor(m / 60) });
  return i18n.t('ui.today.duration.days', { count: Math.floor(m / (60 * 24)) });
}

// ---------------------------------------------------------------------------------------------
// Requests used by the compartment sheet and `useDoseActions`

export interface DoseLogRequest {
  action: IntakeAction;
  amount: number;
  notes?: string;
  /**
   * 'now' → actualTime = now; 'scheduled' → actualTime = the scheduled time; a Date → that time
   * ("Earlier…" with a chosen time).
   */
  at: 'now' | 'scheduled' | Date;
}

export interface DoseUpdateRequest {
  action: IntakeAction;
  amount: number;
  /** '' clears the note. */
  notes: string;
  /** New "taken at" time; ignored when within a minute of the current one. */
  actualTime?: Date;
}
