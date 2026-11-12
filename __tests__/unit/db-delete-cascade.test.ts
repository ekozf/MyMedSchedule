import { describe, it, expect, vi, beforeEach } from 'vitest';
import { intakeLogs, inventoryAdjustments, medications, profiles, disclaimerAcknowledgments } from '@/lib/db/schema';

const deleted: unknown[] = [];
const rows = vi.hoisted(() => ({ select: [] as any[] }));
const chain = () => {
  const c: any = {
    from: () => c,
    where: () => c,
    limit: async () => rows.select,
    then: (res: any, rej: any) => Promise.resolve(rows.select).then(res, rej),
  };
  return c;
};
const mockDb = {
  select: vi.fn(() => chain()),
  delete: vi.fn((table: unknown) => {
    deleted.push(table);
    return { where: async () => undefined };
  }),
};
vi.mock('@/lib/db/index', () => ({ getDatabase: () => mockDb }));

import { deleteMedication, deleteProfile } from '@/lib/db/operations';

beforeEach(() => {
  deleted.length = 0;
  rows.select = [];
});

describe('delete cascades (foreign keys are not enforced)', () => {
  it('deleteMedication removes its journal and supply history', async () => {
    await deleteMedication('m1');
    expect(deleted).toEqual([inventoryAdjustments, intakeLogs, medications]);
  });

  it('deleteProfile removes medicines, journal, supply history and disclaimer records', async () => {
    rows.select = [{ id: 'm1', imageUri: null, name: 'x', settings: '{}', createdAt: '', updatedAt: '' }];
    await deleteProfile('p1');
    expect(deleted).toEqual([
      inventoryAdjustments,
      intakeLogs,
      medications,
      disclaimerAcknowledgments,
      profiles,
    ]);
  });
});
