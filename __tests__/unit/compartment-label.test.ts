import { describe, it, expect } from 'vitest';
import { compartmentA11yLabel, compartmentFigure } from '@/components/ds/compartment-label';

describe('compartmentFigure', () => {
  it('finished with only skipped doses: the word "Skipped", no check', () => {
    expect(compartmentFigure('skipped', 0, 1, 0)).toEqual({ kind: 'word', text: 'Skipped' });
  });

  it('finished with only partial doses: a check, never a big 0', () => {
    expect(compartmentFigure('done', 0, 1, 0)).toEqual({ kind: 'check' });
  });

  it('finished with something taken: taken/total', () => {
    expect(compartmentFigure('done', 1, 1, 0)).toEqual({ kind: 'count', big: 1, small: '/1' });
    expect(compartmentFigure('done', 1, 2, 0)).toEqual({ kind: 'count', big: 1, small: '/2' });
  });

  it('not finished: left to take', () => {
    expect(compartmentFigure('now', 0, 2, 2)).toEqual({
      kind: 'count',
      big: 2,
      small: 'doses to take',
    });
    expect(compartmentFigure('now', 0, 2, 1)).toEqual({
      kind: 'count',
      big: 1,
      small: 'dose to take',
    });
  });
});

describe('compartmentA11yLabel', () => {
  const base = { label: 'Morning', total: 1, left: 0 };

  it('finished, nothing taken (only skipped)', () => {
    expect(
      compartmentA11yLabel({ ...base, state: 'skipped', taken: 0, sub: 'Metformin, 1 skipped' })
    ).toBe('Morning, none taken, Metformin, 1 skipped');
  });

  it('finished, all taken', () => {
    expect(compartmentA11yLabel({ ...base, state: 'done', taken: 1, sub: 'All taken' })).toBe(
      'Morning, 1 of 1 doses taken, All taken'
    );
  });

  it('to take', () => {
    expect(
      compartmentA11yLabel({ ...base, state: 'now', taken: 0, left: 1, sub: 'Due at 20:00' })
    ).toBe('Morning, 1 dose to take, Due at 20:00');
  });

  it('empty', () => {
    expect(
      compartmentA11yLabel({ ...base, state: 'empty', taken: 0, emptyText: 'Nothing tonight' })
    ).toBe('Morning, Nothing tonight');
  });
});
