/**
 * Radio sheet for choosing a medicine: optional "All medicines" first, then the medicines still
 * taken, then "No longer taking". Picking a row selects it and closes the sheet. Used by the
 * Journal medicine filter and by "Log a past dose" when there are more than six medicines.
 *
 * @example
 * <MedicinePickerSheet visible={open} onClose={() => setOpen(false)} title="Show entries for"
 *   medications={meds} value={filters.medicationId} includeAll onChange={setMedicationId} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { medicineDisplayName } from '@/components/medicines/medicine-info';
import { OptionRow, Sheet, Text } from '@/components/ds';
import { formatDose } from '@/lib/ui/format';
import type { Medication } from '@/types';

export interface MedicinePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  medications: Medication[];
  /** 'all', a medication id, or null when nothing is chosen yet. */
  value: string | null;
  /** Show the "All medicines" option (value 'all'). */
  includeAll?: boolean;
  onChange: (medicationId: string) => void;
}

export function MedicinePickerSheet({
  visible,
  onClose,
  title,
  medications,
  value,
  includeAll = false,
  onChange,
}: MedicinePickerSheetProps) {
  const active = medications.filter((m) => m.isActive);
  const stopped = medications.filter((m) => !m.isActive);

  const pick = (id: string) => {
    onChange(id);
    onClose();
  };

  const option = (m: Medication) => (
    <OptionRow
      key={m.id}
      title={medicineDisplayName(m)}
      description={formatDose(m.dosageAmount, m.dosageUnit)}
      selected={value === m.id}
      onPress={() => pick(m.id)}
    />
  );

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={{ gap: 10, paddingBottom: 8 }} accessibilityRole="radiogroup">
        {includeAll ? (
          <OptionRow
            title={i18n.t('ui.journal.filter.allMedicines')}
            selected={value === 'all'}
            onPress={() => pick('all')}
          />
        ) : null}
        {active.map(option)}
        {stopped.length > 0 ? (
          <>
            <Text
              variant="subhead"
              weight="700"
              tone="secondary"
              accessibilityRole="header"
              style={{ marginTop: 14, paddingHorizontal: 4 }}>
              {i18n.t('ui.journal.filter.stopped')}
            </Text>
            {stopped.map(option)}
          </>
        ) : null}
      </View>
    </Sheet>
  );
}
