/**
 * Form state for adding / editing a medicine (shared by the guided add flow and the edit page).
 *
 * @example
 * const { form, update, isDirty, reset } = useMedicineForm();          // add
 * const { form, update } = useMedicineForm(formFromMedication(med));   // edit
 * update.set({ name: 'Metformin' });
 * update.setScheduleType('cycle');          // resets config to that type's defaults
 * update.setConfig({ ...config, time: '09:00' });
 */
import * as React from 'react';
import type { ScheduleType } from '@/types';
import {
  createEmptyForm,
  defaultConfigFor,
  formsEqual,
  type AnyScheduleConfig,
  type MedicineForm,
} from './form-model';

type Action =
  | { type: 'set'; patch: Partial<MedicineForm> }
  | { type: 'scheduleType'; value: ScheduleType }
  | { type: 'config'; value: AnyScheduleConfig }
  | { type: 'reset'; form: MedicineForm };

export function medicineFormReducer(state: MedicineForm, action: Action): MedicineForm {
  switch (action.type) {
    case 'set':
      return { ...state, ...action.patch };
    case 'scheduleType': {
      if (action.value === state.scheduleType) return state;
      const next: MedicineForm = {
        ...state,
        scheduleType: action.value,
        scheduleConfig: defaultConfigFor(action.value, { dosageAmount: state.dosageAmount }),
      };
      // As needed: "days left" reminders aren't meaningful (no fixed schedule to count down).
      if (action.value === 'prn' && state.refillReminderType === 'days') {
        next.refillReminderType = 'none';
        next.refillReminderValue = null;
      }
      return next;
    }
    case 'config':
      return { ...state, scheduleConfig: action.value };
    case 'reset':
      return action.form;
  }
}

export interface MedicineFormUpdater {
  set: (patch: Partial<MedicineForm>) => void;
  setScheduleType: (type: ScheduleType) => void;
  setConfig: (config: AnyScheduleConfig) => void;
}

export function useMedicineForm(initial?: MedicineForm) {
  const [baseline, setBaseline] = React.useState<MedicineForm>(() => initial ?? createEmptyForm());
  const [form, dispatch] = React.useReducer(medicineFormReducer, baseline);

  const update = React.useMemo<MedicineFormUpdater>(
    () => ({
      set: (patch) => dispatch({ type: 'set', patch }),
      setScheduleType: (value) => dispatch({ type: 'scheduleType', value }),
      setConfig: (value) => dispatch({ type: 'config', value }),
    }),
    []
  );

  /** Replace the form and make it the new "clean" baseline (e.g. after loading from the DB). */
  const reset = React.useCallback((next: MedicineForm) => {
    setBaseline(next);
    dispatch({ type: 'reset', form: next });
  }, []);

  const isDirty = React.useMemo(() => !formsEqual(form, baseline), [form, baseline]);

  return { form, update, reset, isDirty, baseline };
}
