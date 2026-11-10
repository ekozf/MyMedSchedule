/**
 * Where an edited schedule starts. Changed times or type start at the save moment, like a new
 * medicine, so times already passed today don't come back as late — unless one of those passed
 * times today already has a log; then the start stays at the start of today so the logged dose
 * still shows. A change to per-time amounts only keeps the start.
 *
 * @example
 * const input = toUpdateInput(form, initial);
 * input.scheduleStart = scheduleStartForEdit(form, initial, await getIntakeLogsByMedication(id));
 */
import { startOfDay } from 'date-fns';
import type { UpdateMedicationInput } from '@/lib/db/operations';
import { getDosesForDate } from '@/lib/schedule/calculator';
import type { IntakeLog } from '@/types';
import {
  scheduleTimingChanged,
  schedulesEqual,
  toPreviewMedication,
  type MedicineForm,
} from './form-model';

export function scheduleStartForEdit(
  form: MedicineForm,
  initial: MedicineForm,
  logs: Pick<IntakeLog, 'scheduledTime'>[] = [],
  now: Date = new Date()
): UpdateMedicationInput['scheduleStart'] {
  if (schedulesEqual(form, initial)) return undefined;
  if (!scheduleTimingChanged(form, initial)) return 'keep';
  const minute = (d: Date) => Math.floor(new Date(d).getTime() / 60000);
  const logged = new Set(logs.flatMap((l) => (l.scheduledTime ? [minute(l.scheduledTime)] : [])));
  const today = startOfDay(now);
  const passedLogged = getDosesForDate(
    { ...toPreviewMedication(form), createdAt: today },
    today
  ).some((d) => d.time < now && logged.has(minute(d.time)));
  return passedLogged ? undefined : 'now';
}
