/**
 * Reminders page logic (Settings → Reminders): the next planned reminder, and allowing reminders
 * (OS question, then plan every active medicine again now that they can show).
 *
 * @example
 * const next = nextReminder(medications, new Date()); // { name: 'Metformin', time: Date } | null
 * const ok = await allowAndPlanReminders();
 */
import { getNextDose } from '@/lib/schedule/calculator';
import { requestNotificationPermissions } from '@/lib/notifications/permissions';
import {
  scheduleNotificationsForMedication,
  scheduleRefillReminder,
} from '@/lib/notifications/scheduler';
import { notifyPermissionChanged } from '@/lib/notifications/use-permission';
import { useStore } from '@/store';
import type { Medication } from '@/types';

/** The earliest planned dose after `now` among active, scheduled (not as-needed) medicines. */
export function nextReminder(
  medications: Medication[],
  now: Date
): { name: string; time: Date } | null {
  let best: { name: string; time: Date } | null = null;
  for (const m of medications) {
    if (!m.isActive || m.isPrn) continue;
    const next = getNextDose(m, now);
    if (next && (!best || next.time.getTime() < best.time.getTime())) {
      best = { name: m.name, time: next.time };
    }
  }
  return best;
}

/** Shows the OS question; when allowed, plans all reminders again. Resolves whether allowed. */
export async function allowAndPlanReminders(): Promise<boolean> {
  let ok = false;
  try {
    ok = await requestNotificationPermissions({ prompt: true });
    if (ok) {
      for (const m of useStore.getState().medications) {
        if (!m.isActive) continue;
        if (!m.isPrn) await scheduleNotificationsForMedication(m);
        await scheduleRefillReminder(m);
      }
    }
  } catch (error) {
    console.warn('Failed to ask for notification permission:', error);
  }
  notifyPermissionChanged();
  return ok;
}
