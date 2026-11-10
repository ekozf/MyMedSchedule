/**
 * Supply card on the medicine page (docs/DESIGN.md §5.3): the count in `display` with "pills
 * left" with a filled 48-tall "Update supply" (`field2` fill on the `field` card, `ink` text) beside it, "About 2 weeks at your current pace", the bar
 * (only with a pack size: without that baseline the count and pace are text only), then rows Pack
 * size, Refill reminder (only when one is set; otherwise a "Remind me when running low ›" row that
 * opens the refill editor) and "Last change · +30 pills (Refill) · 9 Nov" once the supply was
 * changed by hand. The pace line is left out when the warning box already says how many days are
 * left. Only a reached refill reminder or a tracked count of 0 is a warning: then it is said in
 * words (warning box) and the big number and the bar turn `late`. Otherwise the bar is neutral
 * (`ink2`) and nothing is amber. An untracked supply shows "Not tracking supply" with a secondary
 * "Start tracking" (no count, bar, warning or rows).
 *
 * @example
 * <SupplyCard medication={med} onUpdate={() => setSupplyOpen(true)} onEditRefill={openRefill} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { PackageX, TriangleAlert } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import type { InventoryAdjustment } from '@/lib/db/operations';
import { formatDose, formatNumber, formatUnit } from '@/lib/ui/format';
import { Button, Card, Divider, SupplyBar, Text, useTheme } from '@/components/ds';
import type { Medication } from '@/types';
import { getSupplyState, lastChangeValue, supplyProgress } from './medicine-info';
import { capitalize } from './schedule-summary';
import { LinkRow, Notice, ValueRow } from './parts';

export interface SupplyCardProps {
  medication: Medication;
  onUpdate: () => void;
  /** Untracked supply: opens the supply sheet in "Set the total" mode. Default `onUpdate`. */
  onStartTracking?: () => void;
  /** "Remind me when running low" (no refill reminder yet): open the refill editor. */
  onEditRefill?: () => void;
  /** Most recent supply change by hand, for the "Last change" row. */
  lastChange?: InventoryAdjustment | null;
  now?: Date;
}

export function SupplyCard({
  medication: med,
  onUpdate,
  onStartTracking,
  onEditRefill,
  lastChange,
  now,
}: SupplyCardProps) {
  const { colors } = useTheme();
  const supply = getSupplyState(med, now);
  if (!supply.tracked) {
    return (
      <Card>
        <View style={{ gap: 6 }}>
          <Text variant="title3">{i18n.t('ui.medicines.supply.notTracking')}</Text>
          <Text variant="body" tone="secondary">
            {i18n.t('ui.medicines.supply.notTrackingHint')}
          </Text>
        </View>
        <Button
          label={i18n.t('ui.medicines.supply.startTracking')}
          variant="secondary"
          onPress={onStartTracking ?? onUpdate}
          style={{ backgroundColor: colors.bg, marginTop: 14 }}
        />
      </Card>
    );
  }
  const empty = supply.count <= 0;
  const low = supply.warn;
  const hasReminder = !!med.refillReminderType && !!med.refillReminderValue;
  const number = supply.dosesLeft ?? supply.count;
  const unitWord =
    supply.dosesLeft !== null
      ? i18n.t('ui.editor.count.doseUnit', { count: supply.dosesLeft })
      : formatUnit(supply.count, med.dosageUnit);
  const progress = supplyProgress(supply);
  const warning = empty
    ? (supply.lowMessage ?? i18n.t('ui.medicines.supply.empty'))
    : low
      ? (supply.lowMessage ?? capitalize(supply.line))
      : null;
  // "About 6 days left …" in the warning already says the pace.
  const showPace = !!supply.pace && !(warning && supply.status?.basis === 'days');

  // Read as one: "12 pills left, about 6 days at your current pace" (the button stays separate).
  const a11yCount = [
    `${formatNumber(number)} ${i18n.t('ui.medicines.page.unitLeft', { unit: unitWord })}`,
    supply.amountLabel,
    showPace ? i18n.t('ui.medicines.page.atPace', { pace: supply.pace }) : null,
  ]
    .filter(Boolean)
    .join(', ');
  const hideFromA11y = {
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants' as const,
  };

  return (
    <Card>
      <View style={{ gap: 2 }}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            columnGap: 12,
            rowGap: 8,
          }}>
          <View accessible accessibilityLabel={a11yCount}>
            {/* Low: the number turns `late`; the label stays `ink2` so "low" isn't said twice. */}
            <Text variant="display" tabular tone={low ? 'late' : 'primary'}>
              {formatNumber(number)}
            </Text>
            <Text variant="headline" tone="secondary">
              {i18n.t('ui.medicines.page.unitLeft', { unit: unitWord })}
            </Text>
          </View>
          <Button
            label={i18n.t('ui.medicines.supply.update')}
            variant="secondary"
            size="sm"
            onPress={onUpdate}
            // A filled grey button: the card is already `field`, so it uses the next step up.
            style={{ backgroundColor: colors.field2, minHeight: 48 }}
          />
        </View>
        {/* mg / g / ml: doses lead, the raw amount follows ("42,000 mg"). */}
        {supply.amountLabel ? (
          <Text variant="callout" tone="secondary" tabular {...hideFromA11y}>
            {supply.amountLabel}
          </Text>
        ) : null}
        {showPace ? (
          <Text variant="body" tone="secondary" style={{ marginTop: 4 }} {...hideFromA11y}>
            {capitalize(i18n.t('ui.medicines.page.atPace', { pace: supply.pace! }))}
          </Text>
        ) : null}
      </View>

      {progress !== null ? (
        <SupplyBar value={progress} low={low} tone="neutral" style={{ marginTop: 14 }} />
      ) : null}

      {warning ? (
        <Notice
          icon={empty ? PackageX : TriangleAlert}
          tone="warning"
          text={warning}
          style={{ marginTop: 14 }}
        />
      ) : null}

      <View style={{ marginTop: 10 }}>
        <ValueRow
          label={i18n.t('ui.medicines.supply.packSize')}
          value={
            med.packageSize
              ? formatDose(med.packageSize, med.dosageUnit)
              : i18n.t('ui.editor.supply.notSet')
          }
        />
        {hasReminder ? (
          <>
            <Divider />
            <ValueRow
              label={i18n.t('ui.medicines.supply.refillReminder')}
              value={supply.reminderLabel}
            />
          </>
        ) : onEditRefill ? (
          <>
            <Divider />
            <LinkRow label={i18n.t('ui.medicines.supply.remindLow')} onPress={onEditRefill} />
          </>
        ) : null}
        {lastChange ? (
          <>
            <Divider />
            <ValueRow
              label={i18n.t('ui.medicines.supply.lastChange')}
              value={lastChangeValue(lastChange, med.dosageUnit, now)}
            />
          </>
        ) : null}
      </View>
    </Card>
  );
}
