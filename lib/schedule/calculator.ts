import {
  startOfDay,
  addDays,
  addHours,
  differenceInDays,
  setHours,
  setMinutes,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  format,
} from 'date-fns';
import type { Medication } from '@/types';
import i18n from '@/lib/i18n';

// Schedule config types
export interface OnceDailyConfig {
  time: string; // HH:mm format
}

export interface MultipleDailyConfig {
  times: Array<{
    time: string;
    dosageAmount?: number;
  }>;
}

export interface EveryXDaysConfig {
  intervalDays: number;
  startDate: string; // ISO string
  time: string;
}

export interface SpecificWeekdaysConfig {
  weekdays: number[]; // 0=Sun, 1=Mon, etc.
  time: string;
}

export interface XthWeekdayConfig {
  weekday: number; // 0=Sun, 1=Mon, etc.
  occurrence: number; // 1=1st, 2=2nd, 3=3rd, 4=4th, 5=Last
  time: string;
}

export interface CycleConfig {
  daysOn: number;
  daysOff: number;
  cycleStartDate: string; // ISO string
  time: string;
}

export interface EveryXHoursConfig {
  intervalHours: number;
  firstDoseTime: string; // HH:mm format
}

export interface TaperingConfig {
  startDose: number;
  decrementAmount: number;
  decrementIntervalDays: number;
  startDate: string; // ISO string
  time: string;
}

export interface PrnConfig {
  // PRN medications have no schedule config today.
}

export type ScheduleConfig =
  | OnceDailyConfig
  | MultipleDailyConfig
  | EveryXDaysConfig
  | SpecificWeekdaysConfig
  | XthWeekdayConfig
  | CycleConfig
  | EveryXHoursConfig
  | TaperingConfig
  | PrnConfig;

export interface ScheduledDose {
  medicationId: string;
  medicationName: string;
  imageUri?: string;
  notes?: string;
  time: Date;
  dosageAmount: number;
  dosageUnit: string;
  isPrn: boolean;
}

// Helper to get medication schedule start date
function getMedicationScheduleStart(medication: Medication): Date {
  if (medication.scheduleStartDate) {
    return startOfDay(medication.scheduleStartDate);
  }
  return startOfDay(medication.createdAt);
}

// Helper to parse time string (HH:mm) and set it on a date
function setTimeOnDate(date: Date, timeString: string): Date {
  // Create a new date to avoid mutating the input
  const newDate = new Date(date);
  const [hours, minutes] = timeString.split(':').map(Number);
  return setMinutes(setHours(newDate, hours), minutes);
}

// Get all doses for a medication on a specific date
export function getDosesForDate(medication: Medication, date: Date): ScheduledDose[] {
  const doses: ScheduledDose[] = [];

  // PRN medications have no scheduled doses
  if (medication.isPrn) {
    return doses;
  }

  // Gate by schedule start date: don't show doses before the schedule was created
  const scheduleStartDay = getMedicationScheduleStart(medication);
  const targetDay = startOfDay(date);

  if (targetDay < scheduleStartDay) {
    return doses; // Return empty array for dates before schedule start
  }

  try {
    const config: ScheduleConfig = JSON.parse(medication.scheduleConfig);

    switch (medication.scheduleType) {
      case 'once_daily':
        return getOnceDailyDoses(medication, date, config as OnceDailyConfig);

      case 'multiple_daily':
        return getMultipleDailyDoses(medication, date, config as MultipleDailyConfig);

      case 'every_x_days':
        return getEveryXDaysDoses(medication, date, config as EveryXDaysConfig);

      case 'specific_weekdays':
        return getSpecificWeekdaysDoses(medication, date, config as SpecificWeekdaysConfig);

      case 'xth_weekday':
        return getXthWeekdayDoses(medication, date, config as XthWeekdayConfig);

      case 'cycle':
        return getCycleDoses(medication, date, config as CycleConfig);

      case 'every_x_hours':
        return getEveryXHoursDoses(medication, date, config as EveryXHoursConfig);

      case 'tapering':
        return getTaperingDoses(medication, date, config as TaperingConfig);

      case 'prn':
        return []; // PRN has no scheduled doses

      default:
        console.warn(`Unknown schedule type: ${medication.scheduleType}`);
        return [];
    }
  } catch (error) {
    console.error('Error parsing schedule config:', error);
    return [];
  }
}

