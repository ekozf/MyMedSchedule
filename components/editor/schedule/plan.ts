/**
 * Dated previews for step 4, built from the schedule calculator so they match what Today shows:
 * the steps of a tapering plan ("From 9 Nov: 1 pill · From 16 Nov: 0.5 pill · Last dose 22 Nov")
 * and the next break of a cycle.
 *
 * @example
 * taperingPlan(form)        // { steps: [{ date, dose }, …], more: 0, lastDay }
 * nextCycleBreak(config)    // { start, end, ongoing } or null when there are no days off
 */
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import { getDosesForDate } from '@/lib/schedule/calculator';
import { toPreviewMedication, type MedicineForm, type ScheduleConfigMap } from '../form-model';

export interface TaperingPlan {
  /** First steps: the day the amount changes and the amount from then on. */
  steps: { date: Date; dose: number }[];
  /** Steps after the ones listed. */
  more: number;
  /** Day of the last dose (null when it never reaches zero within the look-ahead). */
  lastDay: Date | null;
}

/** Longest plan we walk through (safety bound for tiny decrements). */
const MAX_STEPS = 400;

export function taperingPlan(form: MedicineForm, shown = 3): TaperingPlan {
  const empty: TaperingPlan = { steps: [], more: 0, lastDay: null };
  if (form.scheduleType !== 'tapering') return empty;
  const c = form.scheduleConfig as ScheduleConfigMap['tapering'];
  const start = startOfDay(new Date(c.startDate));
  if (Number.isNaN(start.getTime()) || !(c.decrementIntervalDays >= 1)) return empty;
  if (!(c.startDose > 0) || !(c.decrementAmount > 0)) return empty;

  const med = { ...toPreviewMedication(form), scheduleStartDate: start };
  const steps: { date: Date; dose: number }[] = [];
  for (let k = 0; k < MAX_STEPS; k++) {
    const date = addDays(start, k * c.decrementIntervalDays);
    const dose = getDosesForDate(med, date)[0]?.dosageAmount ?? 0;
    if (!(dose > 0.0001)) {
      return {
        steps: steps.slice(0, shown),
        more: Math.max(0, steps.length - shown),
        lastDay: k > 0 ? addDays(date, -1) : null,
      };
    }
    steps.push({ date, dose: Math.round(dose * 100) / 100 });
  }
  return { steps: steps.slice(0, shown), more: Math.max(0, steps.length - shown), lastDay: null };
}

/** The break that is on now or comes next (from `now`), or null without days off. */
export function nextCycleBreak(
  config: ScheduleConfigMap['cycle'],
  now: Date = new Date()
): { start: Date; end: Date; ongoing: boolean } | null {
  const { daysOn, daysOff } = config;
  if (!(daysOn >= 1) || !(daysOff >= 1)) return null;
  const cycleStart = startOfDay(new Date(config.cycleStartDate));
  if (Number.isNaN(cycleStart.getTime())) return null;
  const today = startOfDay(now);
  const len = daysOn + daysOff;
  const since = differenceInCalendarDays(today, cycleStart);
  // Cycle that contains today (or the first one when the start is still ahead).
  const k = since <= 0 ? 0 : Math.floor(since / len);
  const start = addDays(cycleStart, k * len + daysOn);
  const end = addDays(start, daysOff - 1);
  return { start, end, ongoing: today >= start && today <= end };
}
