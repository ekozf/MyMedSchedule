/**
 * Compartment times ("Pill Box" spec §5.2 / §5.6). The day is split into four compartments:
 * Morning (before `midday`), Midday, Evening and Night. Boundaries are per profile and live in
 * `ProfileSettings.compartmentBoundaries`; defaults are 11:00, 16:00 and 21:00.
 *
 * @example
 * const { boundaries, setBoundaries } = useCompartmentBoundaries();
 * const id = compartmentFor(new Date(), boundaries); // 'morning' | 'midday' | 'evening' | 'night'
 * i18n.t(compartmentLabelKey(id)); // "Morning"
 */
import { useCallback, useMemo } from 'react';
import { updateProfile } from '@/lib/db/operations';
import { useStore } from '@/store';
import type { CompartmentBoundaries, CompartmentId } from '@/types';

export const COMPARTMENT_ORDER: CompartmentId[] = ['morning', 'midday', 'evening', 'night'];

export const DEFAULT_COMPARTMENT_BOUNDARIES: CompartmentBoundaries = {
  midday: '11:00',
  evening: '16:00',
  night: '21:00',
};

/** Suggested default time when a user adds a dose to a compartment (not a boundary). */
export const COMPARTMENT_DEFAULT_TIMES: Record<CompartmentId, string> = {
  morning: '08:00',
  midday: '13:00',
  evening: '20:00',
  night: '22:00',
};

/** i18n key for the compartment name: ui.compartments.morning etc. */
export function compartmentLabelKey(id: CompartmentId): string {
  return `ui.compartments.${id}`;
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/** Normalise user input: keep order midday < evening < night, fall back to defaults when invalid. */
export function normaliseBoundaries(input?: Partial<CompartmentBoundaries> | null): CompartmentBoundaries {
  const b = { ...DEFAULT_COMPARTMENT_BOUNDARIES, ...(input ?? {}) };
  const ok =
    /^\d{2}:\d{2}$/.test(b.midday) &&
    /^\d{2}:\d{2}$/.test(b.evening) &&
    /^\d{2}:\d{2}$/.test(b.night) &&
    minutesOf(b.midday) < minutesOf(b.evening) &&
    minutesOf(b.evening) < minutesOf(b.night);
  return ok ? b : { ...DEFAULT_COMPARTMENT_BOUNDARIES };
}

/** Which compartment a clock time (Date or "HH:mm") belongs to. */
export function compartmentFor(
  time: Date | string,
  boundaries: CompartmentBoundaries = DEFAULT_COMPARTMENT_BOUNDARIES
): CompartmentId {
  const mins =
    typeof time === 'string' ? minutesOf(time) : time.getHours() * 60 + time.getMinutes();
  const b = normaliseBoundaries(boundaries);
  if (mins < minutesOf(b.midday)) return 'morning';
  if (mins < minutesOf(b.evening)) return 'midday';
  if (mins < minutesOf(b.night)) return 'evening';
  return 'night';
}

/** Start ("HH:mm") of a compartment, for sentences like "Doses before 11:00 count as morning". */
export function compartmentStart(id: CompartmentId, boundaries: CompartmentBoundaries): string {
  const b = normaliseBoundaries(boundaries);
  return id === 'morning' ? '00:00' : b[id];
}

/** Read and write the active profile's compartment boundaries. */
export function useCompartmentBoundaries() {
  const profile = useStore((s) => s.activeProfile);
  const setActiveProfile = useStore((s) => s.setActiveProfile);
  const boundaries = useMemo(
    () => normaliseBoundaries(profile?.settings?.compartmentBoundaries),
    [profile?.settings?.compartmentBoundaries]
  );
  const setBoundaries = useCallback(
    async (next: CompartmentBoundaries) => {
      if (!profile) return;
      const normalised = normaliseBoundaries(next);
      const updated = await updateProfile(profile.id, {
        settings: { compartmentBoundaries: normalised },
      });
      if (updated) setActiveProfile(updated);
    },
    [profile, setActiveProfile]
  );
  return { boundaries, setBoundaries };
}
