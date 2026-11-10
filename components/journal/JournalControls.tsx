/**
 * Journal filters under the title, folded behind one "Filter · Last 7 days" chip (the period it
 * shows, and a count badge when any
 * filter differs from the default) so the first day shows without scrolling. Tapping it reveals
 * one row with the range segments (7 days / 30 days / 90 days / All) and one row with two picker
 * chips, "All medicines ▾" (radio sheet of medicines) and "All statuses ▾" (radio sheet All /
 * Taken / Partial / Skipped). Open or closed is remembered for the rest of the app session. The
 * day headers carry the counts ("2 taken"), so there is no separate summary line.
 *
 * @example
 * <JournalControls filters={f} onChange={setF} medications={meds} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import {
  Icon,
  OptionRow,
  PressableScale,
  SegmentedControl,
  Sheet,
  Text,
  radii,
  useTheme,
} from '@/components/ds';
import type { Medication } from '@/types';
import { medicineDisplayName } from '@/components/medicines/medicine-info';
import { MedicinePickerSheet } from './MedicinePickerSheet';
import {
  ACTIONS,
  RANGE_KEYS,
  activeFilterCount,
  type ActionFilter,
  type JournalFilters,
  type RangeKey,
} from './filtering';

export interface JournalControlsProps {
  filters: JournalFilters;
  onChange: (filters: JournalFilters) => void;
  /** Every medicine of the profile, inactive included. */
  medications: Medication[];
}

const RANGE_LABEL: Record<RangeKey, string> = { '7': 'd7', '30': 'd30', '90': 'd90', all: 'all' };
const STATUS_OPTIONS: ActionFilter[] = ['all', ...ACTIONS];

const statusName = (a: ActionFilter) =>
  i18n.t(a === 'all' ? 'ui.journal.filter.allStatuses' : `ui.journal.actions.${a}`);

/** Filters open or folded: kept for the app session (module state, not persisted). */
let sessionExpanded = false;

export function JournalControls({ filters, onChange, medications }: JournalControlsProps) {
  const [expanded, setExpandedState] = React.useState(sessionExpanded);
  const setExpanded = (v: boolean) => {
    sessionExpanded = v;
    setExpandedState(v);
  };
  const active = activeFilterCount(filters);
  const [medOpen, setMedOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const set = (patch: Partial<JournalFilters>) => onChange({ ...filters, ...patch });

  const medLabel: string =
    filters.medicationId === 'all'
      ? i18n.t('ui.journal.filter.allMedicines')
      : (() => {
          const m = medications.find((x) => x.id === filters.medicationId);
          return m ? medicineDisplayName(m) : String(i18n.t('ui.journal.row.deletedMedicine'));
        })();
  const statusLabel =
    filters.action === 'all'
      ? i18n.t('ui.journal.filter.statusChip')
      : i18n.t(`ui.journal.actions.${filters.action}`);

  return (
    <View style={{ gap: 12 }}>
      <FilterToggle
        count={active}
        rangeLabel={i18n.t(`ui.journal.range.a11y.${RANGE_LABEL[filters.range]}`)}
        expanded={expanded}
        onPress={() => setExpanded(!expanded)}
      />
      {expanded ? (
        <>
          <SegmentedControl
            value={filters.range}
            onChange={(range) => set({ range })}
            options={RANGE_KEYS.map((k) => ({
              value: k,
              label: i18n.t(`ui.journal.range.${RANGE_LABEL[k]}`),
              accessibilityLabel: i18n.t(`ui.journal.range.a11y.${RANGE_LABEL[k]}`),
            }))}
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <PickerChip
              label={medLabel}
              accessibilityLabel={i18n.t('ui.journal.filter.a11yMedicine', { name: medLabel })}
              selected={filters.medicationId !== 'all'}
              onPress={() => setMedOpen(true)}
            />
            <PickerChip
              label={statusLabel}
              accessibilityLabel={i18n.t('ui.journal.filter.a11yStatus', { name: statusLabel })}
              selected={filters.action !== 'all'}
              onPress={() => setStatusOpen(true)}
            />
          </View>
        </>
      ) : null}

      <MedicinePickerSheet
        visible={medOpen}
        onClose={() => setMedOpen(false)}
        title={i18n.t('ui.journal.filter.sheetTitle')}
        medications={medications}
        value={filters.medicationId}
        includeAll
        onChange={(medicationId) => set({ medicationId })}
      />

      <Sheet
        visible={statusOpen}
        onClose={() => setStatusOpen(false)}
        title={i18n.t('ui.journal.filter.statusSheetTitle')}>
        <View style={{ gap: 10, paddingBottom: 8 }} accessibilityRole="radiogroup">
          {STATUS_OPTIONS.map((a) => (
            <OptionRow
              key={a}
              title={statusName(a)}
              selected={filters.action === a}
              onPress={() => {
                set({ action: a });
                setStatusOpen(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
}

/**
 * "Filter · Last 7 days (2) ▾": folds the filters in and out; names the period so it's clear
 * what the list covers while folded. 48 tall, `field`, count badge in accent.
 */
function FilterToggle({
  count,
  rangeLabel,
  expanded,
  onPress,
}: {
  count: number;
  rangeLabel: string;
  expanded: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${rangeLabel}. ${i18n.t('ui.journal.filter.toggleA11y', { count })}`}
      accessibilityState={{ expanded }}
      style={{
        minHeight: 48,
        alignSelf: 'flex-start',
        maxWidth: '100%',
        paddingLeft: 16,
        paddingRight: 14,
        borderRadius: radii.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.field,
      }}>
      <Icon as={SlidersHorizontal} size={20} tone="secondary" />
      <Text variant="callout" weight="600" style={{ flexShrink: 1 }}>
        {i18n.t('ui.journal.filter.toggleWithRange', { range: rangeLabel })}
      </Text>
      {count > 0 ? (
        <View
          style={{
            minWidth: 24,
            height: 24,
            paddingHorizontal: 6,
            borderRadius: radii.pill,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text variant="caption" color={colors.onAccent} tabular>
            {count}
          </Text>
        </View>
      ) : null}
      <Icon as={expanded ? ChevronUp : ChevronDown} size={20} tone="secondary" />
    </PressableScale>
  );
}

/** A chip with a trailing ▾: it opens a picker instead of toggling. Same size as `Chip`. */
function PickerChip({
  label,
  accessibilityLabel,
  selected,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const fg = selected ? colors.onAccent : colors.ink;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        minHeight: 50,
        maxWidth: '100%',
        paddingLeft: 20,
        paddingRight: 16,
        borderRadius: radii.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: selected ? colors.accent : colors.field,
      }}>
      <Text variant="callout" weight="600" color={fg} style={{ flexShrink: 1 }}>
        {label}
      </Text>
      <Icon as={ChevronDown} size={20} color={fg} />
    </PressableScale>
  );
}
