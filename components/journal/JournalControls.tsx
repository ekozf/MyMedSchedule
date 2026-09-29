/**
 * Light filter bar under the Journal title: range segments, then one chip row with the medicine
 * picker chip (opens a sheet) and the status chips, then a calm one-line summary.
 *
 * @example
 * <JournalControls filters={f} onChange={setF} medications={meds} summary="18 entries · 15 taken" />
 */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronDown, Layers } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import {
  Chip,
  ChipRow,
  Icon,
  MedTile,
  PressableScale,
  SegmentedControl,
  Text,
  statusColors,
  useTheme,
} from '@/components/ds';
import type { Medication } from '@/types';
import { MedicineFilterSheet } from './MedicineFilterSheet';
import { statusMeta } from './StatusDot';
import { ACTIONS, RANGE_KEYS, type JournalFilters, type RangeKey } from './utils';

export interface JournalControlsProps {
  filters: JournalFilters;
  onChange: (filters: JournalFilters) => void;
  /** Every medicine of the profile, inactive included. */
  medications: Medication[];
  /** Summary line (e.g. "18 entries · 15 taken"); hidden when empty. */
  summary?: string;
}

const RANGE_LABEL: Record<RangeKey, string> = { '7': 'd7', '30': 'd30', '90': 'd90', all: 'all' };

export function JournalControls({ filters, onChange, medications, summary }: JournalControlsProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const set = (patch: Partial<JournalFilters>) => onChange({ ...filters, ...patch });

  const selectedMed =
    filters.medicationId === 'all'
      ? null
      : (medications.find((m) => m.id === filters.medicationId) ?? null);
  const medLabel: string =
    filters.medicationId === 'all'
      ? i18n.t('ui.journal.filter.allMedicines')
      : (selectedMed?.name ?? String(i18n.t('ui.journal.row.deletedMedicine')));

  return (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <SegmentedControl
        value={filters.range}
        onChange={(range) => set({ range })}
        options={RANGE_KEYS.map((k) => ({
          value: k,
          label: i18n.t(`ui.journal.range.${RANGE_LABEL[k]}`),
          accessibilityLabel: i18n.t(`ui.journal.range.a11y.${RANGE_LABEL[k]}`),
        }))}
      />

      <ChipRow>
        <MedicineChip
          label={medLabel}
          medication={selectedMed}
          selected={filters.medicationId !== 'all'}
          onPress={() => setSheetOpen(true)}
        />
        <Separator />
        <Chip
          label={i18n.t('ui.journal.actions.all')}
          selected={filters.action === 'all'}
          onPress={() => set({ action: 'all' })}
        />
        {ACTIONS.map((a) => {
          const meta = statusMeta(a);
          return (
            <Chip
              key={a}
              label={meta.label}
              icon={meta.icon}
              tone={meta.tone}
              selected={filters.action === a}
              onPress={() => set({ action: filters.action === a ? 'all' : a })}
            />
          );
        })}
      </ChipRow>

      {summary ? (
        <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 4 }}>
          {summary}
        </Text>
      ) : null}

      <MedicineFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        medications={medications}
        value={filters.medicationId}
        onChange={(medicationId) => set({ medicationId })}
      />
    </View>
  );
}

function Separator() {
  const { colors } = useTheme();
  return (
    <View
      style={{ width: StyleSheet.hairlineWidth * 2, height: 24, backgroundColor: colors.separator }}
    />
  );
}

/** Chip with a trailing chevron: it opens a picker rather than toggling. */
function MedicineChip({
  label,
  medication,
  selected,
  onPress,
}: {
  label: string;
  medication: Medication | null;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const sc = statusColors(colors, 'accent');
  const fg = selected ? sc.fg : colors.ink;
  return (
    <PressableScale
      haptic="tap"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={i18n.t('ui.journal.filter.a11yMedicine', { name: label })}
      accessibilityState={{ selected }}
      hitSlop={4}
      style={{
        minHeight: 40,
        maxWidth: 240,
        paddingLeft: medication ? 5 : 14,
        paddingRight: 12,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: selected ? sc.bg : colors.surface,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: selected ? 'transparent' : colors.stroke,
      }}>
      {medication ? (
        <MedTile
          name={medication.name}
          imageUri={medication.imageUri}
          size="sm"
          style={{ width: 30, height: 30, borderRadius: 15 }}
        />
      ) : (
        <Icon as={Layers} size={18} color={colors.inkSecondary} />
      )}
      <Text variant="subhead" weight="600" color={fg} numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </Text>
      <Icon as={ChevronDown} size={16} color={selected ? sc.fg : colors.inkSecondary} />
    </PressableScale>
  );
}
