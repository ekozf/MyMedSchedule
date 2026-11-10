import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  avatarUri: text('avatar_uri'),
  settings: text('settings').notNull(), // JSON
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const medications = sqliteTable('medications', {
  id: text('id').primaryKey(),
  profileId: text('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  strength: text('strength'),
  imageUri: text('image_uri'),
  notes: text('notes'),
  dosageAmount: real('dosage_amount').notNull(),
  dosageUnit: text('dosage_unit').notNull(),
  scheduleType: text('schedule_type').notNull(),
  scheduleConfig: text('schedule_config').notNull(), // JSON
  inventoryCount: real('inventory_count').default(0),
  trackSupply: integer('track_supply', { mode: 'boolean' }).default(true),
  packageSize: real('package_size'),
  maxDailyDose: real('max_daily_dose'),
  minHoursBetweenDoses: real('min_hours_between_doses'),
  expirationDate: text('expiration_date'),
  refillReminderType: text('refill_reminder_type'),
  refillReminderValue: integer('refill_reminder_value'),
  bypassDnd: integer('bypass_dnd', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isPrn: integer('is_prn', { mode: 'boolean' }).default(false),
  scheduleStartDate: text('schedule_start_date'),
  scheduleStartExact: integer('schedule_start_exact', { mode: 'boolean' }).default(false),
  nextDoseOverrideTime: text('next_dose_override_time'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const intakeLogs = sqliteTable('intake_logs', {
  id: text('id').primaryKey(),
  medicationId: text('medication_id')
    .notNull()
    .references(() => medications.id, { onDelete: 'cascade' }),
  profileId: text('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  scheduledTime: text('scheduled_time'),
  actualTime: text('actual_time').notNull(),
  action: text('action').notNull(),
  dosageAmount: real('dosage_amount').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** Manual supply changes from the supply sheet (add / remove / set the total) and why. */
export const inventoryAdjustments = sqliteTable('inventory_adjustments', {
  id: text('id').primaryKey(),
  medicationId: text('medication_id')
    .notNull()
    .references(() => medications.id, { onDelete: 'cascade' }),
  adjustmentType: text('adjustment_type').notNull(), // 'add' | 'remove' | 'set'
  amount: real('amount').notNull(),
  previousCount: real('previous_count').notNull(),
  newCount: real('new_count').notNull(),
  reason: text('reason'), // 'refill' | 'lost' | 'correction' | 'other' | null
  createdAt: text('created_at').notNull(),
});

export const disclaimerAcknowledgments = sqliteTable('disclaimer_acknowledgments', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  acknowledgedAt: text('acknowledged_at').notNull(),
  deviceInfo: text('device_info'),
});
