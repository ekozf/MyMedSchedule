/**
 * "Log a past dose" sheet. Step 1: pick a medicine (large rows; skipped when one is preselected
 * or there is only one). Step 2: when (date row + time row), what happened, how much, optional
 * note → Save. Presentational: the parent does the safety check + saving in `onSubmit`.
 *
 * @example
 * <PastDoseSheet
 *   visible={open}
 *   onClose={() => setOpen(false)}
 *   onDismissed={router.back}
 *   medications={activeMeds}
 *   initialMedicationId={params.medicationId}
 *   onSubmit={async (draft) => saved}   // resolve true to close
 *   onAddMedicine={() => …}
 * />
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { ChevronRight, NotebookPen, Pill, Plus } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import {
  Button,
  EmptyState,
  Icon,
  MedTile,
  PressableScale,
  SegmentedControl,
  Sheet,
  Stepper,
  Text,
  TextField,
  radii,
  useTheme,
} from '@/components/ds';
import { formatDose, formatUnit } from '@/lib/ui/format';
import type { IntakeAction, Medication } from '@/types';
import { statusMeta } from './StatusDot';
import { WhenFields } from './WhenFields';
import { ACTIONS, amountStep, isInFuture } from './utils';

export interface PastDoseDraft {
  medication: Medication;
  actualTime: Date;
  action: IntakeAction;
  dosageAmount: number;
  notes?: string;
}

export interface PastDoseSheetProps {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  /** Active medicines only. */
  medications: Medication[];
  initialMedicationId?: string;
  /** Resolve `true` when saved (the parent closes the sheet). */
  onSubmit: (draft: PastDoseDraft) => Promise<boolean>;
  onAddMedicine: () => void;
  /** Preview only: fixed "now" and initial time. */
  now?: Date;
}

