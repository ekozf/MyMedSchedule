/**
 * Medicine names on Today: always name plus strength ("Metformin 500 mg") via
 * `medicineDisplayName`, falling back to the dose's stored name when the medicine isn't loaded.
 *
 * @example
 * const nameOf = doseNamer(medsById);
 * nameOf(entry); // "Metformin 500 mg"
 */
import { medicineDisplayName } from '@/components/medicines/medicine-info';
import type { Medication } from '@/types';
import type { DoseEntry, DoseNamer } from './logic';

export function doseName(entry: DoseEntry, medsById: Map<string, Medication>): string {
  const med = medsById.get(entry.dose.medicationId);
  return medicineDisplayName(med ?? { name: entry.dose.medicationName });
}

export function doseNamer(medsById: Map<string, Medication>): DoseNamer {
  return (entry) => doseName(entry, medsById);
}
