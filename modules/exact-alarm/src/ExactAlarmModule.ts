import { requireOptionalNativeModule } from 'expo';

export interface ExactAlarmNativeModule {
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): void;
}

/** null on iOS / web, and in a build made before the module was added. */
export default requireOptionalNativeModule<ExactAlarmNativeModule>('ExactAlarm');
