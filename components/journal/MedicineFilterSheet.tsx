/**
 * Sheet listing "All medicines" + every medicine (active first, then "No longer taking"), with a
 * check on the selected one. Picking a row selects it and closes the sheet.
 *
 * @example
 * <MedicineFilterSheet visible={open} onClose={() => setOpen(false)}
 *   medications={meds} value={filters.medicationId} onChange={(id) => setMed(id)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { Layers } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { ListGroup, ListRow, MedTile, Sheet } from '@/components/ds';
import { formatDose } from '@/lib/ui/format';
import type { Medication } from '@/types';

export interface MedicineFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  medications: Medication[];
  /** 'all' or a medication id. */
  value: string;
  onChange: (medicationId: string) => void;
}

export function MedicineFilterSheet({
  visible,
  onClose,
  medications,
  value,
  onChange,
}: MedicineFilterSheetProps) {
  const active = medications.filter((m) => m.isActive);
  const stopped = medications.filter((m) => !m.isActive);

  const pick = (id: string) => {
    onChange(id);
    onClose();
  };

  const row = (m: Medication) => (
    <ListRow
      key={m.id}
      title={m.name}
      subtitle={formatDose(m.dosageAmount, m.dosageUnit)}
      leading={<MedTile name={m.name} imageUri={m.imageUri} size="sm" />}
      accessory={value === m.id ? 'check' : 'none'}
      onPress={() => pick(m.id)}
    />
  );

  return (
    <Sheet visible={visible} onClose={onClose} title={i18n.t('ui.journal.filter.sheetTitle')}>
      <View style={{ gap: 16 }}>
        <ListGroup>
          <ListRow
            title={i18n.t('ui.journal.filter.allMedicines')}
            icon={Layers}
            accessory={value === 'all' ? 'check' : 'none'}
            onPress={() => pick('all')}
          />
          {active.map(row)}
        </ListGroup>
        {stopped.length > 0 ? (
          <ListGroup header={i18n.t('ui.journal.filter.stopped')}>{stopped.map(row)}</ListGroup>
        ) : null}
      </View>
    </Sheet>
  );
}
