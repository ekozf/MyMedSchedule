import { describe, it, expect, vi, beforeAll } from 'vitest';

// lib/settings/compartments also exports a store hook; keep the DB layer out of this test.
vi.mock('@/lib/db/operations', () => ({ updateProfile: vi.fn() }));
vi.mock('@/store', () => ({ useStore: vi.fn() }));
import i18n from '@/lib/i18n';
import {
  getSupplyState,
  loggedForLine,
  medicineDisplayName,
  nextUnloggedDose,
} from '@/components/medicines/medicine-info';
import { isSupplyShort } from '@/lib/ui/supply';
import {
  createEmptyForm,
  formFromMedication,
  skipDefaults,
  toCreateInput,
  toUpdateInput,
  tracksSupply,
  validateStep,
  type MedicineForm,
} from '@/components/editor/form-model';
import { everyDayLine, everyDayTimes } from '@/components/editor/describe';
import type { IntakeLog, Medication } from '@/types';

const fmtTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function med(overrides: Partial<Medication> = {}): Medication {
  const created = new Date(2026, 9, 1, 9, 0);
  return {
    id: 'm1',
    profileId: 'p1',
    name: 'Metformin',
    dosageAmount: 1,
    dosageUnit: 'pills',
    scheduleType: 'multiple_daily',
    scheduleConfig: JSON.stringify({ times: [{ time: '08:00' }, { time: '20:00' }] }),
    inventoryCount: 29,
    trackSupply: true,
    bypassDnd: false,
    isActive: true,
    isPrn: false,
    scheduleStartDate: created,
    createdAt: created,
    updatedAt: created,
    ...overrides,
  };
}

function log(scheduled: Date | undefined, actual: Date, action: IntakeLog['action']): IntakeLog {
  return {
    id: `l-${actual.getTime()}`,
    medicationId: 'm1',
    profileId: 'p1',
    scheduledTime: scheduled,
    actualTime: actual,
    action,
    dosageAmount: 1,
    createdAt: actual,
    updatedAt: actual,
  };
}

beforeAll(() => {
  i18n.locale = 'en';
});

describe('next dose reflects what was logged', () => {
  const now = new Date(2026, 10, 9, 14, 40);
  const tonight = new Date(2026, 10, 9, 20, 0);
  const tomorrowMorning = new Date(2026, 10, 10, 8, 0);

  it('is tonight when nothing is logged', () => {
    expect(nextUnloggedDose(med(), [], now)?.time).toEqual(tonight);
  });

  it('skips the 20:00 dose recorded early at 14:36', () => {
    const logs = [log(tonight, new Date(2026, 10, 9, 14, 36), 'taken')];
    expect(nextUnloggedDose(med(), logs, now)?.time).toEqual(tomorrowMorning);
  });

  it('skips partial and skipped doses too', () => {
    expect(nextUnloggedDose(med(), [log(tonight, now, 'skipped')], now)?.time).toEqual(
      tomorrowMorning
    );
    expect(nextUnloggedDose(med(), [log(tonight, now, 'partial')], now)?.time).toEqual(
      tomorrowMorning
    );
  });

  it('ignores logs of other medicines and as-needed logs', () => {
    const other = { ...log(tonight, now, 'taken'), medicationId: 'm2' };
    const prn = log(undefined, now, 'taken');
    expect(nextUnloggedDose(med(), [other, prn], now)?.time).toEqual(tonight);
  });

  it('is null for as-needed and paused medicines', () => {
    expect(nextUnloggedDose(med({ isPrn: true, scheduleType: 'prn' }), [], now)).toBeNull();
    expect(nextUnloggedDose(med({ isActive: false }), [], now)).toBeNull();
  });

  it('says which dose a log was recorded for', () => {
    const l = log(tonight, new Date(2026, 10, 9, 14, 36), 'taken');
    expect(loggedForLine(l, fmtTime, now)).toBe('Recorded for today’s 20:00 dose');
    expect(loggedForLine(log(undefined, now, 'taken'), fmtTime, now)).toBeNull();
  });
});

