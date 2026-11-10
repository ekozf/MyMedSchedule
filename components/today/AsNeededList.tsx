/**
 * "When you need it" on Today (docs/DESIGN.md §5.2): one bordered row per active as-needed
 * medicine with a "Log a dose" chip; the whole row is one button. Hidden when there are none.
 *
 * @example
 * <AsNeededList items={[{ medication, takenToday: 1, lastAt: date }]} onLog={(m) => openSheet(m)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { PressableScale, SectionHeader, Text, radii, useTheme } from '@/components/ds';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import type { Medication } from '@/types';
import { medicineDisplayName } from '@/components/medicines/medicine-info';

export interface AsNeededItem {
  medication: Medication;
  /** Logs today (taken or partial). */
  takenToday: number;
  lastAt: Date | null;
}

export interface AsNeededListProps {
  items: AsNeededItem[];
  onLog: (medication: Medication) => void;
}

export function AsNeededList({ items, onLog }: AsNeededListProps) {
  const { colors } = useTheme();
  const { formatTime } = useTimeFormat();
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      <SectionHeader title={i18n.t('ui.today.asNeeded.title')} />
      {items.map(({ medication: m, takenToday, lastAt }) => {
        const name = medicineDisplayName(m);
        const today =
          takenToday > 0
            ? [
                i18n.t('ui.today.asNeeded.takenToday', { count: takenToday }),
                lastAt ? i18n.t('ui.today.asNeeded.lastAt', { time: formatTime(lastAt) }) : null,
              ]
                .filter(Boolean)
                .join(', ')
            : i18n.t('ui.today.asNeeded.noneToday');
        const sub = `${formatDose(m.dosageAmount, m.dosageUnit)} · ${today}`;
        return (
          <PressableScale
            key={m.id}
            onPress={() => onLog(m)}
            accessibilityRole="button"
            accessibilityLabel={`${i18n.t('ui.today.asNeeded.a11y', { name })}. ${sub}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              minHeight: 76,
              padding: 16,
              borderRadius: radii.card,
              borderWidth: 2,
              borderColor: colors.line,
              backgroundColor: colors.bg,
            }}>
            <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 160, gap: 2 }}>
              <Text variant="title3">{name}</Text>
              <Text variant="subhead" weight="400" tone="secondary" tabular>
                {sub}
              </Text>
            </View>
            <View
              style={{
                minHeight: 48,
                paddingHorizontal: 18,
                borderRadius: radii.pill,
                backgroundColor: colors.field,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text variant="callout" weight="700" tone="accent">
                {i18n.t('ui.today.asNeeded.log')}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}
