import { eq, and, desc, asc } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { startOfDay } from 'date-fns';
import { getDatabase } from './index';
import { profiles, medications, intakeLogs, disclaimerAcknowledgments } from './schema';
import type { Profile, ProfileSettings, Medication, IntakeLog } from '@/types';

// Generate UUID compatible with Expo Go
function generateUUID(): string {
  return Crypto.randomUUID();
}

// ============================================================================
// Profile Operations
// ============================================================================

export interface CreateProfileInput {
  name: string;
  avatarUri?: string;
  settings?: Partial<ProfileSettings>;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUri?: string;
  settings?: Partial<ProfileSettings>;
  isActive?: boolean;
}

const defaultProfileSettings: ProfileSettings = {
  language: 'en',
  use24HourTime: true,
  authRequired: false,
};

export async function createProfile(input: CreateProfileInput): Promise<Profile> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = generateUUID();
  
  const settings: ProfileSettings = {
    ...defaultProfileSettings,
    ...input.settings,
  };
  
  const profileData = {
    id,
    name: input.name,
    avatarUri: input.avatarUri,
    settings: JSON.stringify(settings),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  
  await db.insert(profiles).values(profileData);
  
  return {
    id,
    name: input.name,
    avatarUri: input.avatarUri,
    settings,
    isActive: true,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const db = getDatabase();
  const result = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  
  if (result.length === 0) return null;
  
  const profile = result[0];
  return {
    id: profile.id,
    name: profile.name,
    avatarUri: profile.avatarUri || undefined,
    settings: JSON.parse(profile.settings),
    isActive: profile.isActive ?? true,
    createdAt: new Date(profile.createdAt),
    updatedAt: new Date(profile.updatedAt),
  };
}

export async function getAllProfiles(): Promise<Profile[]> {
  const db = getDatabase();
  const result = await db.select().from(profiles).orderBy(asc(profiles.createdAt));
  
  return result.map(profile => ({
    id: profile.id,
    name: profile.name,
    avatarUri: profile.avatarUri || undefined,
    settings: JSON.parse(profile.settings),
    isActive: profile.isActive ?? true,
    createdAt: new Date(profile.createdAt),
    updatedAt: new Date(profile.updatedAt),
  }));
}

export async function getActiveProfile(): Promise<Profile | null> {
  const db = getDatabase();
  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.isActive, true))
    .limit(1);
  
  if (result.length === 0) return null;
  
  const profile = result[0];
  return {
    id: profile.id,
    name: profile.name,
    avatarUri: profile.avatarUri || undefined,
    settings: JSON.parse(profile.settings),
    isActive: profile.isActive ?? true,
    createdAt: new Date(profile.createdAt),
    updatedAt: new Date(profile.updatedAt),
  };
}

export async function updateProfile(id: string, input: UpdateProfileInput): Promise<Profile | null> {
  const db = getDatabase();
  const existing = await getProfileById(id);
  
  if (!existing) return null;
  
  const now = new Date().toISOString();
  const updatedSettings = input.settings 
    ? { ...existing.settings, ...input.settings }
    : existing.settings;
  
  const updateData: any = {
    updatedAt: now,
  };
  
  if (input.name !== undefined) updateData.name = input.name;
  if (input.avatarUri !== undefined) updateData.avatarUri = input.avatarUri;
  if (input.settings !== undefined) updateData.settings = JSON.stringify(updatedSettings);
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  
  await db.update(profiles).set(updateData).where(eq(profiles.id, id));
  
  return getProfileById(id);
}

export async function deleteProfile(id: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.delete(profiles).where(eq(profiles.id, id));
  return true;
}

export async function setActiveProfile(id: string): Promise<boolean> {
  const db = getDatabase();
  
  // First, set all profiles to inactive
  await db.update(profiles).set({ isActive: false });
  
  // Then, set the specified profile to active
  await db.update(profiles).set({ isActive: true }).where(eq(profiles.id, id));
  
  return true;
}

