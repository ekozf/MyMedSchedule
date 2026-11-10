/**
 * As-needed sheet on Today (docs/DESIGN.md §5.2): title = name, subtitle "Usually 1 pill", a
 * `field` note ("Today: none taken yet. Your limit is 3 a day. Last one was Saturday 15:30."),
 * a stepper for the amount, primary "Log it, taken now", secondary "A different time" (the parent
 * opens Log a past dose with this medicine) and quiet "Add a note".
 *
 * Logging goes through `onLog` (safety check + save, see `useDoseActions().logAsNeeded`); the
 * sheet resolves what happened through `onLogged` so the parent can close it and show the toast.
 * When the supply count is too low the primary stays enabled only with `handlesShortSupply` (the
 * parent's `onLog` asks "Log anyway" / "Update supply first"). With several people in the app the
 * subtitle starts with "For {name}".
 *
 * @example
 * <AsNeededDoseSheet visible={open} medication={med} todayLogs={logs} lastLog={last}
 *   onClose={close} onLog={logAsNeeded} onLogged={showToast} onOtherTime={openPast} />
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { addDays, isAfter, isSameDay, startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { Button, MedIcon, Sheet, Stepper, Text, TextField, radii, useTheme } from '@/components/ds';
import {
  formatDayLabel,
  formatDose,
  formatShortDate,
  formatUnit,
  useTimeFormat,
} from '@/lib/ui/format';
import { isSupplyShort } from '@/lib/ui/supply';
import { medicineDisplayName } from '@/components/medicines/medicine-info';
import { useCarerName } from '@/components/shell/ProfileChip';
import type { IntakeLog, Medication } from '@/types';
import { partialStep } from './logic';

export interface AsNeededDoseSheetProps {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  medication: Medication | null;
  /** This medicine's logs from today. */
  todayLogs: IntakeLog[];
  /** Its most recent log, any day. */
  lastLog: IntakeLog | null;
  /** Safety check + save. Resolves the log, or null when cancelled / failed. */
  onLog: (medication: Medication, amount: number, notes?: string) => Promise<IntakeLog | null>;
  onLogged: (medication: Medication, log: IntakeLog, amount: number) => void;
  onOtherTime: (medication: Medication) => void;
  onUpdateSupply: (medication: Medication) => void;
  /** `onLog` asks what to do when the supply count is too low (else the button is disabled). */
  handlesShortSupply?: boolean;
}

export function AsNeededDoseSheet({
  visible,
  onClose,
  onDismissed,
  medication,
  todayLogs,
  lastLog,
  onLog,
  onLogged,
  onOtherTime,
  onUpdateSupply,
  handlesShortSupply = false,
}: AsNeededDoseSheetProps) {
  const person = useCarerName();
  const { colors } = useTheme();
  const { formatTime } = useTimeFormat();
  const reduceMotion = useReducedMotion();
  const [amount, setAmount] = React.useState(1);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!visible || !medication) return;
    setAmount(medication.dosageAmount > 0 ? medication.dosageAmount : 1);
    setNoteOpen(false);
    setNotes('');
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, medication?.id]);

  if (!medication) return null;
  const unit = medication.dosageUnit;
  const step = partialStep(medication.dosageAmount, unit);

  // --- summary note ---------------------------------------------------------------------------
  const takenToday = todayLogs
    .filter((l) => l.action !== 'skipped')
    .reduce((sum, l) => sum + l.dosageAmount, 0);
  const parts: string[] = [
    takenToday > 0
      ? i18n.t('ui.today.asNeededSheet.takenToday', { amount: formatDose(takenToday, unit) })
      : i18n.t('ui.today.asNeededSheet.noneYet'),
  ];
  if (medication.maxDailyDose) {
    parts.push(
      i18n.t('ui.today.asNeededSheet.limit', { max: formatDose(medication.maxDailyDose, unit) })
    );
  }
  if (lastLog) {
    const at = new Date(lastLog.actualTime);
    const now = new Date();
    if (isSameDay(at, now)) {
      parts.push(i18n.t('ui.today.asNeededSheet.lastToday', { time: formatTime(at) }));
    } else {
      const recent = isAfter(at, startOfDay(addDays(now, -6)));
      const day = recent ? formatDayLabel(at, now) : formatShortDate(at, now);
      const isYesterday = isSameDay(at, addDays(now, -1));
      parts.push(
        i18n.t('ui.today.asNeededSheet.last', {
          when: i18n.t('ui.today.asNeededSheet.lastWhen', {
            day: isYesterday ? day.toLocaleLowerCase() : day,
            time: formatTime(at),
          }),
        })
      );
    }
  }

  const short = isSupplyShort(medication.inventoryCount, amount, medication.trackSupply);

  const logNow = async () => {
    if (busy) return;
    setBusy(true);
    let log: IntakeLog | null = null;
    try {
      log = await onLog(medication, amount, noteOpen ? notes : undefined);
    } finally {
      setBusy(false);
    }
    if (log) onLogged(medication, log, amount);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      dismissible={!busy}
      headerLeft={<MedIcon name={medication.name} uri={medication.imageUri} size="md" initial />}
      title={medicineDisplayName(medication)}
      subtitle={[
        person ? i18n.t('ui.common.forPerson', { name: person }) : null,
        i18n.t('ui.today.asNeededSheet.subtitle', {
          dose: formatDose(medication.dosageAmount, unit),
        }),
      ]
        .filter(Boolean)
        .join(' · ')}
      footer={
        <View style={{ gap: 10 }}>
          <Button
            label={i18n.t('ui.medicines.asNeeded.logAmountNow', { dose: formatDose(amount, unit) })}
            loading={busy}
            disabled={short && !handlesShortSupply}
            onPress={logNow}
          />
          <Button
            label={i18n.t('ui.today.asNeededSheet.otherTime')}
            variant="secondary"
            disabled={busy}
            onPress={() => onOtherTime(medication)}
          />
        </View>
      }>
      <View style={{ gap: 16, paddingBottom: 8 }}>
        <View style={{ backgroundColor: colors.field, borderRadius: radii.card, padding: 16 }}>
          <Text variant="body" tabular>
            {parts.join(' ')}
          </Text>
        </View>
        <Stepper
          label={i18n.t('ui.today.asNeededSheet.amountLabel')}
          value={amount}
          onChange={setAmount}
          min={step}
          step={step}
          unit={formatUnit(amount, unit)}
        />
        {short ? (
          <View accessibilityLiveRegion="polite">
            <Text variant="subhead" weight="700" tone="late">
              {i18n.t('ui.today.dose.supplyShort', {
                left: formatDose(medication.inventoryCount, unit),
              })}
            </Text>
            <Button
              label={i18n.t('ui.today.dose.updateSupply')}
              variant="link"
              size="sm"
              disabled={busy}
              onPress={() => onUpdateSupply(medication)}
            />
          </View>
        ) : null}
        {noteOpen ? (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)}>
            <TextField
              label={i18n.t('ui.today.asNeededSheet.noteLabel')}
              placeholder={i18n.t('ui.today.asNeededSheet.notePlaceholder')}
              value={notes}
              onChangeText={setNotes}
              multiline
              autoFocus
            />
          </Animated.View>
        ) : (
          <Button
            label={i18n.t('ui.today.asNeededSheet.addNote')}
            variant="quiet"
            disabled={busy}
            onPress={() => setNoteOpen(true)}
          />
        )}
      </View>
    </Sheet>
  );
}
