/**
 * What a reminder says on the lock screen. Short and in the app's voice: the medicine (with its
 * strength) is the title, the body says what to do.
 *
 * @example
 * doseReminderContent({ name: 'Omeprazole', strength: '20 mg', amount: 1, unit: 'pills' });
 * // { title: 'Omeprazole 20 mg', body: 'Time to take 1 pill' }
 * doseReminderContent({ ..., snoozed: true });  // body: 'Still to take: 1 pill'
 * refillReminderContent({ name: 'Omeprazole', strength: '20 mg', count: 4, unit: 'pills' });
 * // { title: 'Omeprazole 20 mg is running low', body: '4 pills left. Time to get a new pack.' }
 */
import i18n from '@/lib/i18n';

/**
 * Bumped whenever the reminder texts change. Reminders carry it in `data.copy`; at start-up the
 * ones planned with older texts are re-created (see purgeLegacyReminderPayloads).
 */
export const REMINDER_COPY_VERSION = 2;

/** "Omeprazole 20 mg" (same as medicineDisplayName in the Medicines screens). */
export function reminderMedicineName(name: string, strength?: string | null): string {
  const trimmed = (name ?? '').trim();
  const s = strength?.trim();
  return s ? `${trimmed} ${s}` : trimmed;
}

/** Plural-aware unit word, the same as the UI ("1 pill", "2 pills"); see formatUnit in lib/ui. */
function unitWord(unit: string, count: number): string {
  return i18n.t(`ui.common.units.${unit}`, { count, defaultValue: unit });
}

export function doseReminderContent(input: {
  name: string;
  strength?: string | null;
  amount: number;
  unit: string;
  snoozed?: boolean;
}): { title: string; body: string } {
  const amount = Number.isFinite(input.amount) ? input.amount : 1;
  return {
    title: reminderMedicineName(input.name, input.strength),
    body: i18n.t(input.snoozed ? 'notifications.snoozedBody' : 'notifications.doseBody', {
      amount,
      unit: unitWord(input.unit, amount),
    }),
  };
}

export function refillReminderContent(input: {
  name: string;
  strength?: string | null;
  count: number;
  unit: string;
}): { title: string; body: string } {
  const count = input.count ?? 0;
  return {
    title: i18n.t('notifications.refillTitle', {
      medicine: reminderMedicineName(input.name, input.strength),
    }),
    body: i18n.t('notifications.refillBody', { count, unit: unitWord(input.unit, count) }),
  };
}
