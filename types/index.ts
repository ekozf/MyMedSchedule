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
  imageUri?: string;
  notes?: string;
  dosageAmount: number;
  dosageUnit: DosageUnit;
  scheduleType: ScheduleType;
  scheduleConfig: string; // JSON string for now
  inventoryCount: number;
  packageSize?: number;
  maxDailyDose?: number;
  minHoursBetweenDoses?: number;
  expirationDate?: Date;
  refillReminderType?: 'days' | 'doses';
  refillReminderValue?: number;
  bypassDnd: boolean;
  isActive: boolean;
  isPrn: boolean;
  scheduleStartDate?: Date;
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
