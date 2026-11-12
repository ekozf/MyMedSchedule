import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Notifications from 'expo-notifications';
import type { Medication } from '@/types';

const hoisted = vi.hoisted(() => ({ scheduled: [] as any[] }));

vi.mock('expo-notifications', () => ({
  scheduleNotificationAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(async () => hoisted.scheduled),
  cancelScheduledNotificationAsync: vi.fn(),
  dismissNotificationAsync: vi.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidNotificationPriority: { MAX: 'max', HIGH: 'high' },
}));
vi.mock('@/lib/db/operations', () => ({
  getMedicationById: vi.fn(),
  getActiveProfile: vi.fn(),
  hasIntakeLogForDose: vi.fn(),
  createIntakeLog: vi.fn(),
  createIntakeLogAndUpdateInventory: vi.fn(),
  InventoryInsufficientError: class extends Error {},
}));
vi.mock('@/store', () => ({ useStore: { getState: () => ({}) } }));
vi.mock('@/lib/schedule/calculator', () => ({
  getNextDose: vi.fn((med: Medication, after: Date) => {
    const t = new Date(Math.max(after.getTime(), Date.now()) + 3600_000);
    return { medicationId: med.id, time: t, dosageAmount: 1, dosageUnit: 'tablet', isPrn: false };
  }),
}));

import { purgeLegacyReminderPayloads, scheduleNotificationsForMedication } from '@/lib/notifications/scheduler';
import { handleReminderAction, reminderPayload } from '@/lib/notifications/handlers';
import { doseReminderContent, refillReminderContent, REMINDER_COPY_VERSION } from '@/lib/notifications/copy';
import * as ops from '@/lib/db/operations';

const med = {
  id: 'm1',
  name: 'Metformin',
  notes: 'Take with food — private',
  imageUri: 'file:///data/app/files/photos/x.jpg',
  dosageAmount: 1,
  dosageUnit: 'tablet',
  isActive: true,
  isPrn: false,
  bypassDnd: false,
} as unknown as Medication;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ops.getMedicationById).mockResolvedValue(null);
  hoisted.scheduled = [];
});

