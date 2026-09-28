/**
 * Supply card on the medicine detail: big count, meter against the pack size, running-low
 * message, pack size, refill reminder and the "Update supply" action.
 *
 * @example
 * <SupplyCard medication={med} onUpdate={() => setSupplyOpen(true)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { Package, PackagePlus, PackageX, TriangleAlert } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { formatDose, formatNumber, formatUnit } from '@/lib/ui/format';
import { Button, Card, Meter, Text, useTheme } from '@/components/ds';
import type { Medication } from '@/types';
import { getSupplyState } from './medicine-info';
import { CardTitle, Notice, ValueRow } from './parts';

export interface SupplyCardProps {
  medication: Medication;
  onUpdate: () => void;
  now?: Date;
}

export function SupplyCard({ medication: med, onUpdate, now }: SupplyCardProps) {
  const { colors } = useTheme();
  const supply = getSupplyState(med, now);
  const numberTone = supply.tone === 'accent' ? 'primary' : supply.tone;

  return (
    <Card>
      <CardTitle
        icon={Package}
        title={i18n.t('ui.medicines.supply.title')}
        tint={supply.tone === 'accent' ? colors.accent : colors[supply.tone]}
      />

      <View
        accessible
        accessibilityLabel={[supply.leftLabel, supply.amountLabel, supply.daysLabel]
          .filter(Boolean)
          .join(', ')}>
        <View
          style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', columnGap: 8 }}>
          <Text variant="title1" tabular tone={numberTone} style={{ fontSize: 40, lineHeight: 46 }}>
            {formatNumber(supply.dosesLeft ?? supply.count)}
          </Text>
          <Text variant="headline" tone="secondary" style={{ marginBottom: 6 }}>
            {supply.dosesLeft !== null
              ? i18n.t('ui.medicines.asNeeded.doseUnit', { count: supply.dosesLeft })
              : formatUnit(supply.count, med.dosageUnit)}{' '}
            {i18n.t('ui.medicines.supply.leftShort')}
          </Text>
        </View>
        {/* mg / g / ml: doses lead, the raw amount follows ("42,000 mg"). */}
        {supply.amountLabel ? (
          <Text variant="subhead" tone="secondary" tabular>
            {supply.amountLabel}
          </Text>
        ) : null}
      </View>
      {supply.daysLabel ? (
        <Text variant="subhead" tone="secondary" style={{ marginTop: 2 }}>
          {supply.daysLabel}
        </Text>
      ) : null}

      {supply.progress !== null && med.packageSize ? (
        <View style={{ marginTop: 12, gap: 6 }}>
          <Meter
            progress={supply.progress}
            height={8}
            tone={supply.tone === 'accent' ? 'success' : supply.tone}
            accessibilityLabel={i18n.t('ui.medicines.a11y.supplyMeter')}
          />
          <Text variant="footnote" tone="secondary">
            {i18n.t('ui.medicines.supply.ofPack', {
              amount: formatDose(med.packageSize, med.dosageUnit),
            })}
          </Text>
        </View>
      ) : null}

      {supply.lowMessage ? (
        <Notice
          icon={supply.empty ? PackageX : TriangleAlert}
          tone={supply.empty ? 'danger' : 'warning'}
          text={supply.lowMessage}
          style={{ marginTop: 14 }}
        />
      ) : null}

      <View style={{ marginTop: 14, gap: 6 }}>
        {med.packageSize ? (
          <ValueRow
            label={i18n.t('ui.medicines.supply.packSize')}
            value={formatDose(med.packageSize, med.dosageUnit)}
          />
        ) : null}
        <ValueRow
          label={i18n.t('ui.medicines.supply.refillReminder')}
          value={supply.reminderLabel}
        />
      </View>

      <Button
        label={i18n.t('ui.medicines.supply.update')}
        icon={PackagePlus}
        variant="secondary"
        fullWidth
        onPress={onUpdate}
        style={{ marginTop: 16 }}
      />
    </Card>
  );
}
