/**
 * The Medicines tab list (docs/DESIGN.md §5.3): regular medicines first, then "When needed", then
 * "Stopped" (dimmed cards). Sorted by name. Presentational: data via props.
 *
 * @example
 * <MedicineList medications={meds} query={query} onOpen={(m) => router.push(`/medication/${m.id}`)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { EmptyState, SectionHeader } from '@/components/ds';
import type { Medication } from '@/types';
import { MedicineCard } from './MedicineCard';
import { sortMedicines } from './medicine-info';

export interface MedicineListProps {
  medications: Medication[];
  /** Filters by name (case-insensitive, accents ignored). */
  query?: string;
  onOpen: (medication: Medication) => void;
  now?: Date;
}

function normalize(s: string) {
  return s.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Regular / when needed / stopped, each sorted by name. */
export function groupMedicines(meds: Medication[]) {
  const sorted = sortMedicines(meds);
  return {
    regular: sorted.filter((m) => m.isActive && !m.isPrn),
    whenNeeded: sorted.filter((m) => m.isActive && m.isPrn),
    stopped: sorted.filter((m) => !m.isActive),
  };
}

export function MedicineList({ medications, query = '', onOpen, now }: MedicineListProps) {
  const q = normalize(query.trim());
  const groups = React.useMemo(
    () =>
      groupMedicines(q ? medications.filter((m) => normalize(m.name).includes(q)) : medications),
    [medications, q]
  );

  if (q && !groups.regular.length && !groups.whenNeeded.length && !groups.stopped.length) {
    return (
      <EmptyState
        compact
        title={i18n.t('ui.medicines.search.noMatchesTitle')}
        message={i18n.t('ui.medicines.search.noMatches', { query: query.trim() })}
      />
    );
  }

  const cards = (list: Medication[]) =>
    list.map((m) => <MedicineCard key={m.id} medication={m} onPress={() => onOpen(m)} now={now} />);

  return (
    <View style={{ gap: 24 }}>
      {groups.regular.length ? <View style={{ gap: 12 }}>{cards(groups.regular)}</View> : null}

      {groups.whenNeeded.length ? (
        <View style={{ gap: 12 }}>
          <SectionHeader title={i18n.t('ui.medicines.list.sectionWhenNeeded')} />
          {cards(groups.whenNeeded)}
        </View>
      ) : null}

      {!q && !groups.regular.length && !groups.whenNeeded.length ? (
        <EmptyState
          compact
          title={i18n.t('ui.medicines.noActive.title')}
          message={i18n.t('ui.medicines.noActive.message')}
        />
      ) : null}

      {groups.stopped.length ? (
        <View style={{ gap: 12 }}>
          <SectionHeader title={i18n.t('ui.medicines.list.sectionStopped')} />
          {cards(groups.stopped)}
        </View>
      ) : null}
    </View>
  );
}
