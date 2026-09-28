import { describe, it, expect } from 'vitest';
import { addDays, startOfDay } from 'date-fns';
import {
  SCHEDULE_TYPES,
  createEmptyForm,
  cyclePattern,
  defaultConfigFor,
  everyXHoursTimes,
  formFromMedication,
  formsEqual,
  isStartDateUnchanged,
  nextFreeTime,
  normalizeConfig,
  stepsFor,
  taperingSteps,
  toCreateInput,
  toUpdateInput,
  validateAll,
  validateSchedule,
  validateStep,
  type MedicineForm,
} from '@/components/editor/form-model';
import { medicineFormReducer } from '@/components/editor/useMedicineForm';
import type { Medication } from '@/types';

const now = new Date();

function med(patch: Partial<Medication> = {}): Medication {
  return {
    id: 'm1',
    profileId: 'p1',
    name: 'Metformin',
    dosageAmount: 1,
    dosageUnit: 'pills',
    scheduleType: 'once_daily',
    scheduleConfig: JSON.stringify({ time: '08:00' }),
    inventoryCount: 30,
    bypassDnd: false,
    isActive: true,
    isPrn: false,
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

describe('editor form model', () => {
  describe('defaultConfigFor', () => {
    it('emits a valid config for every type except weekdays (user must pick)', () => {
      for (const type of SCHEDULE_TYPES) {
        const result = validateSchedule(type, defaultConfigFor(type));
        if (type === 'specific_weekdays') {
          expect(result).toMatchObject({ ok: false, issue: 'pickDay' });
        } else {
          expect(result.ok).toBe(true);
        }
      }
    });

    it('uses the documented defaults', () => {
      expect(defaultConfigFor('once_daily')).toEqual({ time: '08:00' });
      expect(defaultConfigFor('multiple_daily')).toEqual({
        times: [{ time: '08:00' }, { time: '20:00' }],
      });
      expect(defaultConfigFor('every_x_hours')).toEqual({
        intervalHours: 8,
        firstDoseTime: '08:00',
      });
      expect(defaultConfigFor('xth_weekday')).toEqual({ occurrence: 1, weekday: 1, time: '08:00' });
      expect(defaultConfigFor('cycle', { now })).toMatchObject({ daysOn: 21, daysOff: 7 });
      expect(defaultConfigFor('every_x_days', { now })).toMatchObject({
        intervalDays: 2,
        startDate: startOfDay(now).toISOString(),
      });
      expect(defaultConfigFor('tapering', { dosageAmount: 4 })).toMatchObject({
        startDose: 4,
        decrementAmount: 1,
        decrementIntervalDays: 7,
      });
      expect(defaultConfigFor('prn')).toEqual({});
    });
  });

  describe('normalizeConfig', () => {
    it('fills missing keys and keeps valid values', () => {
      expect(normalizeConfig('once_daily', {})).toEqual({ time: '08:00' });
      expect(normalizeConfig('once_daily', { time: '21:15' })).toEqual({ time: '21:15' });
      expect(normalizeConfig('every_x_hours', { intervalHours: 6 })).toEqual({
        intervalHours: 6,
        firstDoseTime: '08:00',
      });
      expect(normalizeConfig('specific_weekdays', { weekdays: [5, 1, 1, 9], time: 'x' })).toEqual({
        weekdays: [1, 5],
        time: '08:00',
      });
    });

    it('sorts multiple_daily times and keeps per-time amounts', () => {
      expect(
        normalizeConfig('multiple_daily', {
          times: [{ time: '20:00' }, { time: '08:00', dosageAmount: 2 }, { time: 'bad' }],
        })
      ).toEqual({ times: [{ time: '08:00', dosageAmount: 2 }, { time: '20:00' }] });
    });
  });

  describe('schedule helpers', () => {
    it('every_x_hours times follow the calculator (reset at first dose each day)', () => {
      expect(everyXHoursTimes({ intervalHours: 8, firstDoseTime: '08:00' })).toEqual([
        '08:00',
        '16:00',
      ]);
      expect(everyXHoursTimes({ intervalHours: 6, firstDoseTime: '00:00' })).toEqual([
        '00:00',
        '06:00',
        '12:00',
        '18:00',
      ]);
    });

    it('tapering steps stop before zero', () => {
      expect(
        taperingSteps({
          startDose: 4,
          decrementAmount: 1,
          decrementIntervalDays: 7,
          startDate: '',
          time: '08:00',
        })
      ).toEqual({ doses: [4, 3, 2, 1], more: false });
      expect(
        taperingSteps(
          {
            startDose: 10,
            decrementAmount: 0.5,
            decrementIntervalDays: 1,
            startDate: '',
            time: '',
          },
          3
        )
      ).toEqual({ doses: [10, 9.5, 9], more: true });
    });

    it('cycle pattern', () => {
      const p = cyclePattern({ daysOn: 2, daysOff: 1, cycleStartDate: '', time: '' }, 6);
      expect(p).toEqual([true, true, false, true, true, false]);
    });

    it('nextFreeTime avoids duplicates', () => {
      expect(nextFreeTime([])).toBe('08:00');
      expect(nextFreeTime([{ time: '08:00' }, { time: '20:00' }])).toBe('00:00');
      expect(nextFreeTime([{ time: '08:00' }, { time: '12:00' }])).toBe('16:00');
    });
  });

  describe('validateStep', () => {
    const form = createEmptyForm();

    it('name', () => {
      expect(validateStep('name', form)).toMatchObject({ ok: false, issue: 'nameRequired' });
      expect(validateStep('name', { ...form, name: '   ' }).ok).toBe(false);
      expect(validateStep('name', { ...form, name: 'x'.repeat(101) }).issue).toBe('nameTooLong');
      expect(validateStep('name', { ...form, name: 'Metformin' }).ok).toBe(true);
    });

    it('dose', () => {
      expect(validateStep('dose', { ...form, dosageAmount: 0 }).issue).toBe('doseRequired');
      expect(validateStep('dose', form).ok).toBe(true);
    });

    it('when: friendly issues backed by the zod rules', () => {
      const past = addDays(startOfDay(now), -3).toISOString();
      const f: MedicineForm = {
        ...form,
        scheduleType: 'every_x_days',
        scheduleConfig: { intervalDays: 2, startDate: past, time: '08:00' },
      };
      expect(validateStep('when', f)).toMatchObject({ ok: false, issue: 'startInPast' });
      expect(validateStep('when', f, { allowPastStartDate: true }).ok).toBe(true);
      expect(
        validateStep('when', {
          ...form,
          scheduleType: 'multiple_daily',
          scheduleConfig: { times: [] },
        }).issue
      ).toBe('addTime');
      expect(
        validateStep('when', {
          ...form,
          scheduleType: 'cycle',
          scheduleConfig: {
            daysOn: 0,
            daysOff: 7,
            cycleStartDate: now.toISOString(),
            time: '08:00',
          },
        }).issue
      ).toBe('daysOnRange');
      expect(validateStep('when', { ...form, scheduleType: 'prn', scheduleConfig: {} }).ok).toBe(
        true
      );
    });

    it('supply needs a refill value when a reminder is on', () => {
      expect(
        validateStep('supply', { ...form, refillReminderType: 'days', refillReminderValue: null })
          .issue
      ).toBe('refillValue');
      expect(
        validateStep('supply', { ...form, refillReminderType: 'doses', refillReminderValue: 5 }).ok
      ).toBe(true);
    });

    it('validateAll reports the first failing step', () => {
      expect(validateAll(form).step).toBe('name');
      const ok = { ...form, name: 'Metformin' };
      expect(validateAll(ok).result.ok).toBe(true);
      const noDays = {
        ...ok,
        scheduleType: 'specific_weekdays' as const,
        scheduleConfig: { weekdays: [], time: '08:00' },
      };
      expect(validateAll(noDays).step).toBe('when');
    });

    it('as-needed medicines skip the "When?" step', () => {
      expect(stepsFor({ scheduleType: 'prn' })).not.toContain('when');
      expect(stepsFor({ scheduleType: 'once_daily' })).toContain('when');
    });
  });

  describe('mappers', () => {
    it('toCreateInput matches the old add screen', () => {
      const form: MedicineForm = {
        ...createEmptyForm(),
        name: '  Metformin ',
        notes: '  ',
        dosageAmount: 2,
        scheduleType: 'multiple_daily',
        scheduleConfig: { times: [{ time: '20:00' }, { time: '08:00', dosageAmount: 1 }] },
        refillReminderType: 'none',
        refillReminderValue: 5,
      };
      expect(toCreateInput(form, 'p1')).toEqual({
        profileId: 'p1',
        name: 'Metformin',
        imageUri: undefined,
        notes: undefined,
        dosageAmount: 2,
        dosageUnit: 'pills',
        scheduleType: 'multiple_daily',
        scheduleConfig: { times: [{ time: '08:00', dosageAmount: 1 }, { time: '20:00' }] },
        inventoryCount: 0,
        packageSize: undefined,
        expirationDate: undefined,
        refillReminderType: undefined,
        refillReminderValue: undefined,
        maxDailyDose: undefined,
        minHoursBetweenDoses: undefined,
        bypassDnd: false,
        isPrn: false,
      });
    });

    it('toCreateInput marks PRN and stores an empty config', () => {
      const input = toCreateInput(
        { ...createEmptyForm(), name: 'Ibuprofen', scheduleType: 'prn', scheduleConfig: {} },
        'p1'
      );
      expect(input.isPrn).toBe(true);
      expect(input.scheduleConfig).toEqual({});
    });

    it('toUpdateInput: refill none → null, removed values → null, untouched optional → undefined', () => {
      const initial = formFromMedication(
        med({
          notes: 'with food',
          imageUri: 'file://a.jpg',
          packageSize: 30,
          maxDailyDose: 4,
          refillReminderType: 'days',
          refillReminderValue: 7,
        })
      );
      const edited: MedicineForm = {
        ...initial,
        notes: '',
        imageUri: null,
        packageSize: null,
        maxDailyDose: null,
        refillReminderType: 'none',
        refillReminderValue: null,
      };
      const input = toUpdateInput(edited, initial);
      expect(input.refillReminderType).toBeNull();
      expect(input.refillReminderValue).toBeNull();
      expect(input.notes).toBeNull();
      expect(input.imageUri).toBeNull();
      expect(input.packageSize).toBeNull();
      expect(input.maxDailyDose).toBeNull();
      expect(input.minHoursBetweenDoses).toBeUndefined();
      expect(input.isPrn).toBe(false);
      expect(input.scheduleConfig).toEqual({ time: '08:00' });
    });

    it('formFromMedication round-trips and is not dirty', () => {
      const m = med({
        scheduleType: 'every_x_hours',
        scheduleConfig: JSON.stringify({ intervalHours: 6, firstDoseTime: '07:30' }),
        refillReminderType: null,
      });
      const form = formFromMedication(m);
      expect(form.refillReminderType).toBe('none');
      expect(form.scheduleConfig).toEqual({ intervalHours: 6, firstDoseTime: '07:30' });
      expect(formsEqual(form, formFromMedication(m))).toBe(true);
      expect(formsEqual(form, { ...form, name: 'Other' })).toBe(false);
    });

    it('isStartDateUnchanged', () => {
      const past = addDays(startOfDay(now), -10).toISOString();
      const cfg = { daysOn: 21, daysOff: 7, cycleStartDate: past, time: '08:00' };
      expect(isStartDateUnchanged('cycle', cfg, 'cycle', cfg)).toBe(true);
      expect(
        isStartDateUnchanged('cycle', { ...cfg, cycleStartDate: now.toISOString() }, 'cycle', cfg)
      ).toBe(false);
      expect(
        isStartDateUnchanged('once_daily', { time: '08:00' }, 'once_daily', { time: '08:00' })
      ).toBe(false);
    });
  });

  describe('reducer', () => {
    it('changing type resets config to defaults and drops "days left" for PRN', () => {
      const start: MedicineForm = {
        ...createEmptyForm(),
        refillReminderType: 'days',
        refillReminderValue: 7,
      };
      const cycle = medicineFormReducer(start, { type: 'scheduleType', value: 'cycle' });
      expect(cycle.scheduleConfig).toMatchObject({ daysOn: 21, daysOff: 7 });
      expect(cycle.refillReminderType).toBe('days');
      const prn = medicineFormReducer(cycle, { type: 'scheduleType', value: 'prn' });
      expect(prn.scheduleConfig).toEqual({});
      expect(prn.refillReminderType).toBe('none');
      expect(prn.refillReminderValue).toBeNull();
    });
  });
});
