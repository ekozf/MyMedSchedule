import { z } from 'zod';
import { startOfDay, isAfter, isBefore } from 'date-fns';

// Basic medication fields
export const medicationBasicSchema = z.object({
  name: z
    .string()
    .min(1, 'Please enter a name for the medication')
    .max(100, 'Medication name is too long (max 100 characters)'),
  dosageAmount: z
    .number()
    .positive('Please enter how much of the medication to take (must be greater than 0)'),
  dosageUnit: z.enum([
    'grams',
    'milligrams',
    'milliliters',
    'pills',
    'puffs',
    'drops',
    'patches',
    'units',
  ]),
  imageUri: z.string().optional(),
  notes: z.string().max(500, 'Notes are too long (max 500 characters)').optional(),
});

// Inventory fields
export const inventorySchema = z.object({
  inventoryCount: z
    .number()
    .min(0, 'Please enter a valid inventory count (cannot be negative)')
    .optional(),
  packageSize: z.number().positive('Please enter how many doses are in a full package').optional(),
});

// Safety fields
export const safetySchema = z.object({
  maxDailyDose: z.number().positive('Please enter the maximum doses allowed per day').optional(),
  minHoursBetweenDoses: z
    .number()
    .positive('Please enter the minimum hours between doses')
    .optional(),
  expirationDate: z.date().optional(),
  bypassDnd: z.boolean().optional(),
});

// Refill reminder
export const refillReminderSchema = z.object({
  refillReminderType: z.enum(['days', 'doses']).nullable().optional(),
  refillReminderValue: z
    .number()
    .positive('Please enter a valid reminder value')
    .nullable()
    .optional(),
});

// Schedule configurations
export const onceDailyConfigSchema = z.object({
  time: z
    .string()
    .regex(
      /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
      'Please enter the time in 24-hour format (e.g., 09:00)'
    ),
});

export const multipleDailyConfigSchema = z.object({
  times: z
    .array(
      z.object({
        time: z
          .string()
          .regex(
            /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
            'Please enter the time in 24-hour format (e.g., 09:00)'
          ),
        dosageAmount: z.number().positive('Please enter a valid dosage amount').optional(),
      })
    )
    .min(1, 'Please add at least one scheduled time')
    .max(12, 'You can schedule up to 12 times per day'),
});

export const everyXDaysConfigSchema = z.object({
  intervalDays: z
    .number()
    .int()
    .min(1, 'Please enter how many days between doses (at least 1 day)')
    .max(365, 'Interval cannot exceed 365 days'),
  startDate: z
    .string()
    .datetime('Please select a valid start date')
    .refine((date) => {
      const selectedDate = startOfDay(new Date(date));
      const today = startOfDay(new Date());
      return !isBefore(selectedDate, today);
    }, 'Start date cannot be in the past'),
  time: z
    .string()
    .regex(
      /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
      'Please enter the time in 24-hour format (e.g., 09:00)'
    ),
});

export const specificWeekdaysConfigSchema = z.object({
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .min(1, 'Please select at least one day of the week'),
  time: z
    .string()
    .regex(
      /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
      'Please enter the time in 24-hour format (e.g., 09:00)'
    ),
});

export const xthWeekdayConfigSchema = z.object({
  weekday: z.number().int().min(0).max(6, 'Please select a valid weekday'),
  occurrence: z.number().int().min(1).max(5, 'Please select occurrence (1st-4th or Last)'),
  time: z
    .string()
    .regex(
      /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
      'Please enter the time in 24-hour format (e.g., 09:00)'
    ),
});

export const cycleConfigSchema = z.object({
  daysOn: z
    .number()
    .int()
    .min(1, 'Please enter how many days to take the medication (must be at least 1 day)')
    .max(365, 'Days on cannot exceed 365'),
  daysOff: z
    .number()
    .int()
    .min(0, 'Please enter how many days to pause the medication (0 or more days)')
    .max(365, 'Days off cannot exceed 365'),
  cycleStartDate: z
    .string()
    .datetime('Please select a valid start date for the medication cycle')
    .refine((date) => {
      const selectedDate = startOfDay(new Date(date));
      const today = startOfDay(new Date());
      return !isBefore(selectedDate, today);
    }, 'Cycle start date cannot be in the past'),
  time: z
    .string()
    .regex(
      /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
      'Please enter the time in 24-hour format (e.g., 20:00)'
    ),
});