describe('reminder payloads', () => {
  it('dose reminders carry no notes or photo path', async () => {
    await scheduleNotificationsForMedication(med);
    const calls = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls;
    expect(calls.length).toBe(3);
    for (const [req] of calls) {
      const data = req.content.data as Record<string, unknown>;
      expect(Object.keys(data).sort()).toEqual(
        ['copy', 'dosageAmount', 'dosageUnit', 'kind', 'medicationId', 'medicationName', 'scheduledTime'].sort()
      );
      expect(JSON.stringify(req.content)).not.toContain('private');
      expect(JSON.stringify(req.content)).not.toContain('photos');
    }
  });

  it('snoozing an old reminder drops its notes / photo path', async () => {
    const old = {
      kind: 'dose',
      medicationId: 'm1',
      medicationName: 'Metformin',
      dosageAmount: 1,
      dosageUnit: 'tablet',
      scheduledTime: '2026-11-10T09:00:00.000Z',
      notes: 'secret',
      imageUri: 'file:///x.jpg',
    };
    await handleReminderAction('SNOOZE', 'n1', old);
    const [req] = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls[0];
    expect(req.content.data).toEqual(reminderPayload(old, 'snooze'));
    expect(req.content.data).not.toHaveProperty('notes');
    expect(req.content.data).not.toHaveProperty('imageUri');
  });

  it('purgeLegacyReminderPayloads cancels old dose reminders and re-makes snoozes without extras', async () => {
    const future = new Date(Date.now() + 600_000).toISOString();
    hoisted.scheduled = [
      { identifier: 'a', content: { data: { kind: 'dose', copy: REMINDER_COPY_VERSION, medicationId: 'm1', scheduledTime: future, notes: 'x' } }, trigger: {} },
      { identifier: 'b', content: { title: 'T', body: 'B', data: { kind: 'snooze', copy: REMINDER_COPY_VERSION, medicationId: 'm1', medicationName: 'Metformin', dosageAmount: 2, dosageUnit: 'pills', scheduledTime: future, imageUri: 'y' } }, trigger: {} },
      { identifier: 'c', content: { data: { kind: 'dose', copy: REMINDER_COPY_VERSION, medicationId: 'm1', scheduledTime: future } }, trigger: {} },
    ];
    expect(await purgeLegacyReminderPayloads()).toBe(2);
    const cancelled = vi.mocked(Notifications.cancelScheduledNotificationAsync).mock.calls.map((c) => c[0]);
    expect(cancelled.sort()).toEqual(['a', 'b']);
    const [req] = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls[0];
    expect(req.identifier).toBe('b');
    expect(req.content.data).toEqual({
      kind: 'snooze',
      copy: REMINDER_COPY_VERSION,
      medicationId: 'm1',
      medicationName: 'Metformin',
      dosageAmount: 2,
      dosageUnit: 'pills',
      scheduledTime: future,
    });
  });

  it('replaces reminders planned with the old texts, using the new copy', async () => {
    const future = new Date(Date.now() + 600_000).toISOString();
    vi.mocked(ops.getMedicationById).mockResolvedValue({
      ...med,
      strength: '500 mg',
      dosageUnit: 'pills',
      isActive: true,
      inventoryCount: 10,
      refillReminderType: 'doses',
      refillReminderValue: 2,
      scheduleType: 'once_daily',
      scheduleConfig: '{}',
    } as Medication);
    hoisted.scheduled = [
      { identifier: 'old-dose', content: { title: 'Medication Reminder', data: { kind: 'dose', medicationId: 'm1', scheduledTime: future, dosageUnit: 'pills' } }, trigger: {} },
      { identifier: 'old-snooze', content: { title: 'Medication Reminder (Snoozed)', data: { kind: 'snooze', medicationId: 'm1', medicationName: 'Metformin', dosageAmount: 1, dosageUnit: 'pills', scheduledTime: future } }, trigger: {} },
      { identifier: 'old-refill', content: { title: 'Refill Reminder', data: { type: 'refill', kind: 'refill', medicationId: 'm1' } }, trigger: {} },
      { identifier: 'test', content: { data: { kind: 'test' } }, trigger: {} },
    ];
    expect(await purgeLegacyReminderPayloads()).toBe(3);
    const cancelled = vi.mocked(Notifications.cancelScheduledNotificationAsync).mock.calls.map((c) => c[0]);
    expect(cancelled).toEqual(expect.arrayContaining(['old-dose', 'old-snooze', 'old-refill']));
    expect(cancelled).not.toContain('test');
    const made = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls.map(([r]) => r);
    const snooze = made.find((r) => r.identifier === 'old-snooze')!;
    expect(snooze.content).toMatchObject({ title: 'Metformin 500 mg', body: 'Still to take: 1 pill' });
    const refill = made.find((r) => (r.content.data as any)?.kind === 'refill')!;
    expect(refill.content).toMatchObject({
      title: 'Metformin 500 mg is running low',
      body: '10 pills left. Time to get a new pack.',
    });
    expect((refill.content.data as any).copy).toBe(REMINDER_COPY_VERSION);
  });

  it('dose reminders read "Medicine strength" / "Time to take N unit"', async () => {
    await scheduleNotificationsForMedication({ ...med, strength: '500 mg', dosageUnit: 'pills' } as Medication);
    const [req] = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls[0];
    // The mocked calculator returns 1 'tablet' (no translation: the unit is shown as is).
    expect(req.content.title).toBe('Metformin 500 mg');
    expect(req.content.body).toBe('Time to take 1 tablet');
  });

  it('a snoozed reminder keeps the medicine as title and says what is still to take', async () => {
    vi.mocked(ops.getMedicationById).mockResolvedValue({ ...med, strength: '850 mg' } as Medication);
    await handleReminderAction('SNOOZE', 'n1', {
      kind: 'dose',
      medicationId: 'm1',
      medicationName: 'Metformin',
      dosageAmount: 2,
      dosageUnit: 'pills',
      scheduledTime: '2026-11-10T09:00:00.000Z',
    });
    const [req] = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls[0];
    expect(req.content.title).toBe('Metformin 850 mg');
    expect(req.content.body).toBe('Still to take: 2 pills');
  });
});

describe('reminder copy', () => {
  it('uses plural-aware units and leaves out an empty strength', () => {
    expect(doseReminderContent({ name: 'Omeprazole', strength: ' ', amount: 1, unit: 'pills' })).toEqual({
      title: 'Omeprazole',
      body: 'Time to take 1 pill',
    });
    expect(doseReminderContent({ name: 'Ventolin', amount: 2, unit: 'puffs', snoozed: true }).body).toBe(
      'Still to take: 2 puffs'
    );
    expect(refillReminderContent({ name: 'Omeprazole', strength: '20 mg', count: 1, unit: 'pills' })).toEqual({
      title: 'Omeprazole 20 mg is running low',
      body: '1 pill left. Time to get a new pack.',
    });
  });
});