function getOnceDailyDoses(
  medication: Medication,
  date: Date,
  config: OnceDailyConfig
): ScheduledDose[] {
  // Ensure we use a fresh date object to avoid mutations
  const targetDate = startOfDay(date);
  const doseTime = setTimeOnDate(targetDate, config.time);

  return [
    {
      medicationId: medication.id,
      medicationName: medication.name,
      imageUri: medication.imageUri,
      notes: medication.notes,
      time: doseTime,
      dosageAmount: medication.dosageAmount,
      dosageUnit: medication.dosageUnit,
      isPrn: false,
    },
  ];
}

function getMultipleDailyDoses(
  medication: Medication,
  date: Date,
  config: MultipleDailyConfig
): ScheduledDose[] {
  // Ensure we use a fresh date object to avoid mutations
  const targetDate = startOfDay(date);
  return config.times.map(({ time, dosageAmount }) => ({
    medicationId: medication.id,
    medicationName: medication.name,
    imageUri: medication.imageUri,
    notes: medication.notes,
    time: setTimeOnDate(targetDate, time),
    dosageAmount: dosageAmount ?? medication.dosageAmount,
    dosageUnit: medication.dosageUnit,
    isPrn: false,
  }));
}

function getEveryXDaysDoses(
  medication: Medication,
  date: Date,
  config: EveryXDaysConfig
): ScheduledDose[] {
  const startDate = startOfDay(parseISO(config.startDate));
  const targetDate = startOfDay(date);
  const daysSinceStart = differenceInDays(targetDate, startDate);

  // Check if this day is a dose day
  if (daysSinceStart < 0 || daysSinceStart % config.intervalDays !== 0) {
    return [];
  }

  const doseTime = setTimeOnDate(targetDate, config.time);

  return [
    {
      medicationId: medication.id,
      medicationName: medication.name,
      imageUri: medication.imageUri,
      notes: medication.notes,
      time: doseTime,
      dosageAmount: medication.dosageAmount,
      dosageUnit: medication.dosageUnit,
      isPrn: false,
    },
  ];
}

function getSpecificWeekdaysDoses(
  medication: Medication,
  date: Date,
  config: SpecificWeekdaysConfig
): ScheduledDose[] {
  const targetDate = startOfDay(date);
  const dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon, etc.

  // Check if today is one of the specified weekdays
  if (!config.weekdays.includes(dayOfWeek)) {
    return [];
  }

  const doseTime = setTimeOnDate(targetDate, config.time);

  return [
    {
      medicationId: medication.id,
      medicationName: medication.name,
      imageUri: medication.imageUri,
      notes: medication.notes,
      time: doseTime,
      dosageAmount: medication.dosageAmount,
      dosageUnit: medication.dosageUnit,
      isPrn: false,
    },
  ];
}

