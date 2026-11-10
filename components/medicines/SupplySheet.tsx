/**
 * Supply sheet (docs/DESIGN.md §5.3), two modes:
 *
 * - **First count** (the supply isn't tracked yet; opened from the "saved" nudge or "Start
 *   tracking"): "How many do you have?", quick chips for common pack sizes (28, 30, 56, 60, 90,
 *   100, plus the medicine's own pack size) above the stepper, whose number opens for typing, a "Remind me when running low" switch (on by default) with a "Days before you run
 *   out" stepper (default 7; as-needed medicines count doses instead) that sets the refill
 *   reminder, and the primary "Start tracking". No before/after summary and no reason chips.
 * - **Update supply** (tracked): Add / Remove / Set the total, a big stepper, quick chips
 *   "A full pack (60)" / "Half a pack (30)" when the pack size is known (not when removing), a
 *   summary card "29 now → 89 after · about 6 weeks" (only once a change is entered; read out as
 *   words), optional "Why?" chips that fit the mode (Add: Refill, Other; Remove: Lost or damaged,
 *   Other; Set the total: Correction, Other) and Save. The reason is passed to `onSave` and stored
 *   with the change ("Last change: +30 pills (Refill)").
 *
 * Saving goes through `onSave(newCount, change)`; on success the sheet closes and
 * `onSaved(newCount)` fires after the exit animation (show the toast there).
 *
 * @example
 * <SupplySheet
 *   visible={open}
 *   medication={med}
 *   onClose={() => setOpen(false)}
 *   onSave={(n, change) => saveSupply(med, n, profileId, change)}
 *   onSaved={(n) => toast.show({ title: 'Supply updated' })}
 * />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { formatNumber, formatUnit } from '@/lib/ui/format';
import {
  Button,
  Card,
  Chip,
  ChipRow,
  ListGroup,
  ListRow,
  SegmentedControl,
  Sheet,
  Stepper,
  Text,
  useConfirm,
} from '@/components/ds';
import type { Medication } from '@/types';
import { computeNewCount, type SupplyChange, type SupplyMode, type SupplyReason } from './actions';
import { supplySummary } from './schedule-summary';
import { medicineDisplayName } from './medicine-info';

export interface SupplySheetProps {
  visible: boolean;
  medication: Medication | null;
  onClose: () => void;
  /**
   * Persist the new count (`change` has the mode, the number entered, the reason and, on a first
   * count, the refill reminder). Throw to show an error and keep the sheet open.
   */
  onSave: (newCount: number, change: SupplyChange) => Promise<void>;
  /** Fires after the sheet has closed following a successful save. */
  onSaved?: (newCount: number) => void;
  /** Initial mode (previews). Default 'add'. */
  initialMode?: SupplyMode;
}

