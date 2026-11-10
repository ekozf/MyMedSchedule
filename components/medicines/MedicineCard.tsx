/**
 * One medicine on the Medicines tab (docs/DESIGN.md §5.3): a `field` card with the photo or
 * first-letter tile, the name with strength ("Metformin 500 mg", 22/700),
 * "500 mg · morning and evening", the supply line "29 pills left, about 2 weeks" with a
 * `SupplyBar`, and a chevron. The supply line and bar are neutral (`ink2`); only a reached refill
 * reminder ("refill soon") or a tracked count of 0 ("None left") is drawn in `late`. As-needed
 * medicines get the same line and bar when their supply is tracked.
 * Paused medicines render at 70 % opacity and say "Paused". An untracked supply reads "Supply not
 * tracked" with no bar and no warning colour.
 *
 * @example
 * <MedicineCard medication={med} onPress={() => router.push(`/medication/${med.id}`)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import { useCompartmentBoundaries } from '@/lib/settings/compartments';
import { Card, Icon, MedIcon, StatusPill, SupplyBar, Text, useTheme } from '@/components/ds';
import type { Medication } from '@/types';
import { getSupplyState, isExpired, medicineDisplayName, supplyProgress } from './medicine-info';
import { medicineSchedule } from './schedule-summary';

export interface MedicineCardProps {
  medication: Medication;
  onPress?: () => void;
  /** Reference time (for previews). Default now. */
  now?: Date;
}

export { supplyProgress } from './medicine-info';

export function MedicineCard({ medication: med, onPress, now }: MedicineCardProps) {
  const { colors } = useTheme();
  const { formatTimeString } = useTimeFormat();
  const { boundaries } = useCompartmentBoundaries();
  const at = now ?? new Date();
  const supply = getSupplyState(med, at);
  const dose = formatDose(med.dosageAmount, med.dosageUnit);
  const line = med.isPrn
    ? i18n.t('ui.medicines.detail.each', { amount: dose })
    : `${dose} · ${medicineSchedule(med, boundaries, formatTimeString)}`;
  const expired = isExpired(med, at);
  const low = supply.warn;
  const showSupply = med.isActive || supply.count > 0;
  const progress = supplyProgress(supply);
  const name = medicineDisplayName(med);

  const a11y = [
    name,
    line,
    showSupply ? supply.line : null,
    expired ? i18n.t('ui.medicines.status.expired') : null,
    med.isActive ? null : i18n.t('ui.medicines.list.sectionStopped'),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    // Dim via a wrapper: PressableScale animates its own opacity under Reduce Motion.
    <View style={{ opacity: med.isActive ? 1 : 0.7 }}>
      <Card onPress={onPress} radius={20} accessibilityRole="button" accessibilityLabel={a11y}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {/* `bg` tile so it stands out on the `field` card. */}
          <MedIcon
            name={med.name}
            uri={med.imageUri}
            size="md"
            initial
            style={{ backgroundColor: colors.bg }}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="title3">{name}</Text>
            <Text variant="callout" tone="secondary">
              {line}
            </Text>
            {expired ? (
              <StatusPill
                label={i18n.t('ui.medicines.status.expired')}
                tone="danger"
                style={{ marginTop: 4 }}
              />
            ) : null}
          </View>
          <Icon as={ChevronRight} size={24} tone="secondary" />
        </View>

        {showSupply ? (
          <View style={{ marginTop: 14, gap: 8 }}>
            <Text variant="callout" weight={low ? '700' : '500'} tone={low ? 'late' : 'secondary'}>
              {supply.line}
            </Text>
            {progress !== null ? <SupplyBar value={progress} low={low} tone="neutral" /> : null}
          </View>
        ) : null}
      </Card>
    </View>
  );
}
