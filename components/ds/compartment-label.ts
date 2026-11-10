/**
 * Pure parts of `Compartment` (no React Native), so they can be unit tested.
 *
 * @example
 * compartmentFigure('skipped', 0, 1, 0)  // { kind: 'word', text: 'Skipped' }  (only skipped)
 * compartmentFigure('done', 0, 1, 0)  // { kind: 'check' }  (finished, only partial doses)
 * compartmentFigure('done', 1, 1, 0)  // { kind: 'count', big: 1, small: '/1' }
 * compartmentA11yLabel({ label: 'Morning', state: 'skipped', taken: 0, total: 1, left: 0, sub: '1 skipped' })
 * // "Morning, none taken, 1 skipped"
 */
import i18n from '@/lib/i18n';
import type { CompartmentState } from './Compartment';

export type CompartmentFigure =
  | { kind: 'check' }
  | { kind: 'word'; text: string }
  | { kind: 'count'; big: number; small: string };

/**
 * Finished with something taken: "taken/total". Finished with only partial doses: a check, never
 * a big "0" (its slashed zero reads as a letter at display size). Finished with only skipped
 * doses (`skipped`): the word "Skipped". Not finished: the count left and "dose(s) to take".
 */
export function compartmentFigure(
  state: CompartmentState,
  taken: number,
  total: number,
  left: number
): CompartmentFigure {
  // Finished with only skipped doses: the word "Skipped", never a check (skipping isn't success).
  if (state === 'skipped') return { kind: 'word', text: i18n.t('ui.compartments.skipped') };
  if (state === 'done') {
    return taken === 0 ? { kind: 'check' } : { kind: 'count', big: taken, small: `/${total}` };
  }
  return { kind: 'count', big: left, small: i18n.t('ui.compartments.toTake', { count: left }) };
}

export function compartmentA11yLabel({
  label,
  state,
  taken,
  total,
  left,
  sub,
  emptyText,
}: {
  label: string;
  state: CompartmentState;
  taken: number;
  total: number;
  left: number;
  sub?: string;
  emptyText?: string;
}): string {
  const count =
    state === 'empty'
      ? emptyText
      : state === 'done' || state === 'skipped'
        ? taken === 0 || state === 'skipped'
          ? i18n.t('ui.compartments.noneTakenA11y')
          : i18n.t('ui.compartments.takenOfTotalA11y', { taken, total })
        : i18n.t('ui.compartments.toTakeA11y', { count: left });
  return [label, count, state === 'empty' ? null : sub].filter(Boolean).join(', ');
}
