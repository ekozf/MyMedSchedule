import type { Medication } from '@/types';
import { getDosesForDate } from '@/lib/schedule/calculator';

export type RefillReminderBasis = 'doses' | 'days';

export interface RunningLowStatus {
  isRunningLow: boolean;
  basis: RefillReminderBasis;
  threshold: number;
  remainingDoses: number;
  remainingDays: number | null;
}

function estimateRemainingDoses(medication: Medication): number {
  const perDose = medication.dosageAmount > 0 ? medication.dosageAmount : 1;
  const remaining = medication.inventoryCount / perDose;
  if (!Number.isFinite(remaining) || remaining <= 0) return 0;
  return Math.floor(remaining);
}

function safeParseConfig(medication: Medication): any | null {
  try {
    return JSON.parse(medication.scheduleConfig);
  } catch {
    return null;
  }
}

function estimateDailyUsage(medication: Medication, now: Date): number | null {
  if (medication.isPrn) return null;
  if (medication.inventoryCount <= 0) return null;

  const config = safeParseConfig(medication);
  if (!config) return null;

  switch (medication.scheduleType) {
    case 'once_daily':
      return medication.dosageAmount;
    case 'multiple_daily': {
      const times: Array<{ time: string; dosageAmount?: number }> = config.times ?? [];
      if (!Array.isArray(times) || times.length === 0) return null;
      return times.reduce((sum, t) => sum + (t?.dosageAmount ?? medication.dosageAmount), 0);
    }
    case 'every_x_days':
      return medication.dosageAmount / Math.max(1, config.intervalDays ?? 1);
    case 'specific_weekdays': {
      const weekdays: number[] = config.weekdays ?? [];
      if (!Array.isArray(weekdays) || weekdays.length === 0) return null;
      return (medication.dosageAmount * weekdays.length) / 7;
    }
    case 'cycle': {
      const daysOn = Math.max(0, config.daysOn ?? 0);
      const daysOff = Math.max(0, config.daysOff ?? 0);
      const cycleLength = daysOn + daysOff;
      if (cycleLength <= 0) return null;
      return (medication.dosageAmount * daysOn) / cycleLength;
    }
    case 'every_x_hours': {
      const intervalHours = Math.max(1, config.intervalHours ?? 24);
      return medication.dosageAmount * (24 / intervalHours);
    }
    default:
      break;
  }

  return null;
}

function estimateDaysUntilDepletedBySimulation(
  medication: Medication,
  now: Date,
  maxDaysToLookAhead: number
): number | null {
  if (medication.isPrn) return null;

  let remaining = medication.inventoryCount;
  let sawAnyDose = false;

  for (let dayIndex = 0; dayIndex <= maxDaysToLookAhead; dayIndex++) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + dayIndex);

    const doses = getDosesForDate(medication, day);
    if (doses.length > 0) sawAnyDose = true;

    const totalForDay = doses.reduce((sum, d) => sum + (d?.dosageAmount ?? 0), 0);
    if (totalForDay > 0) {
      remaining -= totalForDay;
      if (remaining <= 0) {
        return dayIndex;
      }
    }
  }

  if (!sawAnyDose) return null;
  return null;
}

function estimateDaysRemaining(medication: Medication, now: Date): number | null {
  // Fast path for common schedules.
  const dailyUsage = estimateDailyUsage(medication, now);
  if (dailyUsage !== null && dailyUsage > 0) {
    return medication.inventoryCount / dailyUsage;
  }

  // Robust path for complex schedules (tapering, xth_weekday, etc.).
  const daysUntilDepleted = estimateDaysUntilDepletedBySimulation(medication, now, 3650);
  if (daysUntilDepleted === null) return null;
  return daysUntilDepleted;
}

export function getRunningLowStatus(
  medication: Medication,
  now: Date = new Date()
): RunningLowStatus | null {
  const type = medication.refillReminderType;
  const value = medication.refillReminderValue;

  if (!type || !value || value <= 0) return null;

  // PRN: only dose-based reminder is meaningful.
  if (medication.isPrn && type === 'days') return null;

  if (type === 'doses') {
    const remainingDoses = estimateRemainingDoses(medication);
    return {
      isRunningLow: remainingDoses <= value,
      basis: 'doses',
      threshold: value,
      remainingDoses,
      remainingDays: null,
    };
  }

  if (type === 'days') {
    const daysRemaining = estimateDaysRemaining(medication, now);
    if (daysRemaining === null) return null;

    const remainingDays = Math.ceil(daysRemaining);

    return {
      isRunningLow: daysRemaining <= value,
      basis: 'days',
      threshold: value,
      remainingDoses: estimateRemainingDoses(medication),
      remainingDays,
    };
  }

  return null;
}
