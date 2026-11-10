/**
 * When a new medicine's first dose will be: the first scheduled time after the moment it is
 * saved, worked out with the real schedule calculator (a new schedule starts at the moment it is
 * saved, so times already passed today are not counted; see `getScheduleStartMoment`).
 *
 * @example
 * const first = firstDoseAfter(form, new Date());          // Date | null
 * firstReminderText(first, now, formatTimeString);         // "First reminder: today at 20:00"
 */
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { getDosesForDate } from '@/lib/schedule/calculator';
import { formatShortDate } from '@/lib/ui/format';
import { dateToTime, toPreviewMedication, type MedicineForm } from './form-model';

/** Far enough for any schedule a new medicine can have (a start date a year away included). */
const SEARCH_DAYS = 400;

export function firstDoseAfter(form: MedicineForm, now: Date = new Date()): Date | null {
  if (form.scheduleType === 'prn') return null;
  const preview = toPreviewMedication(form);
  // Same as a saved medicine: the schedule starts at the moment it is created.
  const med = { ...preview, createdAt: now, scheduleStartDate: now };
  const today = startOfDay(now);
  for (let i = 0; i < SEARCH_DAYS; i++) {
    const doses = getDosesForDate(med, addDays(today, i));
    const next = doses
      .map((d) => d.time)
      .filter((t) => t.getTime() > now.getTime())
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (next) return next;
  }
  return null;
}

/** "First reminder: today at 20:00" / "tomorrow at 08:00" / "Mon 16 Nov at 08:00". */
export function firstReminderText(first: Date, now: Date, fmt: (time: string) => string): string {
  const time = fmt(dateToTime(first));
  const days = differenceInCalendarDays(first, now);
  const when =
    days === 0
      ? i18n.t('ui.editor.review.firstToday', { time })
      : days === 1
        ? i18n.t('ui.editor.review.firstTomorrow', { time })
        : i18n.t('ui.editor.review.firstOnDate', { date: formatShortDate(first, now), time });
  return i18n.t('ui.editor.review.firstReminder', { when });
}
