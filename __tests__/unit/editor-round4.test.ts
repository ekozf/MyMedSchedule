import { describe, it, expect, beforeAll, vi } from 'vitest';

// lib/ui/format pulls in settings that touch the database and the store.
vi.mock('@/lib/db/operations', () => ({ updateProfile: vi.fn() }));
vi.mock('@/store', () => ({ useStore: vi.fn() }));
import * as Notifications from 'expo-notifications';
import i18n from '@/lib/i18n';
import {
  createEmptyForm,
  isSectionId,
  sectionStep,
  validateAll,
  validateStep,
  wantsSupplyNudge,
  type MedicineForm,
} from '@/components/editor/form-model';
import { expiryValue, limitsSummary, refillValue } from '@/components/editor/describe';
import {
  getSupplyState,
  medicineHasExtras,
  medicineHasLimits,
  lastChangeValue,
  supplyProgress,
} from '@/components/medicines/medicine-info';
import {
  isAskingForPermission,
  onPermissionAskEnd,
  requestNotificationPermissions,
} from '@/lib/notifications/permissions';
import type { Medication } from '@/types';

function med(overrides: Partial<Medication> = {}): Medication {
  const now = new Date(2026, 10, 9, 9, 0);
  return {
    id: 'm1',
    profileId: 'p1',
    name: 'Ibuprofen',
    dosageAmount: 1,
    dosageUnit: 'pills',
    scheduleType: 'prn',
    scheduleConfig: '{}',
    inventoryCount: 15,
    trackSupply: true,
    bypassDnd: false,
    isActive: true,
    isPrn: true,
    refillReminderType: null,
    refillReminderValue: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Medication;
}

const named = (patch: Partial<MedicineForm> = {}): MedicineForm => ({
  ...createEmptyForm(),
  name: 'Metformin',
  ...patch,
});

beforeAll(() => {
  i18n.locale = 'en';
});

describe('four-step add flow', () => {
  it('step 3 is just the type choice for as-needed medicines', () => {
    expect(validateStep('schedule', named({ scheduleType: 'prn', scheduleConfig: {} })).ok).toBe(
      true
    );
  });

  it('step 3 checks the chosen type’s settings', () => {
    const f = named({
      scheduleType: 'specific_weekdays',
      scheduleConfig: { weekdays: [], time: '08:00' },
    });
    expect(validateStep('schedule', f)).toMatchObject({ ok: false, issue: 'pickDay' });
  });

  it('still checks supply and extras before saving, though they are not steps', () => {
    expect(validateAll(named({ refillReminderType: 'days', refillReminderValue: null })).step).toBe(
      'supply'
    );
    expect(validateAll(named({ notes: 'x'.repeat(501) })).step).toBe('extras');
  });
});

describe('edit pages', () => {
  it('knows its pages and maps Note / Limits to the extras', () => {
    expect(isSectionId('schedule')).toBe(true);
    expect(isSectionId('when')).toBe(false);
    expect(isSectionId(undefined)).toBe(false);
    expect(sectionStep('note')).toBe('extras');
    expect(sectionStep('limits')).toBe('extras');
    expect(sectionStep('refill')).toBe('supply');
    expect(isSectionId('refill')).toBe(true);
    expect(sectionStep('supply')).toBe('supply');
  });

  it('summarises the refill reminder and the limits for the list', () => {
    expect(refillValue(named())).toBe('Off');
    expect(
      refillValue(named({ inventoryCount: 20, refillReminderType: 'days', refillReminderValue: 7 }))
    ).toBe('When 7 days are left');
    // No count, no reminder.
    expect(refillValue(named({ refillReminderType: 'days', refillReminderValue: 7 }))).toBe('Off');
    expect(limitsSummary(named())).toBeNull();
    expect(limitsSummary(named({ maxDailyDose: 4, minHoursBetweenDoses: 6 }))).toBe(
      '4 pills a day · 6 hours apart'
    );
    // The expiry date is not a limit: it has its own row ("Supply and expiry").
    expect(limitsSummary(named({ expirationDate: new Date(2027, 0, 1) }))).toBeNull();
    expect(expiryValue(named())).toBe('Not set');
    expect(expiryValue(named({ expirationDate: new Date(2027, 0, 1) }))).toBe('Fri 1 Jan 2027');
    expect(isSectionId('expiry')).toBe(true);
    expect(sectionStep('expiry')).toBe('extras');
  });
});

describe('"Count my supply" after saving', () => {
  it('only for a scheduled medicine without a counted supply', () => {
    expect(wantsSupplyNudge(named())).toBe(true);
    expect(wantsSupplyNudge(named({ inventoryCount: 30 }))).toBe(false);
    expect(wantsSupplyNudge(named({ scheduleType: 'prn', scheduleConfig: {} }))).toBe(false);
  });

  it('can tell when the phone’s permission dialog is up', async () => {
    let release: () => void = () => {};
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({
      status: 'undetermined',
      granted: false,
      canAskAgain: true,
    } as never);
    vi.mocked(Notifications.requestPermissionsAsync).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ status: 'granted' } as never);
        })
    );
    const ended = vi.fn();
    const off = onPermissionAskEnd(ended);
    const pending = requestNotificationPermissions({ prompt: true });
    expect(isAskingForPermission()).toBe(true);
    await vi.waitFor(() => expect(Notifications.requestPermissionsAsync).toHaveBeenCalled());
    release();
    await pending;
    expect(isAskingForPermission()).toBe(false);
    expect(ended).toHaveBeenCalledTimes(1);
    off();
  });

  it('a request without prompt never counts as asking', async () => {
    const ended = vi.fn();
    const off = onPermissionAskEnd(ended);
    const pending = requestNotificationPermissions();
    expect(isAskingForPermission()).toBe(false);
    await pending;
    expect(ended).not.toHaveBeenCalled();
    off();
  });
});

