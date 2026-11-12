/**
 * Android 12+ (API 31) exact-alarm access ("Alarms & reminders"). Without it Android may deliver
 * reminders several minutes late. iOS / web / Android < 12: always allowed, nothing to open.
 *
 * @example
 * if (!canScheduleExactAlarms()) openExactAlarmSettings();
 */
import { Platform } from 'react-native';
import ExactAlarm from './src/ExactAlarmModule';

/** True when the platform has this special access at all (Android 12+ with the module built in). */
export function isExactAlarmPermissionSupported(): boolean {
  return Platform.OS === 'android' && Number(Platform.Version) >= 31 && ExactAlarm != null;
}

export function canScheduleExactAlarms(): boolean {
  if (!isExactAlarmPermissionSupported()) return true;
  try {
    return ExactAlarm!.canScheduleExactAlarms();
  } catch {
    return true;
  }
}

export function openExactAlarmSettings(): void {
  if (!isExactAlarmPermissionSupported()) return;
  try {
    ExactAlarm!.openExactAlarmSettings();
  } catch (error) {
    console.warn('Could not open the alarms & reminders settings:', error);
  }
}