type Reason = SupplyReason;
/** "Why?" chips that make sense for each mode. */
export const REASONS_BY_MODE: Record<SupplyMode, Reason[]> = {
  add: ['refill', 'other'],
  remove: ['lost', 'other'],
  set: ['correction', 'other'],
};
const MAX = 99999;
/** First count: common pack sizes offered as quick chips above the stepper. */
export const FIRST_COUNT_CHIPS = [28, 30, 56, 60, 90, 100];
/** First count: remind this many days (or doses, as needed) before running out. */
export const DEFAULT_REFILL_DAYS = 7;
const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.medicines.${key}`, opts);

export function SupplySheet({
  visible,
  medication,
  onClose,
  onSave,
  onSaved,
  initialMode = 'add',
}: SupplySheetProps) {
  const confirm = useConfirm();
  const [mode, setMode] = React.useState<SupplyMode>(initialMode);
  const [amount, setAmount] = React.useState(0);
  const [reason, setReason] = React.useState<Reason | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [remind, setRemind] = React.useState(true);
  const [remindValue, setRemindValue] = React.useState(DEFAULT_REFILL_DAYS);
  const saved = React.useRef<number | null>(null);
  // Snapshot taken when opening, so a store reload during the exit animation doesn't change the
  // numbers under the person's eyes.
  const [med, setMed] = React.useState<Medication | null>(medication);

  const untracked = med?.trackSupply === false;
  const current = untracked ? 0 : (med?.inventoryCount ?? 0);

  // Fresh form every time the sheet opens.
  React.useEffect(() => {
    if (visible) {
      const startMode = medication?.trackSupply === false ? 'set' : initialMode;
      setMed(medication);
      setMode(startMode);
      setAmount(
        startMode === 'set' && medication?.trackSupply !== false
          ? (medication?.inventoryCount ?? 0)
          : 0
      );
      setReason(null);
      setSaving(false);
      setRemind(true);
      setRemindValue(
        medication?.refillReminderValue && medication.refillReminderValue > 0
          ? medication.refillReminderValue
          : DEFAULT_REFILL_DAYS
      );
      saved.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!med) return null;
  const unit = med.dosageUnit;
  // As-needed medicines have no pace to count days by, so the reminder counts doses.
  const remindBy: 'days' | 'doses' = med.isPrn ? 'doses' : 'days';
  const newCount = computeNewCount(mode, current, amount);
  // Add/Remove need a positive amount; Set may be 0 (e.g. the pack ran out or was thrown away).
  // Starting to track may begin at 0 too (an honest "none left").
  const valid = mode === 'set' ? amount >= 0 && (untracked || amount !== current) : amount > 0;
  const packSize = med.packageSize && med.packageSize > 0 ? med.packageSize : null;
  const half = packSize ? Math.round(packSize / 2) : null;

  const changeMode = (m: SupplyMode) => {
    setMode(m);
    setAmount(m === 'set' ? current : 0);
    setReason((r) => (r && REASONS_BY_MODE[m].includes(r) ? r : null));
  };

  const firstCountChips = untracked
    ? [...new Set([...FIRST_COUNT_CHIPS, ...(packSize ? [packSize] : [])])].sort((a, b) => a - b)
    : [];

  const quick =
    !untracked && packSize && mode !== 'remove'
      ? [
          {
            key: 'full',
            label: t('sheet.fullPack', { count: formatNumber(packSize) }),
            value: packSize,
          },
          ...(half && half !== packSize
            ? [
                {
                  key: 'half',
                  label: t('sheet.halfPack', { count: formatNumber(half) }),
                  value: half,
                },
              ]
            : []),
        ]
      : [];

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    let failed = false;
    try {
      await onSave(newCount, {
        mode,
        amount,
        reason: untracked ? null : reason,
        refill: untracked ? (remind ? { type: remindBy, value: remindValue } : null) : undefined,
      });
      saved.current = newCount;
      onClose();
    } catch (error) {
      console.error('Failed to adjust supply:', error);
      failed = true;
    } finally {
      setSaving(false);
    }
    if (!failed) return;
    const retry = await confirm({
      title: i18n.t('ui.common.somethingWentWrong'),
      message: i18n.t('ui.safety.couldNotSave'),
      confirmLabel: i18n.t('ui.common.tryAgain'),
      cancelLabel: i18n.t('ui.common.close'),
    });
    if (retry) void save();
  };

  const label =
    mode === 'add'
      ? t('supplySheet.addLabel')
      : mode === 'remove'
        ? t('supplySheet.removeLabel')
        : t('supplySheet.setLabel');

  const summary = supplySummary(med, current, newCount);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={() => {
        const n = saved.current;
        saved.current = null;
        if (n !== null) onSaved?.(n);
      }}
      title={t(untracked ? 'supplySheet.startTitle' : 'supplySheet.title')}
      subtitle={medicineDisplayName(med)}
      footer={
        <Button
          label={untracked ? t('supplySheet.startTracking') : i18n.t('ui.common.save')}
          loading={saving}
          disabled={!valid}
          onPress={save}
        />
      }>
      <View style={{ gap: 20 }}>
        {untracked ? null : (
          <SegmentedControl<SupplyMode>
            value={mode}
            onChange={changeMode}
            options={[
              { value: 'add', label: t('supplySheet.add') },
              { value: 'remove', label: t('supplySheet.remove') },
              { value: 'set', label: t('supplySheet.set') },
            ]}
          />
        )}

        {firstCountChips.length ? (
          <ChipRow>
            {firstCountChips.map((n) => (
              <Chip
                key={n}
                label={formatNumber(n)}
                accessibilityLabel={`${formatNumber(n)} ${formatUnit(n, unit)}`}
                selected={amount === n}
                onPress={() => setAmount(n)}
              />
            ))}
          </ChipRow>
        ) : null}

        <Stepper
          key={untracked ? 'first' : 'update'}
          autoFocusEdit={untracked}
          label={untracked ? undefined : label}
          accessibilityLabel={untracked ? t('supplySheet.startTitle') : label}
          value={amount}
          onChange={setAmount}
          min={0}
          max={mode === 'remove' ? Math.max(current, 0) : MAX}
          step={1}
          allowDecimal
          unit={formatUnit(amount, unit)}
        />

        {quick.length ? (
          <ChipRow>
            {quick.map((q) => (
              <Chip
                key={q.key}
                label={q.label}
                selected={amount === q.value}
                onPress={() => {
                  setAmount(q.value);
                  if (mode === 'add') setReason('refill');
                }}
              />
            ))}
          </ChipRow>
        ) : null}

        {untracked ? (
          <View style={{ gap: 12 }}>
            <ListGroup>
              <ListRow
                title={t('supplySheet.remindLow')}
                switchValue={remind}
                onSwitchChange={setRemind}
              />
            </ListGroup>
            {remind ? (
              <Stepper
                label={t(
                  remindBy === 'days' ? 'supplySheet.remindDays' : 'supplySheet.remindDoses'
                )}
                value={remindValue}
                onChange={setRemindValue}
                min={1}
                max={remindBy === 'days' ? 90 : 999}
                step={1}
                unit={i18n.t(
                  remindBy === 'days' ? 'ui.editor.count.dayUnit' : 'ui.editor.count.doseUnit',
                  { count: remindValue }
                )}
              />
            ) : null}
          </View>
        ) : (
          <>
            {/* Only once a change is entered. */}
            {valid ? (
              <Card accessible accessibilityLiveRegion="polite" accessibilityLabel={summary.a11y}>
                <Text variant="title3" tabular tone={newCount === 0 ? 'late' : 'primary'}>
                  {summary.text}
                </Text>
              </Card>
            ) : null}

            <View style={{ gap: 8 }}>
              <Text
                variant="subhead"
                weight="700"
                tone="secondary"
                style={{ paddingHorizontal: 4 }}>
                {t('supplySheet.reason')}
              </Text>
              <ChipRow>
                {REASONS_BY_MODE[mode].map((r) => (
                  <Chip
                    key={r}
                    label={t(`supplySheet.reasons.${r}`)}
                    accessibilityRole="radio"
                    selected={reason === r}
                    onPress={() => setReason((cur) => (cur === r ? null : r))}
                  />
                ))}
              </ChipRow>
            </View>
          </>
        )}
      </View>
    </Sheet>
  );
}