// ============================================================================
// Medication Operations
// ============================================================================

export interface CreateMedicationInput {
  profileId: string;
  name: string;
  imageUri?: string;
  notes?: string;
  dosageAmount: number;
  dosageUnit: string;
  scheduleType: string;
  scheduleConfig: any; // Will be stringified
  inventoryCount?: number;
  packageSize?: number;
  maxDailyDose?: number;
  minHoursBetweenDoses?: number;
  expirationDate?: Date;
  refillReminderType?: 'days' | 'doses';
  refillReminderValue?: number;
  bypassDnd?: boolean;
  isPrn?: boolean;
}

export interface UpdateMedicationInput {
  name?: string;
  imageUri?: string;
  notes?: string;
  dosageAmount?: number;
  dosageUnit?: string;
  scheduleType?: string;
  scheduleConfig?: any;
  inventoryCount?: number;
  packageSize?: number;
  maxDailyDose?: number;
  minHoursBetweenDoses?: number;
  expirationDate?: Date;
  refillReminderType?: 'days' | 'doses';
  refillReminderValue?: number;
  bypassDnd?: boolean;
  isActive?: boolean;
  isPrn?: boolean;
}

// Helper to calculate scheduleStartDate from schedule config
function calculateScheduleStartDate(scheduleType: string, scheduleConfig: any, now: Date): string {
  // For PRN medications, no schedule start date needed
  if (scheduleType === 'prn') {
    return now.toISOString();
  }

  // For schedule types with explicit start dates, use those
  if (scheduleType === 'every_x_days' && scheduleConfig?.startDate) {
    return startOfDay(new Date(scheduleConfig.startDate)).toISOString();
  }
  if (scheduleType === 'cycle' && scheduleConfig?.cycleStartDate) {
    return startOfDay(new Date(scheduleConfig.cycleStartDate)).toISOString();
  }
  if (scheduleType === 'tapering' && scheduleConfig?.startDate) {
    return startOfDay(new Date(scheduleConfig.startDate)).toISOString();
  }

  // For all other schedule types, use current date/time
  return now.toISOString();
}

export async function createMedication(input: CreateMedicationInput): Promise<Medication> {
  const db = getDatabase();
  const now = new Date();
  const nowISO = now.toISOString();
  const id = generateUUID();
  
  // Calculate scheduleStartDate based on schedule config
  const scheduleStartDateISO = calculateScheduleStartDate(input.scheduleType, input.scheduleConfig, now);
  
  const medicationData = {
    id,
    profileId: input.profileId,
    name: input.name,
    imageUri: input.imageUri,
    notes: input.notes,
    dosageAmount: input.dosageAmount,
    dosageUnit: input.dosageUnit,
    scheduleType: input.scheduleType,
    scheduleConfig: JSON.stringify(input.scheduleConfig),
    inventoryCount: input.inventoryCount ?? 0,
    packageSize: input.packageSize,
    maxDailyDose: input.maxDailyDose,
    minHoursBetweenDoses: input.minHoursBetweenDoses,
    expirationDate: input.expirationDate?.toISOString(),
    refillReminderType: input.refillReminderType,
    refillReminderValue: input.refillReminderValue,
    bypassDnd: input.bypassDnd ?? false,
    isActive: true,
    isPrn: input.isPrn ?? false,
    scheduleStartDate: scheduleStartDateISO,
    nextDoseOverrideTime: null,
    createdAt: nowISO,
    updatedAt: nowISO,
  };
  
  await db.insert(medications).values(medicationData);
  
  return {
    id,
    profileId: input.profileId,
    name: input.name,
    imageUri: input.imageUri,
    notes: input.notes,
    dosageAmount: input.dosageAmount,
    dosageUnit: input.dosageUnit as any,
    scheduleType: input.scheduleType as any,
    scheduleConfig: JSON.stringify(input.scheduleConfig),
    inventoryCount: input.inventoryCount ?? 0,
    packageSize: input.packageSize,
    maxDailyDose: input.maxDailyDose,
    minHoursBetweenDoses: input.minHoursBetweenDoses,
    expirationDate: input.expirationDate,
    refillReminderType: input.refillReminderType,
    refillReminderValue: input.refillReminderValue,
    bypassDnd: input.bypassDnd ?? false,
    isActive: true,
    isPrn: input.isPrn ?? false,
    scheduleStartDate: new Date(scheduleStartDateISO),
    nextDoseOverrideTime: undefined,
    createdAt: new Date(nowISO),
    updatedAt: new Date(nowISO),
  };
}

