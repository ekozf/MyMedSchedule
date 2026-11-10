/**
 * Step 5 "How many do you have?" (docs/DESIGN.md §5.4): count stepper, pack size row (stepper
 * sheet), "Remind me to refill" with Off / By days left / By pills left, a sentence explaining the
 * chosen mode, and a threshold stepper. As-needed medicines get Off / By pills left only (no
 * schedule to count days down). A new medicine left at 0 is not tracked (footnote says so, and the
 * refill controls stay hidden until a count is entered); a tracked medicine at 0 keeps the old
 * footnote (we'll ask before each dose until a count is added).
 *
 * `part="refill"` shows only the refill reminder (its own page, from the medicine page).
 *
 * "Pills left" counts doses in the backend, so the label only says "By pills left" when one dose
 * is one pill; otherwise it says "By doses left".
 *
 * @example
 * <SupplySection form={form} update={update} issue={issue} showZeroNote={triedSaveAtZero} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { formatDose, formatUnit } from '@/lib/ui/format';
import { ListGroup, SegmentedControl, Stepper, Text } from '@/components/ds';
import {
  DEFAULT_REFILL_VALUE,
  type MedicineForm,
  type RefillType,
  type StepIssue,
  tracksSupply,
} from './form-model';
import { FieldLabel, IssueHint } from './parts';
import { OptionalNumberRow } from './NumberSheet';
import type { SectionProps } from './steps';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.supply.${key}`, opts);

/** "Pills left" when a dose is exactly one pill, else "Doses left". */
export function countsPills(form: Pick<MedicineForm, 'dosageUnit' | 'dosageAmount'>): boolean {
  return form.dosageUnit === 'pills' && form.dosageAmount === 1;
}

export function SupplySection({
  form,
  update,
  issue,
  showZeroNote = false,
  part = 'all',
}: SectionProps & {
  issue?: StepIssue | null;
  showZeroNote?: boolean;
  /** 'refill': only the refill reminder (the medicine page's "Remind me when running low"). */
  part?: 'all' | 'refill';
}) {
  const unit = form.dosageUnit;
  const isPrn = form.scheduleType === 'prn';
  const refill = form.refillReminderType;
  const pills = countsPills(form);
  const threshold = form.refillReminderValue ?? DEFAULT_REFILL_VALUE;
  const tracked = tracksSupply(form);

  const options: { value: RefillType; label: string }[] = [
    { value: 'none', label: t('refillOff') },
    ...(isPrn ? [] : [{ value: 'days' as const, label: t('refillDays') }]),
    { value: 'doses', label: t(pills ? 'refillPills' : 'refillDoses') },
  ];
  const helper =
    refill === 'none'
      ? t('refillHelpOff')
      : refill === 'days'
        ? t('refillHelpDays')
        : t(pills ? 'refillHelpPills' : 'refillHelpDoses');

  const setRefill = (next: RefillType) =>
    update.set({
      refillReminderType: next,
      refillReminderValue:
        next === 'none' ? null : (form.refillReminderValue ?? DEFAULT_REFILL_VALUE),
    });

  return (
    <View style={{ gap: 20 }}>
      {part === 'all' ? (
        <>
          <View style={{ gap: 6 }}>
            <Stepper
              value={form.inventoryCount}
              onChange={(inventoryCount) => update.set({ inventoryCount })}
              min={0}
              max={99999}
              step={1}
              allowDecimal
              editable
              unit={formatUnit(form.inventoryCount, unit)}
              accessibilityLabel={t('count')}
            />
            {showZeroNote && form.inventoryCount <= 0 ? (
              <Text
                variant="footnote"
                tone="secondary"
                accessibilityLiveRegion="polite"
                style={{ paddingHorizontal: 4 }}>
                {t(tracked ? 'zeroWarning' : 'notTrackedNote')}
              </Text>
            ) : null}
          </View>

          <ListGroup>
            <OptionalNumberRow
              title={t('packageSize')}
              subtitle={t('packageSizeHint')}
              value={form.packageSize}
              defaultValue={30}
              min={1}
              max={99999}
              allowDecimal
              format={(n) => formatDose(n, unit)}
              unit={(n) => formatUnit(n, unit)}
              emptyLabel={t('notSet')}
              // Nothing to clear until a size is set; closing the sheet keeps it empty.
              clearLabel={(set) => (set ? i18n.t('ui.editor.screens.clearPackSize') : null)}
              onChange={(packageSize) => update.set({ packageSize })}
            />
          </ListGroup>
        </>
      ) : null}

      {/* Nothing to count down without a count. */}
      {tracked ? (
        <View style={{ gap: 10 }}>
          {part === 'all' ? <FieldLabel>{t('refill')}</FieldLabel> : null}
          <SegmentedControl<RefillType> options={options} value={refill} onChange={setRefill} />
          <Text
            variant="footnote"
            tone="secondary"
            accessibilityLiveRegion="polite"
            style={{ paddingHorizontal: 4 }}>
            {helper}
          </Text>
          {refill !== 'none' ? (
            <Stepper
              label={t(refill === 'days' ? 'refillDaysValue' : 'refillDosesValue')}
              value={threshold}
              onChange={(refillReminderValue) => update.set({ refillReminderValue })}
              min={1}
              max={refill === 'days' ? 365 : 9999}
              unit={
                refill === 'days'
                  ? i18n.t('ui.editor.count.dayUnit', { count: threshold })
                  : pills
                    ? formatUnit(threshold, 'pills')
                    : i18n.t('ui.editor.count.doseUnit', { count: threshold })
              }
            />
          ) : null}
          {isPrn ? (
            <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 4 }}>
              {t('refillPrnNote')}
            </Text>
          ) : null}
        </View>
      ) : null}
      <IssueHint issue={issue} />
    </View>
  );
}
