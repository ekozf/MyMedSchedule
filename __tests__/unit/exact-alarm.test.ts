import { describe, it, expect, vi } from 'vitest';

const native = vi.hoisted(() => ({ granted: false }));
vi.mock('@/modules/exact-alarm', () => ({
  isExactAlarmPermissionSupported: () => true,
  canScheduleExactAlarms: () => native.granted,
  openExactAlarmSettings: vi.fn(),
}));
vi.mock('@/lib/notifications/scheduler', () => ({
  rescheduleDoseRemindersForActiveProfile: vi.fn(async () => {}),
}));

import { checkExactAlarmPermission } from '@/lib/notifications/use-exact-alarm';
import { rescheduleDoseRemindersForActiveProfile } from '@/lib/notifications/scheduler';

describe('exact alarm permission', () => {
  it('reschedules reminders once when access flips to granted', () => {
    expect(checkExactAlarmPermission()).toBe(false);
    expect(checkExactAlarmPermission()).toBe(false);
    expect(rescheduleDoseRemindersForActiveProfile).not.toHaveBeenCalled();
    native.granted = true;
    expect(checkExactAlarmPermission()).toBe(true);
    expect(checkExactAlarmPermission()).toBe(true);
    expect(rescheduleDoseRemindersForActiveProfile).toHaveBeenCalledTimes(1);
  });
});
