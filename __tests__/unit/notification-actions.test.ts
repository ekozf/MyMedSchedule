import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Notifications from 'expo-notifications';

vi.mock('expo-router', () => ({ router: { navigate: vi.fn() } }));
vi.mock('@/store', () => ({ useStore: { getState: () => ({}) } }));
vi.mock('@/lib/notifications/scheduler', () => ({
  ensureNext3DoseNotificationsForMedication: vi.fn(),
}));
vi.mock('@/lib/db/operations', () => ({
  createIntakeLog: vi.fn(),
  createIntakeLogAndUpdateInventory: vi.fn(),
  getActiveProfile: vi.fn(() => Promise.resolve({ id: 'p1' })),
  hasIntakeLogForDose: vi.fn(() => Promise.resolve(false)),
  InventoryInsufficientError: class extends Error {},
}));

import * as ops from '@/lib/db/operations';
import { handleReminderAction, parseTaskResponse } from '@/lib/notifications/handlers';

const doseData = {
  kind: 'dose',
  medicationId: 'm1',
  medicationName: 'Aspirin',
  dosageAmount: 1,
  scheduledTime: '2026-11-10T08:00:00.000Z',
};

// Shape Android hands the background task (NotificationSerializer.toBundle).
const taskPayload = (actionIdentifier: string) => ({
  actionIdentifier,
  notification: {
    date: 0,
    request: {
      identifier: 'n1',
      trigger: null,
      content: { title: 'Reminder', dataString: JSON.stringify(doseData) },
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  (Notifications as any).dismissNotificationAsync = vi.fn();
});

describe('parseTaskResponse', () => {
  it('reads a button press with data as a JSON string', () => {
    expect(parseTaskResponse(taskPayload('TAKE'))).toEqual({
      actionIdentifier: 'TAKE',
      notificationId: 'n1',
      data: doseData,
    });
  });

  it('ignores taps on the reminder itself and received notifications', () => {
    expect(parseTaskResponse(taskPayload('expo.modules.notifications.actions.DEFAULT'))).toBeNull();
    expect(parseTaskResponse({ notification: null, data: {} })).toBeNull();
    expect(parseTaskResponse(undefined)).toBeNull();
  });
});

describe('handleReminderAction', () => {
  it('logs Take and dismisses the reminder', async () => {
    await handleReminderAction('TAKE', 'n1', doseData);
    expect(ops.createIntakeLogAndUpdateInventory).toHaveBeenCalledTimes(1);
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('n1');
  });

  it('does not log a dose twice', async () => {
    vi.mocked(ops.hasIntakeLogForDose).mockResolvedValueOnce(true);
    await handleReminderAction('TAKE', 'n1', doseData);
    vi.mocked(ops.hasIntakeLogForDose).mockResolvedValueOnce(true);
    await handleReminderAction('SKIP', 'n1', doseData);
    expect(ops.createIntakeLogAndUpdateInventory).not.toHaveBeenCalled();
    expect(ops.createIntakeLog).not.toHaveBeenCalled();
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('snoozes with a fixed identifier per dose', async () => {
    await handleReminderAction('SNOOZE', 'n1', doseData);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: `snooze-m1-${doseData.scheduledTime}` })
    );
  });
});
