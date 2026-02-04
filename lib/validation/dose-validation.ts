import { subHours, differenceInHours } from 'date-fns';
import { getIntakeLogsByMedication } from '@/lib/db/operations';
import type { Medication, IntakeLog } from '@/types';

export interface DoseValidationResult {
  isValid: boolean;
  warning?: string;
  warningType?: 'max_daily_dose' | 'min_hours_between';
  details?: {
    currentDailyTotal?: number;
    newTotal?: number;
    maxAllowed?: number;
    hoursSinceLastDose?: number;
    minHoursRequired?: number;
    lastDoseTime?: Date;
  };
}

/**
 * Check if logging a dose would exceed the maximum daily dose based on a rolling 24-hour window
 */
export async function validateMaxDailyDose(
  medication: Medication,
  proposedDosageAmount: number,
  currentTime: Date = new Date()
): Promise<DoseValidationResult> {
  // If no max daily dose is set, always valid
  if (!medication.maxDailyDose) {
    return { isValid: true };
  }

  try {
    // Get all intake logs for this medication
    const logs = await getIntakeLogsByMedication(medication.id);

    // Calculate the rolling 24-hour window
    const windowStart = subHours(currentTime, 24);

    // Filter logs to only those within the last 24 hours that were "taken" or "partial"
    const recentLogs = logs.filter((log) => {
      const logTime = new Date(log.actualTime);
      return (
        logTime >= windowStart &&
        logTime <= currentTime &&
        (log.action === 'taken' || log.action === 'partial')
      );
    });

    // Sum up the dosages taken in the last 24 hours
    const currentDailyTotal = recentLogs.reduce((sum, log) => sum + log.dosageAmount, 0);

    // Calculate the new total if this dose were logged
    const newTotal = currentDailyTotal + proposedDosageAmount;

    // Check if it would exceed the max
    if (newTotal > medication.maxDailyDose) {
      return {
        isValid: false,
        warning: 'max_daily_dose_exceeded',
        warningType: 'max_daily_dose',
        details: {
          currentDailyTotal,
          newTotal,
          maxAllowed: medication.maxDailyDose,
        },
      };
    }

    return {
      isValid: true,
      details: {
        currentDailyTotal,
        newTotal,
        maxAllowed: medication.maxDailyDose,
      },
    };
  } catch (error) {
    console.error('Error validating max daily dose:', error);
    // In case of error, allow the dose but log the issue
    return { isValid: true };
  }
}

/**
 * Check if enough time has passed since the last dose
 */
export async function validateMinHoursBetweenDoses(
  medication: Medication,
  currentTime: Date = new Date()
): Promise<DoseValidationResult> {
  // If no minimum hours is set, always valid
  if (!medication.minHoursBetweenDoses) {
    return { isValid: true };
  }

  try {
    // Get all intake logs for this medication
    const logs = await getIntakeLogsByMedication(medication.id);

    // Filter to only "taken" or "partial" doses
    const takenLogs = logs.filter((log) => log.action === 'taken' || log.action === 'partial');

    if (takenLogs.length === 0) {
      // No previous doses, so it's valid
      return { isValid: true };
    }

    // Sort by actualTime descending to get the most recent
    const sortedLogs = [...takenLogs].sort((a, b) => {
      return new Date(b.actualTime).getTime() - new Date(a.actualTime).getTime();
    });

    const lastLog = sortedLogs[0];
    const lastDoseTime = new Date(lastLog.actualTime);

    // Calculate hours since last dose
    const hoursSinceLastDose = differenceInHours(currentTime, lastDoseTime);

    // Check if minimum time has passed
    if (hoursSinceLastDose < medication.minHoursBetweenDoses) {
      return {
        isValid: false,
        warning: 'min_hours_not_met',
        warningType: 'min_hours_between',
        details: {
          hoursSinceLastDose,
          minHoursRequired: medication.minHoursBetweenDoses,
          lastDoseTime,
        },
      };
    }

    return {
      isValid: true,
      details: {
        hoursSinceLastDose,
        minHoursRequired: medication.minHoursBetweenDoses,
        lastDoseTime,
      },
    };
  } catch (error) {
    console.error('Error validating min hours between doses:', error);
    // In case of error, allow the dose but log the issue
    return { isValid: true };
  }
}

/**
 * Perform all dose validations
 */
export async function validateDose(
  medication: Medication,
  proposedDosageAmount: number,
  currentTime: Date = new Date()
): Promise<{
  maxDailyDoseValidation: DoseValidationResult;
  minHoursValidation: DoseValidationResult;
  hasWarnings: boolean;
}> {
  const [maxDailyDoseValidation, minHoursValidation] = await Promise.all([
    validateMaxDailyDose(medication, proposedDosageAmount, currentTime),
    validateMinHoursBetweenDoses(medication, currentTime),
  ]);

  const hasWarnings = !maxDailyDoseValidation.isValid || !minHoursValidation.isValid;

  return {
    maxDailyDoseValidation,
    minHoursValidation,
    hasWarnings,
  };
}
