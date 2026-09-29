/**
 * Glass card for one medicine on the Medicines tab: tile, name, dose · schedule, next dose (or
 * "As needed"), warning chips and a supply meter. Inactive medicines render dimmed.
 *
 * @example
 * <MedicineCard medication={med} onPress={() => router.push(`/medication/${med.id}`)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import {
  CalendarX2,
  ChevronRight,
  Clock,
  Hand,
  Package,
  PackageX,
  TriangleAlert,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { getNextDose } from '@/lib/schedule/calculator';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import { Card, Icon, MedTile, Meter, StatusChip, Text } from '@/components/ds';
import type { Medication } from '@/types';
import { describeSchedule, getSupplyState, isExpired, nextDoseLine } from './medicine-info';

export interface MedicineCardProps {
  medication: Medication;
  onPress?: () => void;
  /** Reference time (for previews). Default now. */
  now?: Date;
}

export function MedicineCard({ medication: med, onPress, now }: MedicineCardProps) {
  const { formatTime, formatTimeString } = useTimeFormat();
  const at = now ?? new Date();
  const schedule = describeSchedule(med, formatTimeString);
  const nextDose = med.isActive && !med.isPrn ? getNextDose(med, at) : null;
  const nextLine = nextDose ? nextDoseLine(nextDose.time, formatTime, at) : null;
  const supply = getSupplyState(med, at);
  const expired = isExpired(med, at);
  const dose = formatDose(med.dosageAmount, med.dosageUnit);

  const chips: { key: string; label: string; icon: typeof Clock; tone: 'warning' | 'danger' }[] =
    [];
  if (med.isActive && supply.empty) {
    chips.push({
      key: 'empty',
      label: i18n.t('ui.medicines.status.noneLeft'),
      icon: PackageX,
      tone: 'danger',
    });
  } else if (supply.low) {
    chips.push({
      key: 'low',
      label: i18n.t('ui.medicines.status.runningLow'),
      icon: TriangleAlert,
      tone: 'warning',
    });
  }
  if (expired) {
    chips.push({
      key: 'expired',
      label: i18n.t('ui.medicines.status.expired'),
      icon: CalendarX2,
      tone: 'danger',
    });
  }

  const a11y = [
    med.name,
    dose,
    schedule,
    nextLine,
    med.isPrn ? i18n.t('ui.medicines.status.asNeeded') : null,
    ...chips.map((c) => c.label),
    supply.show ? supply.leftLabel : null,
    supply.show ? supply.amountLabel : null,
    supply.daysLabel,
    med.isActive ? null : i18n.t('ui.medicines.status.stopped'),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    // Dim via a wrapper: PressableScale animates its own opacity under Reduce Motion.
    <View style={{ opacity: med.isActive ? 1 : 0.62 }}>
      <Card onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} blur={false}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <MedTile name={med.name} imageUri={med.imageUri} size="md" />
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="headline" numberOfLines={2}>
              {med.name}
            </Text>
            <Text variant="subhead" tone="secondary">
              {med.isPrn ? dose : `${dose} · ${schedule}`}
            </Text>
            {med.isPrn ? (
              <StatusChip
                tone="accent"
                icon={Hand}
                label={i18n.t('ui.medicines.status.asNeeded')}
                style={{ marginTop: 4 }}
              />
            ) : nextLine ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Icon as={Clock} size={15} tone="accent" />
                <Text variant="footnote" tone="accent" weight="600" style={{ flexShrink: 1 }}>
                  {nextLine}
                </Text>
              </View>
            ) : null}
            {chips.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {chips.map((c) => (
                  <StatusChip key={c.key} tone={c.tone} icon={c.icon} label={c.label} />
                ))}
              </View>
            ) : null}
          </View>
          <Icon as={ChevronRight} size={20} tone="tertiary" style={{ marginTop: 2 }} />
        </View>

        {supply.show ? (
          <View style={{ marginTop: 14, gap: 6 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                columnGap: 12,
                rowGap: 2,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon
                  as={Package}
                  size={15}
                  tone={supply.tone === 'accent' ? 'secondary' : supply.tone}
                />
                <Text
                  variant="footnote"
                  weight="600"
                  tone={supply.tone === 'accent' ? 'primary' : supply.tone}>
                  {supply.leftLabel}
                </Text>
                {supply.amountLabel ? (
                  <Text variant="footnote" tone="secondary">
                    · {supply.amountLabel}
                  </Text>
                ) : null}
              </View>
              {supply.daysLabel ? (
                <Text variant="footnote" tone="secondary">
                  {supply.daysLabel}
                </Text>
              ) : null}
            </View>
            {supply.progress !== null ? (
              <Meter
                progress={supply.progress}
                tone={supply.tone === 'accent' ? 'success' : supply.tone}
                accessibilityLabel={i18n.t('ui.medicines.a11y.supplyMeter')}
              />
            ) : null}
          </View>
        ) : null}
      </Card>
    </View>
  );
}