export async function getMedicationById(id: string): Promise<Medication | null> {
  const db = getDatabase();
  const result = await db.select().from(medications).where(eq(medications.id, id)).limit(1);
  
  if (result.length === 0) return null;
  
  const med = result[0];
  return {
    id: med.id,
    profileId: med.profileId,
    name: med.name,
    imageUri: med.imageUri || undefined,
    notes: med.notes || undefined,
    dosageAmount: med.dosageAmount,
    dosageUnit: med.dosageUnit as any,
    scheduleType: med.scheduleType as any,
    scheduleConfig: med.scheduleConfig,
    inventoryCount: med.inventoryCount ?? 0,
    packageSize: med.packageSize || undefined,
    maxDailyDose: med.maxDailyDose || undefined,
    minHoursBetweenDoses: med.minHoursBetweenDoses || undefined,
    expirationDate: med.expirationDate ? new Date(med.expirationDate) : undefined,
    refillReminderType: med.refillReminderType as any,
    refillReminderValue: med.refillReminderValue || undefined,
    bypassDnd: med.bypassDnd ?? false,
    isActive: med.isActive ?? true,
    isPrn: med.isPrn ?? false,
    scheduleStartDate: med.scheduleStartDate ? new Date(med.scheduleStartDate) : undefined,
    nextDoseOverrideTime: med.nextDoseOverrideTime ? new Date(med.nextDoseOverrideTime) : undefined,
    createdAt: new Date(med.createdAt),
    updatedAt: new Date(med.updatedAt),
  };
}

export async function getMedicationsByProfile(profileId: string, activeOnly: boolean = true): Promise<Medication[]> {
  const db = getDatabase();
  
  let query = db.select().from(medications).where(eq(medications.profileId, profileId));
  
  if (activeOnly) {
    query = db
      .select()
      .from(medications)
      .where(and(eq(medications.profileId, profileId), eq(medications.isActive, true)));
  }
  
  const result = await query.orderBy(asc(medications.name));
  
  return result.map(med => ({
    id: med.id,
    profileId: med.profileId,
    name: med.name,
    imageUri: med.imageUri || undefined,
    notes: med.notes || undefined,
    dosageAmount: med.dosageAmount,
    dosageUnit: med.dosageUnit as any,
    scheduleType: med.scheduleType as any,
    scheduleConfig: med.scheduleConfig,
    inventoryCount: med.inventoryCount ?? 0,
    packageSize: med.packageSize || undefined,
    maxDailyDose: med.maxDailyDose || undefined,
    minHoursBetweenDoses: med.minHoursBetweenDoses || undefined,
    expirationDate: med.expirationDate ? new Date(med.expirationDate) : undefined,
    refillReminderType: med.refillReminderType as any,
    refillReminderValue: med.refillReminderValue || undefined,
    bypassDnd: med.bypassDnd ?? false,
    isActive: med.isActive ?? true,
    isPrn: med.isPrn ?? false,
    scheduleStartDate: med.scheduleStartDate ? new Date(med.scheduleStartDate) : undefined,
    nextDoseOverrideTime: med.nextDoseOverrideTime ? new Date(med.nextDoseOverrideTime) : undefined,
    createdAt: new Date(med.createdAt),
    updatedAt: new Date(med.updatedAt),
  }));
}

