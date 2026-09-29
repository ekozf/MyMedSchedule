/**
 * "Update supply" sheet: Add / Remove / Set, a big stepper, "Add a full pack" shortcut, optional
 * reason chips (not stored, like before), a live "30 → 60 pills" preview and Save.
 * Saving goes through `onSave(newCount)`; on success the sheet closes and `onSaved(newCount)` fires
 * after the exit animation (show the toast there).
 *
 * @example
 * <SupplySheet
 *   visible={open}
 *   medication={med}
 *   onClose={() => setOpen(false)}
 *   onSave={(n) => saveSupply(med, n)}
 *   onSaved={(n) => toast.show({ title: 'Supply updated' })}
 * />
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { ArrowRight, Equal, Minus, PackagePlus, Plus, CircleAlert } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { formatDose, formatUnit } from '@/lib/ui/format';
import {
  Button,
  Chip,
  ChipRow,
  Icon,
  MedTile,
  SegmentedControl,
  Sheet,
  Stepper,
  Text,
  useConfirm,
  useTheme,
} from '@/components/ds';
import type { Medication } from '@/types';
import { computeNewCount, type SupplyMode } from './actions';

export interface SupplySheetProps {
  visible: boolean;
  medication: Medication | null;
  onClose: () => void;
  /** Persist the new count. Throw to show an error and keep the sheet open. */
  onSave: (newCount: number) => Promise<void>;
  /** Fires after the sheet has closed following a successful save. */
  onSaved?: (newCount: number) => void;
  /** Initial mode (previews). Default 'add'. */
  initialMode?: SupplyMode;
}

type Reason = 'refill' | 'lost' | 'correction' | 'other';
const REASONS: Reason[] = ['refill', 'lost', 'correction', 'other'];
const MAX = 99999;

export function SupplySheet({
  visible,
  medication,
  onClose,
  onSave,
  onSaved,
  initialMode = 'add',
}: SupplySheetProps) {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = React.useState<SupplyMode>(initialMode);
  const [amount, setAmount] = React.useState(0);
  const [reason, setReason] = React.useState<Reason | null>(null);
  const [saving, setSaving] = React.useState(false);
  const saved = React.useRef<number | null>(null);
  // Snapshot taken when opening, so a store reload during the exit animation doesn't change the
  // numbers under the person's eyes.
  const [med, setMed] = React.useState<Medication | null>(medication);

  const current = med?.inventoryCount ?? 0;

  // Fresh form every time the sheet opens.
  React.useEffect(() => {
    if (visible) {
      setMed(medication);
      setMode(initialMode);
      setAmount(initialMode === 'set' ? (medication?.inventoryCount ?? 0) : 0);
      setReason(null);
      setSaving(false);
      saved.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!med) return null;
  const unit = med.dosageUnit;
  const newCount = computeNewCount(mode, current, amount);
  // Add/Remove need a positive amount; Set may be 0 (e.g. the pack ran out or was thrown away).
  const valid = mode === 'set' ? amount >= 0 && amount !== current : amount > 0;
  const packSize = med.packageSize && med.packageSize > 0 ? med.packageSize : null;

  const changeMode = (m: SupplyMode) => {
    setMode(m);
    setAmount(m === 'set' ? current : 0);
  };

  const addFullPack = () => {
    if (!packSize) return;
    setMode('add');
    setAmount(packSize);
    setReason('refill');
  };

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave(newCount);
      saved.current = newCount;
      onClose();
    } catch (error) {
      console.error('Failed to adjust supply:', error);
      await confirm({
        title: i18n.t('ui.common.somethingWentWrong'),
        message: i18n.t('ui.safety.couldNotSave'),
        confirmLabel: i18n.t('ui.common.ok'),
        cancelLabel: i18n.t('ui.common.close'),
        icon: CircleAlert,
      });
    } finally {
      setSaving(false);
    }
  };

  const label =
    mode === 'add'
      ? i18n.t('ui.medicines.supplySheet.addLabel')
      : mode === 'remove'
        ? i18n.t('ui.medicines.supplySheet.removeLabel')
        : i18n.t('ui.medicines.supplySheet.setLabel');

  const from = formatDose(current, unit);
  const to = formatDose(newCount, unit);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={() => {
        const n = saved.current;
        saved.current = null;
        if (n !== null) onSaved?.(n);
      }}
      title={i18n.t('ui.medicines.supplySheet.title')}
      subtitle={med.name}
      headerLeft={<MedTile name={med.name} imageUri={med.imageUri} size="sm" />}
      footer={
        <Button
          label={i18n.t('ui.common.save')}
          size="lg"
          fullWidth
          loading={saving}
          disabled={!valid}
          onPress={save}
        />
      }>
      <View style={{ gap: 20 }}>
        <SegmentedControl<SupplyMode>
          value={mode}
          onChange={changeMode}
          size="lg"
          options={[
            { value: 'add', label: i18n.t('ui.medicines.supplySheet.add'), icon: Plus },
            { value: 'remove', label: i18n.t('ui.medicines.supplySheet.remove'), icon: Minus },
            { value: 'set', label: i18n.t('ui.medicines.supplySheet.set'), icon: Equal },
          ]}
        />

        <View style={{ gap: 8 }}>
          <Text variant="headline" align="center">
            {label}
          </Text>
          <Stepper
            value={amount}
            onChange={setAmount}
            min={0}
            max={mode === 'remove' ? Math.max(current, 0) : MAX}
            step={1}
            allowDecimal
            unit={formatUnit(amount, unit)}
            accessibilityLabel={label}
          />
        </View>

        {mode === 'add' && packSize ? (
          <Chip
            label={i18n.t('ui.medicines.supplySheet.fullPack', {
              amount: formatDose(packSize, unit),
            })}
            icon={PackagePlus}
            size="lg"
            selected={amount === packSize}
            onPress={addFullPack}
            style={{ alignSelf: 'center' }}
          />
        ) : null}

        {/* Live preview */}
        <View
          accessible
          accessibilityLabel={i18n.t('ui.medicines.supplySheet.preview', { from, to })}
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 20,
            backgroundColor: colors.surfaceSunken,
          }}>
          <Text variant="title3" tone="secondary" tabular>
            {from}
          </Text>
          <Icon as={ArrowRight} size={22} tone="accent" />
          <Animated.View
            key={to}
            entering={reduceMotion ? undefined : FadeIn.duration(180)}
            exiting={reduceMotion ? undefined : FadeOut.duration(80)}>
            <Text variant="title3" tone={newCount <= 0 ? 'danger' : 'accent'} tabular>
              {to}
            </Text>
          </Animated.View>
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="subhead" tone="secondary" style={{ paddingHorizontal: 4 }}>
            {i18n.t('ui.medicines.supplySheet.reason')}
          </Text>
          <ChipRow bleed>
            {REASONS.map((r) => (
              <Chip
                key={r}
                label={i18n.t(`ui.medicines.supplySheet.reasons.${r}`)}
                selected={reason === r}
                check
                onPress={() => setReason((cur) => (cur === r ? null : r))}
              />
            ))}
          </ChipRow>
        </View>
      </View>
    </Sheet>
  );
}
