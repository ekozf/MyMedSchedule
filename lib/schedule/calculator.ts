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

export interface PrnConfig {
  lowInventoryAlert?: number;
}

export type ScheduleConfig =
  | OnceDailyConfig
  | MultipleDailyConfig
  | EveryXDaysConfig
  | SpecificWeekdaysConfig
  | CycleConfig
  | EveryXHoursConfig
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

// Helper to parse time string (HH:mm) and set it on a date
function setTimeOnDate(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  return setMinutes(setHours(date, hours), minutes);
}

// Get all doses for a medication on a specific date
export function getDosesForDate(medication: Medication, date: Date): ScheduledDose[] {
  const doses: ScheduledDose[] = [];
  
  // PRN medications have no scheduled doses
  if (medication.isPrn) {
    return doses;
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
      
      case 'cycle':
        return getCycleDoses(medication, date, config as CycleConfig);
      
      case 'every_x_hours':
        return getEveryXHoursDoses(medication, date, config as EveryXHoursConfig);
      
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
  const doseTime = setTimeOnDate(date, config.time);
  
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
  return config.times.map(({ time, dosageAmount }) => ({
    medicationId: medication.id,
    medicationName: medication.name,
    imageUri: medication.imageUri,
    notes: medication.notes,
    time: setTimeOnDate(date, time),
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
  
  const doseTime = setTimeOnDate(date, config.time);
  
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
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, etc.
  
  // Check if today is one of the specified weekdays
  if (!config.weekdays.includes(dayOfWeek)) {
    return [];
  }
  
  const doseTime = setTimeOnDate(date, config.time);
  
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

function getCycleDoses(
  medication: Medication,
  date: Date,
  config: CycleConfig
): ScheduledDose[] {
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
  
  const doseTime = setTimeOnDate(date, config.time);
  
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

// Get all doses for multiple medications on a specific date
export function getAllDosesForDate(medications: Medication[], date: Date): ScheduledDose[] {
  const allDoses: ScheduledDose[] = [];
  
  for (const medication of medications) {
    if (!medication.isActive) continue;
    
    const doses = getDosesForDate(medication, date);
    allDoses.push(...doses);
  }
  
  // Sort by time
  allDoses.sort((a, b) => a.time.getTime() - b.time.getTime());
  
  return allDoses;
}

// Get the next scheduled dose for a medication after a given time
export function getNextDose(medication: Medication, afterTime: Date = new Date()): ScheduledDose | null {
  if (medication.isPrn || !medication.isActive) {
    return null;
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
    return 'As needed (PRN)';
  }
  
  try {
    const config: ScheduleConfig = JSON.parse(medication.scheduleConfig);
    
    switch (medication.scheduleType) {
      case 'once_daily':
        return `Once daily at ${(config as OnceDailyConfig).time}`;
      
      case 'multiple_daily':
        const times = (config as MultipleDailyConfig).times;
        return `${times.length} times daily`;
      
      case 'every_x_days':
        const { intervalDays } = config as EveryXDaysConfig;
        return `Every ${intervalDays} day${intervalDays > 1 ? 's' : ''}`;
      
      case 'specific_weekdays':
        const { weekdays } = config as SpecificWeekdaysConfig;
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const selectedDays = weekdays.map(d => dayNames[d]).join(', ');
        return `On ${selectedDays}`;
      
      case 'cycle':
        const { daysOn, daysOff } = config as CycleConfig;
        return `${daysOn} days on, ${daysOff} days off`;
      
      case 'every_x_hours':
        const { intervalHours } = config as EveryXHoursConfig;
        return `Every ${intervalHours} hour${intervalHours > 1 ? 's' : ''}`;
      
      default:
        return 'Custom schedule';
    }
  } catch (error) {
    return 'Invalid schedule';
  }
}