export async function updateMedication(id: string, input: UpdateMedicationInput): Promise<Medication | null> {
  const db = getDatabase();
  const existing = await getMedicationById(id);
  
  if (!existing) return null;
  
  const now = new Date();
  const nowISO = now.toISOString();
  const updateData: any = {
    updatedAt: nowISO,
  };
  
  // Detect schedule changes
  const scheduleChanged = input.scheduleType !== undefined || input.scheduleConfig !== undefined;
  
  if (input.name !== undefined) updateData.name = input.name;
  if (input.imageUri !== undefined) updateData.imageUri = input.imageUri;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.dosageAmount !== undefined) updateData.dosageAmount = input.dosageAmount;
  if (input.dosageUnit !== undefined) updateData.dosageUnit = input.dosageUnit;
  if (input.scheduleType !== undefined) updateData.scheduleType = input.scheduleType;
  if (input.scheduleConfig !== undefined) updateData.scheduleConfig = JSON.stringify(input.scheduleConfig);
  if (input.inventoryCount !== undefined) updateData.inventoryCount = input.inventoryCount;
  if (input.packageSize !== undefined) updateData.packageSize = input.packageSize;
  if (input.maxDailyDose !== undefined) updateData.maxDailyDose = input.maxDailyDose;
  if (input.minHoursBetweenDoses !== undefined) updateData.minHoursBetweenDoses = input.minHoursBetweenDoses;
  if (input.expirationDate !== undefined) updateData.expirationDate = input.expirationDate?.toISOString();
  if (input.refillReminderType !== undefined) updateData.refillReminderType = input.refillReminderType;
  if (input.refillReminderValue !== undefined) updateData.refillReminderValue = input.refillReminderValue;
  if (input.bypassDnd !== undefined) updateData.bypassDnd = input.bypassDnd;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.isPrn !== undefined) updateData.isPrn = input.isPrn;
  
  // If schedule changed, reset scheduleStartDate and clear override
  if (scheduleChanged) {
    const newScheduleType = input.scheduleType ?? existing.scheduleType;
    const newScheduleConfig = input.scheduleConfig ?? JSON.parse(existing.scheduleConfig);
    updateData.scheduleStartDate = calculateScheduleStartDate(newScheduleType, newScheduleConfig, now);
    updateData.nextDoseOverrideTime = null; // Clear stale override
  }
  
  await db.update(medications).set(updateData).where(eq(medications.id, id));
  
  return getMedicationById(id);
}

export async function deleteMedication(id: string): Promise<boolean> {
  const db = getDatabase();
  await db.delete(medications).where(eq(medications.id, id));
  return true;
}

export async function markMedicationInactive(id: string): Promise<Medication | null> {
  return updateMedication(id, { isActive: false });
}

export async function updateMedicationInventory(id: string, newCount: number): Promise<Medication | null> {
  return updateMedication(id, { inventoryCount: newCount });
}

// Helper functions for managing next dose override
export async function setNextDoseOverrideTime(medicationId: string, override: Date | null): Promise<Medication | null> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const updateData: any = {
    nextDoseOverrideTime: override ? override.toISOString() : null,
    updatedAt: now,
  };
  
  await db.update(medications).set(updateData).where(eq(medications.id, medicationId));
  
  return getMedicationById(medicationId);
}

export async function clearNextDoseOverrideTime(medicationId: string): Promise<Medication | null> {
  return setNextDoseOverrideTime(medicationId, null);
}

// ============================================================================
// Intake Log Operations
// ============================================================================

export interface CreateIntakeLogInput {
  medicationId: string;
  profileId: string;
  scheduledTime?: Date;
  actualTime: Date;
  action: 'taken' | 'skipped' | 'partial';
  dosageAmount: number;
  notes?: string;
}