export function PastDoseSheet({
  visible,
  onClose,
  onDismissed,
  medications,
  initialMedicationId,
  onSubmit,
  onAddMedicine,
  now,
}: PastDoseSheetProps) {
  const reduceMotion = useReducedMotion();
  const preselected = React.useMemo(() => {
    if (initialMedicationId) {
      const m = medications.find((x) => x.id === initialMedicationId);
      if (m) return m;
    }
    return medications.length === 1 ? medications[0] : null;
  }, [medications, initialMedicationId]);

  const [medication, setMedication] = React.useState<Medication | null>(preselected);
  const [when, setWhen] = React.useState<Date>(() => now ?? new Date());
  const [action, setAction] = React.useState<IntakeAction>('taken');
  const [amount, setAmount] = React.useState<number>(preselected?.dosageAmount ?? 1);
  const [notes, setNotes] = React.useState('');
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const choose = (m: Medication) => {
    setMedication(m);
    setAmount(m.dosageAmount > 0 ? m.dosageAmount : 1);
  };

  // Medicines may arrive after mount (fresh fetch): adopt the preselection once.
  const adopted = React.useRef(!!preselected);
  React.useEffect(() => {
    if (!adopted.current && preselected) {
      adopted.current = true;
      choose(preselected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselected]);

  const changeAction = (next: IntakeAction) => {
    // A partial dose usually is less: start at half the standard dose.
    if (medication && next === 'partial' && amount === medication.dosageAmount) {
      const step = amountStep(medication.dosageAmount);
      setAmount(Math.max(step, Math.round(medication.dosageAmount / 2 / step) * step));
    }
    if (medication && action === 'partial' && next === 'taken') {
      setAmount(medication.dosageAmount);
    }
    setAction(next);
  };

  const future = isInFuture(when, now ?? new Date());
  const canSave = !!medication && !future && (action === 'skipped' || amount > 0) && !saving;

  const save = async () => {
    if (!medication || !canSave) return;
    setSaving(true);
    try {
      await onSubmit({
        medication,
        actualTime: when,
        action,
        dosageAmount: action === 'skipped' ? medication.dosageAmount : amount,
        notes: notes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const enter = reduceMotion ? FadeIn.duration(180) : FadeInDown.springify().damping(18);
  const showPicker = !medication;
  const noMeds = medications.length === 0;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title={i18n.t('ui.journal.past.title')}
      subtitle={
        noMeds
          ? undefined
          : showPicker
            ? i18n.t('ui.journal.past.pickSubtitle')
            : i18n.t('ui.journal.past.subtitle')
      }
      footer={
        !showPicker && !noMeds ? (
          <Button
            label={i18n.t('ui.journal.past.save')}
            size="lg"
            fullWidth
            loading={saving}
            disabled={!canSave}
            onPress={save}
          />
        ) : undefined
      }>
      {noMeds ? (
        <EmptyState
          compact
          icon={Pill}
          title={i18n.t('ui.journal.past.noMeds.title')}
          message={i18n.t('ui.journal.past.noMeds.message')}
          action={{
            label: i18n.t('ui.journal.past.noMeds.action'),
            icon: Plus,
            onPress: onAddMedicine,
          }}
        />
      ) : showPicker ? (
        <View style={{ gap: 10, paddingBottom: 4 }}>
          {medications.map((m, i) => (
            <Animated.View key={m.id} entering={i < 8 ? enter.delay(i * 20) : undefined}>
              <MedicineRow medication={m} onPress={() => choose(m)} />
            </Animated.View>
          ))}
        </View>
      ) : (
        <Animated.View entering={enter} style={{ gap: 22, paddingBottom: 8 }}>
          <SelectedMedicine
            medication={medication!}
            onChange={medications.length > 1 ? () => setMedication(null) : undefined}
          />

          <Section label={i18n.t('ui.journal.entry.when')}>
            <WhenFields value={when} onChange={setWhen} now={now} />
          </Section>

          <Section label={i18n.t('ui.journal.entry.whatHappened')}>
            <SegmentedControl
              size="lg"
              value={action}
              onChange={changeAction}
              options={ACTIONS.map((a) => ({
                value: a,
                label: statusMeta(a).label,
                icon: statusMeta(a).icon,
              }))}
            />
          </Section>

          {action !== 'skipped' ? (
            <Section label={i18n.t('ui.journal.entry.howMuch')}>
              <Stepper
                value={amount}
                onChange={setAmount}
                min={amountStep(medication!.dosageAmount)}
                step={amountStep(medication!.dosageAmount)}
                allowDecimal
                unit={formatUnit(amount, medication!.dosageUnit)}
                accessibilityLabel={i18n.t('ui.journal.entry.howMuch')}
              />
              <Text variant="footnote" tone="tertiary" align="center">
                {i18n.t('ui.journal.entry.standardDose', {
                  dose: formatDose(medication!.dosageAmount, medication!.dosageUnit),
                })}
              </Text>
            </Section>
          ) : null}

          {noteOpen || notes ? (
            <TextField
              label={i18n.t('ui.journal.entry.note')}
              value={notes}
              onChangeText={setNotes}
              placeholder={i18n.t('ui.journal.entry.notePlaceholder')}
              multiline
              autoFocus={noteOpen && !notes}
            />
          ) : (
            <Button
              label={i18n.t('ui.journal.past.addNote')}
              icon={NotebookPen}
              variant="plain"
              onPress={() => setNoteOpen(true)}
              style={{ alignSelf: 'flex-start' }}
            />
          )}
        </Animated.View>
      )}
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text variant="headline" accessibilityRole="header">
        {label}
      </Text>
      {children}
    </View>
  );
}

function MedicineRow({ medication, onPress }: { medication: Medication; onPress: () => void }) {
  const { colors } = useTheme();
  const dose = formatDose(medication.dosageAmount, medication.dosageUnit);
  return (
    <PressableScale
      haptic="tap"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${medication.name}, ${dose}`}
      style={{
        minHeight: 72,
        borderRadius: radii.row,
        backgroundColor: colors.surfaceSunken,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}>
      <MedTile name={medication.name} imageUri={medication.imageUri} size="md" />
      <View style={{ flex: 1 }}>
        <Text variant="headline" numberOfLines={2}>
          {medication.name}
        </Text>
        <Text variant="subhead" tone="secondary">
          {dose}
        </Text>
      </View>
      <Icon as={ChevronRight} size={20} tone="tertiary" />
    </PressableScale>
  );
}

function SelectedMedicine({
  medication,
  onChange,
}: {
  medication: Medication;
  onChange?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderRadius: radii.row,
        backgroundColor: colors.surfaceSunken,
        padding: 12,
        minHeight: 72,
        justifyContent: 'center',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <MedTile name={medication.name} imageUri={medication.imageUri} size="md" />
        <View style={{ flex: 1 }}>
          <Text variant="headline" numberOfLines={2}>
            {medication.name}
          </Text>
          <Text variant="subhead" tone="secondary">
            {formatDose(medication.dosageAmount, medication.dosageUnit)}
          </Text>
        </View>
        {onChange ? (
          <Button
            label={i18n.t('ui.common.change')}
            accessibilityLabel={i18n.t('ui.journal.past.changeMedicine')}
            variant="secondary"
            size="sm"
            onPress={onChange}
          />
        ) : null}
      </View>
    </View>
  );
}
