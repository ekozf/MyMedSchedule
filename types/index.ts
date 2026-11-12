// Profile types
export interface Profile {
  id: string;
  name: string;
  avatarUri?: string;
  settings: ProfileSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileSettings {
  language: 'en' | 'tr' | 'nl';
  use24HourTime: boolean;
  authRequired: boolean;
  /** "HH:mm" starts of Midday, Evening and Night. Morning is everything before `midday`. */
  compartmentBoundaries?: CompartmentBoundaries;
  /** Light / dark look. Default 'system' (follow the phone). */
  appearance?: Appearance;
  /** The "Let reminders arrive on time" sheet (Android exact alarms) was shown once. */
  exactAlarmPromptShown?: boolean;
}

export type Appearance = 'system' | 'light' | 'dark';

export type CompartmentId = 'morning' | 'midday' | 'evening' | 'night';

export interface CompartmentBoundaries {
  midday: string;
  evening: string;
  night: string;
}

// Medication types
export type DosageUnit =
  | 'grams'
  | 'milligrams'
  | 'milliliters'
  | 'pills'
  | 'puffs'
  | 'drops'
  | 'patches'
  | 'units';

export type ScheduleType =
  | 'once_daily'
  | 'multiple_daily'
  | 'every_x_days'
  | 'specific_weekdays'
  | 'xth_weekday'
  | 'cycle'
  | 'every_x_hours'
  | 'tapering'
  | 'prn';

export interface Medication {
  id: string;
  profileId: string;
  name: string;
  /** Free text as printed on the box, like "500 mg". Part of how the medicine is identified. */
  strength?: string;
  imageUri?: string;
  notes?: string;
  dosageAmount: number;
  dosageUnit: DosageUnit;
  scheduleType: ScheduleType;
  scheduleConfig: string; // JSON string for now
  inventoryCount: number;
  /**
   * False when the person skipped the supply step (or never entered a count). Then there is no
   * low/empty warning, no refill reminder and logging does not touch `inventoryCount`.
   */
  trackSupply: boolean;
  packageSize?: number;
  maxDailyDose?: number;
  minHoursBetweenDoses?: number;
  expirationDate?: Date;
  refillReminderType?: 'days' | 'doses' | null;
  refillReminderValue?: number | null;
  bypassDnd: boolean;
  isActive: boolean;
  isPrn: boolean;
  scheduleStartDate?: Date;
  /**
   * True when the schedule began exactly at `scheduleStartDate` (a schedule edited today), so times
   * earlier that day are not generated. See `getScheduleStartMoment`.
   */
  scheduleStartExact?: boolean;
  nextDoseOverrideTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Intake log types
export type IntakeAction = 'taken' | 'skipped' | 'partial';

export interface IntakeLog {
  id: string;
  medicationId: string;
  profileId: string;
  scheduledTime?: Date;
  actualTime: Date;
  action: IntakeAction;
  dosageAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// App state types
export interface AppState {
  hasAcknowledgedDisclaimer: boolean;
  activeProfileId?: string;
  isAuthenticated: boolean;
}