describe('strength in the display name', () => {
  it('adds the trimmed strength after the name', () => {
    expect(medicineDisplayName({ name: 'Metformin', strength: ' 500 mg ' })).toBe(
      'Metformin 500 mg'
    );
    expect(medicineDisplayName({ name: 'Metformin' })).toBe('Metformin');
    expect(medicineDisplayName({ name: 'Metformin', strength: '  ' })).toBe('Metformin');
  });

  it('is validated on step 1 (max 40, trimmed)', () => {
    const form: MedicineForm = { ...createEmptyForm(), name: 'Metformin' };
    expect(validateStep('name', { ...form, strength: `  ${'x'.repeat(40)}  ` }).ok).toBe(true);
    expect(validateStep('name', { ...form, strength: 'x'.repeat(41) }).issue).toBe(
      'strengthTooLong'
    );
  });

  it('is saved trimmed and cleared on edit', () => {
    const form: MedicineForm = { ...createEmptyForm(), name: 'Metformin', strength: ' 500 mg ' };
    expect(toCreateInput(form, 'p1').strength).toBe('500 mg');
    expect(toCreateInput({ ...form, strength: ' ' }, 'p1').strength).toBeUndefined();
    const initial = formFromMedication(med({ strength: '500 mg' }));
    expect(initial.strength).toBe('500 mg');
    expect(toUpdateInput({ ...initial, strength: '' }, initial).strength).toBeNull();
    expect(toUpdateInput(initial, initial).strength).toBe('500 mg');
  });
});

describe('untracked supply', () => {
  it('skip or 0 means not tracked; any count means tracked', () => {
    const empty = createEmptyForm();
    expect(tracksSupply(empty)).toBe(false);
    expect(tracksSupply({ ...empty, inventoryCount: 12 })).toBe(true);
    expect(tracksSupply({ ...empty, inventoryCount: 12, ...skipDefaults('supply') })).toBe(false);
    expect(toCreateInput({ ...empty, name: 'A' }, 'p1').trackSupply).toBe(false);
    expect(toCreateInput({ ...empty, name: 'A', inventoryCount: 3 }, 'p1').trackSupply).toBe(true);
  });

  it('drops the refill reminder when not tracked', () => {
    const form: MedicineForm = {
      ...createEmptyForm(),
      name: 'A',
      refillReminderType: 'doses',
      refillReminderValue: 5,
    };
    expect(toCreateInput(form, 'p1').refillReminderType).toBeUndefined();
    const edit = formFromMedication(med({ trackSupply: false, inventoryCount: 0 }));
    expect(
      toUpdateInput({ ...edit, refillReminderType: 'days', refillReminderValue: 3 }, edit)
    ).toMatchObject({ trackSupply: false, refillReminderType: null });
  });

  it('a tracked medicine that ran out stays tracked on edit', () => {
    const edit = formFromMedication(med({ inventoryCount: 0 }));
    expect(tracksSupply(edit)).toBe(true);
    expect(toUpdateInput(edit, edit).trackSupply).toBe(true);
  });

  it('has no warning, colour or bar on the card', () => {
    const s = getSupplyState(
      med({
        trackSupply: false,
        inventoryCount: 0,
        packageSize: 30,
        refillReminderType: 'doses',
        refillReminderValue: 5,
      })
    );
    expect(s.tracked).toBe(false);
    expect(s.empty).toBe(false);
    expect(s.low).toBe(false);
    expect(s.refillSoon).toBe(false);
    expect(s.lowMessage).toBeNull();
    expect(s.progress).toBeNull();
    expect(s.line).toBe('Supply not tracked');
    expect(s.tone).toBe('accent');
  });

  it('still warns when tracked at 0', () => {
    const s = getSupplyState(med({ inventoryCount: 0 }));
    expect(s.tracked).toBe(true);
    expect(s.empty).toBe(true);
  });

  it('never counts as short', () => {
    expect(isSupplyShort(0, 1, false)).toBe(false);
    expect(isSupplyShort(0, 1, true)).toBe(true);
    expect(isSupplyShort(0, 1)).toBe(true);
  });
});

describe('review header line', () => {
  const fmt = (t: string) => t;
  it('reads "1 pill at 08:00 and 20:00, every day" for daily schedules', () => {
    const form: MedicineForm = {
      ...createEmptyForm(),
      scheduleType: 'multiple_daily',
      scheduleConfig: { times: [{ time: '20:00' }, { time: '08:00' }] },
    };
    expect(everyDayLine(form, fmt)).toBe('1 pill at 08:00 and 20:00, every day');
  });

  it('falls back when amounts differ per time or the schedule is not daily', () => {
    expect(
      everyDayTimes('multiple_daily', { times: [{ time: '08:00', dosageAmount: 2 }] } as never, 1)
    ).toBeNull();
    expect(
      everyDayTimes('every_x_days', { intervalDays: 2, time: '08:00' } as never, 1)
    ).toBeNull();
    expect(
      everyDayTimes('specific_weekdays', {
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        time: '09:00',
      } as never)
    ).toEqual(['09:00']);
  });
});
