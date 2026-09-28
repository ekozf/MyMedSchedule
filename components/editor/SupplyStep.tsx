/**
 * Supply section: how many you have, package size and the refill reminder.
 * "Days left" is not offered for as-needed medicines (no fixed schedule to count down).
 *
 * @example
 * <SupplyStep form={form} update={update} variant="guided" issue={issue} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { Package } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { formatDose, formatUnit } from '@/lib/ui/format';
import { ListGroup, SegmentedControl, Stepper, Text } from '@/components/ds';
import { DEFAULT_REFILL_VALUE, type RefillType, type StepIssue } from './form-model';
import { EditorCard, FieldLabel, IssueHint, StepHeader } from './parts';
import { OptionalNumberRow } from './NumberSheet';
import type { StepProps } from './steps';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.supply.${key}`, opts);

export function SupplyStep({
  form,
  update,
  variant = 'guided',
  issue,
}: StepProps & { issue?: StepIssue | null }) {
  const unit = form.dosageUnit;
  const isPrn = form.scheduleType === 'prn';
  const refill = form.refillReminderType;

  const options: { value: RefillType; label: string }[] = [
    { value: 'none', label: t('refillOff') },
    ...(isPrn ? [] : [{ value: 'days' as const, label: t('refillDays') }]),
    { value: 'doses', label: t('refillDoses') },
  ];

  const setRefill = (next: RefillType) =>
    update.set({
      refillReminderType: next,
      refillReminderValue:
        next === 'none' ? null : (form.refillReminderValue ?? DEFAULT_REFILL_VALUE),
    });

  return (
    <View style={{ gap: 16 }}>
      {variant === 'guided' ? <StepHeader title={t('title')} helper={t('helper')} /> : null}

      <EditorCard>
        <FieldLabel>{t('count')}</FieldLabel>
        <Stepper
          value={form.inventoryCount}
          onChange={(inventoryCount) => update.set({ inventoryCount })}
          min={0}
          max={99999}
          step={1}
          allowDecimal
          unit={formatUnit(form.inventoryCount, unit)}
          accessibilityLabel={t('count')}
        />
      </EditorCard>

      <ListGroup footer={t('packageSizeHint')}>
        <OptionalNumberRow
          icon={Package}
          title={t('packageSize')}
          hint={t('packageSizeHint')}
          value={form.packageSize}
          defaultValue={30}
          min={1}
          max={99999}
          allowDecimal
          format={(n) => formatDose(n, unit)}
          unit={(n) => formatUnit(n, unit)}
          emptyLabel={t('notSet')}
          onChange={(packageSize) => update.set({ packageSize })}
        />
      </ListGroup>

      <EditorCard>
        <FieldLabel>{t('refill')}</FieldLabel>
        <SegmentedControl<RefillType>
          size="lg"
          options={options}
          value={refill}
          onChange={setRefill}
        />
        {refill !== 'none' ? (
          <View style={{ gap: 4 }}>
            <Text variant="subhead" tone="secondary" style={{ paddingHorizontal: 4 }}>
              {t(refill === 'days' ? 'refillDaysValue' : 'refillDosesValue')}
            </Text>
            <Stepper
              value={form.refillReminderValue ?? DEFAULT_REFILL_VALUE}
              onChange={(refillReminderValue) => update.set({ refillReminderValue })}
              min={1}
              max={refill === 'days' ? 365 : 9999}
              unit={i18n.t(
                refill === 'days' ? 'ui.editor.count.dayUnit' : 'ui.editor.count.doseUnit',
                { count: form.refillReminderValue ?? DEFAULT_REFILL_VALUE }
              )}
              accessibilityLabel={t(refill === 'days' ? 'refillDaysValue' : 'refillDosesValue')}
            />
          </View>
        ) : null}
        {isPrn ? (
          <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 4 }}>
            {t('refillPrnNote')}
          </Text>
        ) : null}
      </EditorCard>
      <IssueHint issue={issue} />
    </View>
  );
}