export const everyXHoursConfigSchema = z.object({
  intervalHours: z
    .number()
    .int()
    .min(1, 'Please enter how many hours between doses (at least 1 hour)')
    .max(24, 'Interval cannot exceed 24 hours'),
  firstDoseTime: z
    .string()
    .regex(
      /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
      'Please enter the time for the first dose in 24-hour format (e.g., 09:00)'
    ),
});

export const taperingConfigSchema = z.object({
  startDose: z.number().positive('Please enter the starting dose (must be greater than 0)'),
  decrementAmount: z
    .number()
    .positive('Please enter how much to decrease (must be greater than 0)'),
  decrementIntervalDays: z
    .number()
    .int()
    .min(1, 'Please enter how many days between decreases (at least 1 day)'),
  startDate: z
    .string()
    .datetime('Please select a valid start date')
    .refine((date) => {
      const selectedDate = startOfDay(new Date(date));
      const today = startOfDay(new Date());
      return !isBefore(selectedDate, today);
    }, 'Start date cannot be in the past'),
  time: z
    .string()
    .regex(
      /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
      'Please enter the time in 24-hour format (e.g., 09:00)'
    ),
});

export const prnConfigSchema = z.object({
  // No schedule-specific configuration for PRN.
});

// Complete medication schema
export const medicationSchema = medicationBasicSchema
  .merge(inventorySchema)
  .merge(safetySchema)
  .merge(refillReminderSchema)
  .extend({
    scheduleType: z.enum([
      'once_daily',
      'multiple_daily',
      'every_x_days',
      'specific_weekdays',
      'xth_weekday',
      'cycle',
      'every_x_hours',
      'tapering',
      'prn',
    ]),
    scheduleConfig: z.any(), // Validated separately based on scheduleType
    isPrn: z.boolean().optional(),
  });

// Relaxed variants that accept a start date in the past. Used when editing an existing medication
// whose (unchanged) start date has already passed; every other rule stays identical.
const everyXDaysConfigSchemaAllowPast = everyXDaysConfigSchema.extend({
  startDate: z.string().datetime('Please select a valid start date'),
});
const cycleConfigSchemaAllowPast = cycleConfigSchema.extend({
  cycleStartDate: z.string().datetime('Please select a valid start date for the medication cycle'),
});
const taperingConfigSchemaAllowPast = taperingConfigSchema.extend({
  startDate: z.string().datetime('Please select a valid start date'),
});

export interface ValidateScheduleConfigOptions {
  /** Accept a start date before today (edit screen, start date unchanged). Default false. */
  allowPastStartDate?: boolean;
}

// Validate schedule config based on type
export function validateScheduleConfig(
  scheduleType: string,
  config: any,
  options?: ValidateScheduleConfigOptions
): { success: boolean; error?: string } {
  const allowPast = options?.allowPastStartDate === true;
  try {
    switch (scheduleType) {
      case 'once_daily':
        onceDailyConfigSchema.parse(config);
        break;
      case 'multiple_daily':
        multipleDailyConfigSchema.parse(config);
        break;
      case 'every_x_days':
        (allowPast ? everyXDaysConfigSchemaAllowPast : everyXDaysConfigSchema).parse(config);
        break;
      case 'specific_weekdays':
        specificWeekdaysConfigSchema.parse(config);
        break;
      case 'xth_weekday':
        xthWeekdayConfigSchema.parse(config);
        break;
      case 'cycle':
        (allowPast ? cycleConfigSchemaAllowPast : cycleConfigSchema).parse(config);
        break;
      case 'every_x_hours':
        everyXHoursConfigSchema.parse(config);
        break;
      case 'tapering':
        (allowPast ? taperingConfigSchemaAllowPast : taperingConfigSchema).parse(config);
        break;
      case 'prn':
        prnConfigSchema.parse(config);
        break;
      default:
        return { success: false, error: 'Invalid schedule type' };
    }
    return { success: true };
  } catch (error: any) {
    // Provide detailed error message from Zod
    if (error.issues && error.issues.length > 0) {
      const firstIssue = error.issues[0];
      const field = firstIssue.path.join('.');
      return {
        success: false,
        error: firstIssue.message,
      };
    }
    return {
      success: false,
      error: 'Please check all schedule fields and make sure they are filled in correctly',
    };
  }
}

export type MedicationFormData = z.infer<typeof medicationSchema>;