export async function createIntakeLog(input: CreateIntakeLogInput): Promise<IntakeLog> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = generateUUID();
  
  // Handle scheduledTime - convert to ISO string if it's a Date, otherwise use as-is
  const scheduledTimeStr = input.scheduledTime 
    ? (typeof input.scheduledTime === 'string' ? input.scheduledTime : input.scheduledTime.toISOString())
    : undefined;
  
  // Handle actualTime - convert to ISO string if it's a Date, otherwise use as-is
  const actualTimeStr = typeof input.actualTime === 'string' 
    ? input.actualTime 
    : input.actualTime.toISOString();
  
  const logData = {
    id,
    medicationId: input.medicationId,
    profileId: input.profileId,
    scheduledTime: scheduledTimeStr,
    actualTime: actualTimeStr,
    action: input.action,
    dosageAmount: input.dosageAmount,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  
  await db.insert(intakeLogs).values(logData);
  
  // Check if this log matches a next-dose override and clear it if so
  if (input.scheduledTime) {
    const medication = await getMedicationById(input.medicationId);
    if (medication?.nextDoseOverrideTime) {
      const overrideTime = new Date(medication.nextDoseOverrideTime);
      const scheduledTime = typeof input.scheduledTime === 'string' 
        ? new Date(input.scheduledTime) 
        : input.scheduledTime;
      
      // Clear override if scheduledTime matches overrideTime (within 1 minute tolerance)
      const timeDiff = Math.abs(scheduledTime.getTime() - overrideTime.getTime());
      if (timeDiff < 60000) { // 1 minute tolerance
        await clearNextDoseOverrideTime(input.medicationId);
      }
    }
  }
  
  return {
    id,
    medicationId: input.medicationId,
    profileId: input.profileId,
    scheduledTime: input.scheduledTime,
    actualTime: input.actualTime,
    action: input.action,
    dosageAmount: input.dosageAmount,
    notes: input.notes,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function getIntakeLogsByMedication(medicationId: string): Promise<IntakeLog[]> {
  const db = getDatabase();
  const result = await db
    .select()
    .from(intakeLogs)
    .where(eq(intakeLogs.medicationId, medicationId))
    .orderBy(desc(intakeLogs.actualTime));
  
  return result.map(log => ({
    id: log.id,
    medicationId: log.medicationId,
    profileId: log.profileId,
    scheduledTime: log.scheduledTime ? new Date(log.scheduledTime) : undefined,
    actualTime: new Date(log.actualTime),
    action: log.action as any,
    dosageAmount: log.dosageAmount,
    notes: log.notes || undefined,
    createdAt: new Date(log.createdAt),
    updatedAt: new Date(log.updatedAt),
  }));
}

export async function getIntakeLogsByProfile(profileId: string): Promise<IntakeLog[]> {
  const db = getDatabase();
  const result = await db
    .select()
    .from(intakeLogs)
    .where(eq(intakeLogs.profileId, profileId))
    .orderBy(desc(intakeLogs.actualTime));
  
  return result.map(log => ({
    id: log.id,
    medicationId: log.medicationId,
    profileId: log.profileId,
    scheduledTime: log.scheduledTime ? new Date(log.scheduledTime) : undefined,
    actualTime: new Date(log.actualTime),
    action: log.action as any,
    dosageAmount: log.dosageAmount,
    notes: log.notes || undefined,
    createdAt: new Date(log.createdAt),
    updatedAt: new Date(log.updatedAt),
  }));
}

export async function deleteIntakeLog(id: string): Promise<boolean> {
  const db = getDatabase();
  await db.delete(intakeLogs).where(eq(intakeLogs.id, id));
  return true;
}

export interface UpdateIntakeLogInput {
  scheduledTime?: Date;
  actualTime?: Date;
  action?: 'taken' | 'skipped' | 'partial';
  dosageAmount?: number;
  notes?: string;
}

export async function updateIntakeLog(id: string, input: UpdateIntakeLogInput): Promise<IntakeLog | null> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const updateData: any = {
    updatedAt: now,
  };
  
  if (input.scheduledTime !== undefined) {
    updateData.scheduledTime = input.scheduledTime?.toISOString();
  }
  if (input.actualTime !== undefined) {
    updateData.actualTime = input.actualTime.toISOString();
  }
  if (input.action !== undefined) updateData.action = input.action;
  if (input.dosageAmount !== undefined) updateData.dosageAmount = input.dosageAmount;
  if (input.notes !== undefined) updateData.notes = input.notes;
  
  await db.update(intakeLogs).set(updateData).where(eq(intakeLogs.id, id));
  
  // Fetch and return updated log
  const result = await db.select().from(intakeLogs).where(eq(intakeLogs.id, id)).limit(1);
  if (result.length === 0) return null;
  
  const log = result[0];
  return {
    id: log.id,
    medicationId: log.medicationId,
    profileId: log.profileId,
    scheduledTime: log.scheduledTime ? new Date(log.scheduledTime) : undefined,
    actualTime: new Date(log.actualTime),
    action: log.action as any,
    dosageAmount: log.dosageAmount,
    notes: log.notes || undefined,
    createdAt: new Date(log.createdAt),
    updatedAt: new Date(log.updatedAt),
  };
}

// ============================================================================
// Inventory Adjustment Operations
// ============================================================================

export interface InventoryAdjustment {
  id: string;
  medicationId: string;
  adjustmentType: 'add' | 'remove' | 'set';
  amount: number;
  previousCount: number;
  newCount: number;
  reason?: string;
  createdAt: Date;
}

export interface CreateInventoryAdjustmentInput {
  medicationId: string;
  adjustmentType: 'add' | 'remove' | 'set';
  amount: number;
  previousCount: number;
  newCount: number;
  reason?: string;
}

export async function createInventoryAdjustment(input: CreateInventoryAdjustmentInput): Promise<InventoryAdjustment> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = generateUUID();
  
  const adjustmentData = {
    id,
    medicationId: input.medicationId,
    adjustmentType: input.adjustmentType,
    amount: input.amount,
    previousCount: input.previousCount,
    newCount: input.newCount,
    reason: input.reason,
    createdAt: now,
  };
  
  await db.insert(medications.prototype).values(adjustmentData);
  
  return {
    id,
    medicationId: input.medicationId,
    adjustmentType: input.adjustmentType,
    amount: input.amount,
    previousCount: input.previousCount,
    newCount: input.newCount,
    reason: input.reason,
    createdAt: new Date(now),
  };
}