describe('supply on cards and the medicine page', () => {
  it('shows a bar only against a pack size', () => {
    expect(supplyProgress(getSupplyState(med()))).toBeNull();
    expect(supplyProgress(getSupplyState(med({ packageSize: 30, inventoryCount: 3 })))).toBeCloseTo(
      0.1
    );
    expect(supplyProgress(getSupplyState(med({ trackSupply: false })))).toBeNull();
  });

  it('a short supply without a refill reminder is not amber', () => {
    const s = getSupplyState(med({ inventoryCount: 2 }));
    expect(s.warn).toBe(false);
    expect(s.refillSoon).toBe(false);
    const withReminder = getSupplyState(
      med({ inventoryCount: 2, refillReminderType: 'doses', refillReminderValue: 5 })
    );
    expect(withReminder.warn).toBe(true);
  });

  it('knows when the note / limits are still unset (Notes and dose limits)', () => {
    expect(medicineHasLimits(med())).toBe(false);
    expect(medicineHasLimits(med({ minHoursBetweenDoses: 4 }))).toBe(true);
    expect(medicineHasLimits(med({ expirationDate: new Date(2027, 0, 1) }))).toBe(false);
    expect(medicineHasExtras(med())).toBe(false);
    expect(medicineHasExtras(med({ notes: '  ' }))).toBe(false);
    expect(medicineHasExtras(med({ notes: 'With food' }))).toBe(true);
    expect(medicineHasExtras(med({ maxDailyDose: 4 }))).toBe(true);
    expect(medicineHasExtras(med({ expirationDate: new Date(2027, 0, 1) }))).toBe(true);
  });
});

describe('"Last change" in the supply card', () => {
  const at = new Date(2026, 10, 9, 12, 0);
  it('says what changed, why and when', () => {
    expect(
      lastChangeValue(
        { previousCount: 10, newCount: 40, reason: 'refill', createdAt: at },
        'pills',
        at
      )
    ).toBe('+30 pills (Refill) · 9 Nov');
    expect(lastChangeValue({ previousCount: 10, newCount: 8, createdAt: at }, 'pills', at)).toBe(
      '\u22122 pills · 9 Nov'
    );
    expect(
      lastChangeValue(
        { previousCount: 0, newCount: 1, reason: 'bogus', createdAt: new Date(2025, 0, 3) },
        'pills',
        at
      )
    ).toBe('+1 pill · 3 Jan 2025');
  });
});
