/**
 * Helpers for the "Parts of the day" setting (spec §5.6, formerly "Compartment times"): the You
 * row value, order validation and "HH:mm" ⇄ Date conversion for the time fields.
 *
 * @example
 * compartmentTimesValue(boundaries, (t) => t);            // "11:00 · 16:00 · 21:00"
 * partsOfDayValue(boundaries, (t) => t);   // "Midday 11:00 · Evening 16:00 · Night 21:00"
 * partsOfDayRanges(boundaries, (t) => t);  // "Morning until 11:00 · Midday · Evening from 16:00 · Night from 21:00"
 * boundariesInOrder({ midday: '11:00', evening: '10:00', night: '21:00' }); // false
 */
import i18n from '@/lib/i18n';
import { normaliseBoundaries } from '@/lib/settings/compartments';
import type { CompartmentBoundaries } from '@/types';

/** Compartments whose start the user can change (Morning always starts at the start of the day). */
export const EDITABLE_COMPARTMENTS = ['midday', 'evening', 'night'] as const;
export type EditableCompartment = (typeof EDITABLE_COMPARTMENTS)[number];

/** "11:00 · 16:00 · 21:00": the start of midday, evening and night, formatted with `format`. */
export function compartmentTimesValue(
  boundaries: CompartmentBoundaries,
  format: (hhmm: string) => string
): string {
  const b = normaliseBoundaries(boundaries);
  return EDITABLE_COMPARTMENTS.map((id) => format(b[id])).join(' · ');
}

/** "Midday 11:00 · Evening 16:00 · Night 21:00": the Settings row value. */
export function partsOfDayValue(
  boundaries: CompartmentBoundaries,
  format: (hhmm: string) => string
): string {
  const b = normaliseBoundaries(boundaries);
  return i18n.t('ui.you.preferences.partsValue', {
    midday: i18n.t('ui.compartments.midday'),
    middayTime: format(b.midday),
    evening: i18n.t('ui.compartments.evening'),
    eveningTime: format(b.evening),
    night: i18n.t('ui.compartments.night'),
    nightTime: format(b.night),
  });
}

/** "Morning until 11:00 · Midday · Evening from 16:00 · Night from 21:00" (the long You row value). */
export function partsOfDayRanges(
  boundaries: CompartmentBoundaries,
  format: (hhmm: string) => string
): string {
  const b = normaliseBoundaries(boundaries);
  return [
    i18n.t('ui.compartments.rangeMorning', { time: format(b.midday) }),
    i18n.t('ui.compartments.rangeMidday'),
    i18n.t('ui.compartments.rangeEvening', { time: format(b.evening) }),
    i18n.t('ui.compartments.rangeNight', { time: format(b.night) }),
  ].join(' · ');
}

/** Rough average glyph width of the 15 px footnote text in Atkinson Hyperlegible, in px. */
const FOOTNOTE_CHAR_WIDTH = 8.2;

/**
 * Whether `text` likely fits on one line of footnote text in `width` px at `fontScale`
 * (an estimate; the row falls back to the short form when in doubt).
 */
export function fitsOneLine(text: string, width: number, fontScale = 1): boolean {
  return text.length * FOOTNOTE_CHAR_WIDTH * fontScale <= width;
}

/** True when midday < evening < night (what `normaliseBoundaries` accepts as is). */
export function boundariesInOrder(draft: CompartmentBoundaries): boolean {
  const n = normaliseBoundaries(draft);
  return n.midday === draft.midday && n.evening === draft.evening && n.night === draft.night;
}

/** Date → "HH:mm" (24 h, zero-padded). */
export function toHHmm(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "HH:mm" → a Date today at that time (for the time picker). */
export function fromHHmm(hhmm: string, base: Date = new Date()): Date {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const d = new Date(base);
  d.setHours(Number.isNaN(h) ? 0 : h, Number.isNaN(m) ? 0 : m, 0, 0);
  return d;
}