export async function getInventoryAdjustmentsByMedication(medicationId: string): Promise<InventoryAdjustment[]> {
  const db = getDatabase();
  // Note: inventory_adjustments table would need to be added to schema
  // For now, this is a placeholder implementation
  return [];
}

// ============================================================================
// Disclaimer Operations
// ============================================================================

export interface CreateDisclaimerAcknowledgmentInput {
  profileId?: string;
  version: string;
  deviceInfo?: string;
}

export async function createDisclaimerAcknowledgment(
  input: CreateDisclaimerAcknowledgmentInput
): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = generateUUID();
  
  const data = {
    id,
    profileId: input.profileId,
    version: input.version,
    acknowledgedAt: now,
    deviceInfo: input.deviceInfo,
  };
  
  await db.insert(disclaimerAcknowledgments).values(data);
}

export async function hasAcknowledgedDisclaimer(version: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db
    .select()
    .from(disclaimerAcknowledgments)
    .where(eq(disclaimerAcknowledgments.version, version))
    .limit(1);
  
  return result.length > 0;
}

export async function getLatestDisclaimerAcknowledgment() {
  const db = getDatabase();
  const result = await db
    .select()
    .from(disclaimerAcknowledgments)
    .orderBy(desc(disclaimerAcknowledgments.acknowledgedAt))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}