function getXthWeekdayDoses(
  medication: Medication,
  date: Date,
  config: XthWeekdayConfig
): ScheduledDose[] {
  const targetDate = startOfDay(date);
  const dayOfWeek = targetDate.getDay();
  const targetWeekday = config.weekday;

  // Check if today is the target weekday
  if (dayOfWeek !== targetWeekday) {
    return [];
  }

  // Get the month's year and month
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  // Find all instances of this weekday in the current month
  const instancesInMonth: Date[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  for (let d = new Date(firstDayOfMonth); d <= lastDayOfMonth; d = addDays(d, 1)) {
    if (d.getDay() === targetWeekday) {
      instancesInMonth.push(new Date(d));
    }
  }

  // Determine which occurrence we're looking for
  let targetOccurrenceDate: Date | null = null;

  if (config.occurrence === 5) {
    // "Last" occurrence
    targetOccurrenceDate = instancesInMonth[instancesInMonth.length - 1];
  } else if (config.occurrence >= 1 && config.occurrence <= 4) {
    // 1st, 2nd, 3rd, or 4th occurrence
    targetOccurrenceDate = instancesInMonth[config.occurrence - 1] || null;
  }

  // Check if today is the target occurrence
  if (!targetOccurrenceDate || !isSameDay(targetDate, targetOccurrenceDate)) {
    return [];
  }

  const doseTime = setTimeOnDate(targetDate, config.time);

  return [
    {
      medicationId: medication.id,
      medicationName: medication.name,
      imageUri: medication.imageUri,
      notes: medication.notes,
      time: doseTime,
      dosageAmount: medication.dosageAmount,
      dosageUnit: medication.dosageUnit,
      isPrn: false,
    },
  ];
}

function getCycleDoses(medication: Medication, date: Date, config: CycleConfig): ScheduledDose[] {
  const cycleStart = startOfDay(parseISO(config.cycleStartDate));
  const targetDate = startOfDay(date);
  const daysSinceCycleStart = differenceInDays(targetDate, cycleStart);

  // If date is before cycle start, no dose
  if (daysSinceCycleStart < 0) {
    return [];
  }

  const cycleLength = config.daysOn + config.daysOff;
  const positionInCycle = daysSinceCycleStart % cycleLength;

  // If in "off" period, no dose
  if (positionInCycle >= config.daysOn) {
    return [];
  }

  const doseTime = setTimeOnDate(targetDate, config.time);

  return [
    {
      medicationId: medication.id,
      medicationName: medication.name,
      imageUri: medication.imageUri,
      notes: medication.notes,
      time: doseTime,
      dosageAmount: medication.dosageAmount,
      dosageUnit: medication.dosageUnit,
      isPrn: false,
    },
  ];
}

function getEveryXHoursDoses(
  medication: Medication,
  date: Date,
  config: EveryXHoursConfig
): ScheduledDose[] {
  const doses: ScheduledDose[] = [];
  const startOfTargetDay = startOfDay(date);
  const endOfTargetDay = addDays(startOfTargetDay, 1);

  // Parse first dose time
  const [hours, minutes] = config.firstDoseTime.split(':').map(Number);

  // Start from midnight of the target day
  let currentDose = setMinutes(setHours(startOfTargetDay, hours), minutes);

  // If first dose time hasn't occurred yet today, start from previous day
  if (isAfter(currentDose, endOfTargetDay)) {
    currentDose = addHours(currentDose, -24);
  }

  // Generate doses for the entire day
  while (isBefore(currentDose, endOfTargetDay)) {
    // Only include doses that fall on the target day
    if (!isBefore(currentDose, startOfTargetDay)) {
      doses.push({
        medicationId: medication.id,
        medicationName: medication.name,
        imageUri: medication.imageUri,
        notes: medication.notes,
        time: currentDose,
        dosageAmount: medication.dosageAmount,
        dosageUnit: medication.dosageUnit,
        isPrn: false,
      });
    }

    currentDose = addHours(currentDose, config.intervalHours);
  }

  return doses;
}

function getTaperingDoses(
  medication: Medication,
  date: Date,
  config: TaperingConfig
): ScheduledDose[] {
  const startDate = startOfDay(parseISO(config.startDate));
  const targetDate = startOfDay(date);
  const daysSinceStart = differenceInDays(targetDate, startDate);

  // If date is before start, no dose
  if (daysSinceStart < 0) {
    return [];
  }

  // Calculate current dosage based on tapering schedule
  const decrementsCounted = Math.floor(daysSinceStart / config.decrementIntervalDays);
  const currentDose = config.startDose - decrementsCounted * config.decrementAmount;

  // If dose has reached zero or below, no more doses (medication should be marked inactive)
  if (currentDose <= 0) {
    return [];
  }

  const doseTime = setTimeOnDate(targetDate, config.time);

  return [
    {
      medicationId: medication.id,
      medicationName: medication.name,
      imageUri: medication.imageUri,
      notes: medication.notes,
      time: doseTime,
      dosageAmount: currentDose,
      dosageUnit: medication.dosageUnit,
      isPrn: false,
    },
  ];
}

// Get all doses for multiple medications on a specific date
export function getAllDosesForDate(medications: Medication[], date: Date): ScheduledDose[] {
  const allDoses: ScheduledDose[] = [];
  // Use Date.now() so tests can control time deterministically.
  const now = new Date(Date.now());

  for (const medication of medications) {
    if (!medication.isActive) continue;

    let doses = getDosesForDate(medication, date);

    // Handle next-dose override: affects ONLY the next scheduled occurrence.
    // Implementation note: do NOT use proximity-based replacement, since the user may pick an override far from
    // the original next dose. Instead: remove the base "next dose" occurrence and insert the override occurrence.
    if (medication.nextDoseOverrideTime) {
      const overrideTime = new Date(medication.nextDoseOverrideTime);

      // Skip if override is in the past (should be cleared, but handle gracefully)
      if (isBefore(overrideTime, now)) {
        // Override is stale, skip it
        allDoses.push(...doses);
        continue;
      }

      const baseMedication: Medication = { ...medication, nextDoseOverrideTime: undefined };
      const originalNext = getNextDose(baseMedication, now);

      // Remove the original next occurrence from its scheduled day
      if (originalNext && isSameDay(originalNext.time, date)) {
        doses = doses.filter((d) => d.time.getTime() !== originalNext.time.getTime());
      }

      // Insert the override occurrence on its day
      if (isSameDay(overrideTime, date)) {
        const seed = originalNext ?? {
          medicationId: medication.id,
          medicationName: medication.name,
          imageUri: medication.imageUri,
          notes: medication.notes,
          time: overrideTime,
          dosageAmount: medication.dosageAmount,
          dosageUnit: medication.dosageUnit,
          isPrn: false,
        };

        doses.push({
          ...seed,
          time: overrideTime,
        });
      }
    }

    allDoses.push(...doses);
  }

  // Sort by time
  allDoses.sort((a, b) => a.time.getTime() - b.time.getTime());

  return allDoses;
}

// Get the next scheduled dose for a medication after a given time
export function getNextDose(
  medication: Medication,
  afterTime: Date = new Date()
): ScheduledDose | null {
  if (medication.isPrn || !medication.isActive) {
    return null;
  }

  // If there's a next-dose override and it's in the future, return it
  if (medication.nextDoseOverrideTime) {
    const overrideTime = new Date(medication.nextDoseOverrideTime);
    if (isAfter(overrideTime, afterTime)) {
      return {
        medicationId: medication.id,
        medicationName: medication.name,
        imageUri: medication.imageUri,
        notes: medication.notes,
        time: overrideTime,
        dosageAmount: medication.dosageAmount,
        dosageUnit: medication.dosageUnit,
        isPrn: false,
      };
    }
  }

  // Check doses for the next 30 days
  for (let i = 0; i < 30; i++) {
    const checkDate = addDays(startOfDay(afterTime), i);
    const doses = getDosesForDate(medication, checkDate);

    for (const dose of doses) {
      if (isAfter(dose.time, afterTime)) {
        return dose;
      }
    }
  }

  return null;
}

// Get a human-readable description of the schedule
export function getScheduleDescription(medication: Medication): string {
  if (medication.isPrn) {
    return i18n.t('schedule.description.prn');
  }

  try {
    const config: ScheduleConfig = JSON.parse(medication.scheduleConfig);

    switch (medication.scheduleType) {
      case 'once_daily':
        return i18n.t('schedule.description.onceDaily', {
          time: (config as OnceDailyConfig).time,
        });

      case 'multiple_daily':
        const dailyCount = (config as MultipleDailyConfig).times.length;
        return i18n.t(
          dailyCount === 1
            ? 'schedule.description.timesDaily'
            : 'schedule.description.timesDaily_other',
          { count: dailyCount }
        );

      case 'every_x_days':
        const intervalDays = (config as EveryXDaysConfig).intervalDays;
        return i18n.t(
          intervalDays === 1
            ? 'schedule.description.everyXDays'
            : 'schedule.description.everyXDays_other',
          { count: intervalDays }
        );

      case 'specific_weekdays':
        const { weekdays } = config as SpecificWeekdaysConfig;
        const shortKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
        const selectedDays = weekdays
          .map((d) => shortKeys[d])
          .filter(Boolean)
          .map((k) => i18n.t(`medications.weekdaysShort.${k}`))
          .join(', ');
        return i18n.t('schedule.description.specificWeekdays', { days: selectedDays });

      case 'xth_weekday':
        const xthConfig = config as XthWeekdayConfig;
        const weekdayKeys = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ] as const;
        const weekdayKey = weekdayKeys[xthConfig.weekday];
        const weekdayName = weekdayKey ? i18n.t(`medications.weekdays.${weekdayKey}`) : '';
        const occurrenceName =
          xthConfig.occurrence === 1
            ? i18n.t('medications.occurrences.first')
            : xthConfig.occurrence === 2
              ? i18n.t('medications.occurrences.second')
              : xthConfig.occurrence === 3
                ? i18n.t('medications.occurrences.third')
                : xthConfig.occurrence === 4
                  ? i18n.t('medications.occurrences.fourth')
                  : xthConfig.occurrence === 5
                    ? i18n.t('medications.occurrences.last')
                    : i18n.t('schedule.description.occurrenceNth', { n: xthConfig.occurrence });

        return i18n.t('schedule.description.xthWeekday', {
          occurrence: occurrenceName,
          weekday: weekdayName,
        });

      case 'cycle':
        const { daysOn, daysOff } = config as CycleConfig;
        return i18n.t('schedule.description.cycle', { daysOn, daysOff });

      case 'every_x_hours':
        const { intervalHours } = config as EveryXHoursConfig;
        return i18n.t(
          intervalHours === 1
            ? 'schedule.description.everyXHours'
            : 'schedule.description.everyXHours_other',
          { count: intervalHours }
        );

      case 'tapering':
        const taperingConfig = config as TaperingConfig;
        return i18n.t('schedule.description.tapering', {
          startDose: taperingConfig.startDose,
          decrementAmount: taperingConfig.decrementAmount,
          decrementIntervalDays: taperingConfig.decrementIntervalDays,
        });

      default:
        return i18n.t('schedule.description.custom');
    }
  } catch (error) {
    return i18n.t('schedule.description.invalid');
  }
}
