/**
 * As-needed dose sheet (used by the `/log/as-needed` route). Optional first step: pick which
 * as-needed medicine (large rows). Then: how many standard doses (stepper, 0.5 steps), live total,
 * running-low notice, optional note, and one big "Log 1 pill" button. Always logs "taken now";
 * past doses live in /log/past.
 *
 * Logging goes through `onLog` (safety check + save live in the route). The sheet reports what
 * happened via `onDismissed(result)` after its exit animation.
 *
 * @example
 * <AsNeededSheet
 *   visible={open}
 *   medications={meds}
 *   medicationId={params.medicationId}
 *   onClose={() => setOpen(false)}
 *   onLog={logAsNeeded}
 *   onDismissed={(r) => { router.back(); if (r.type === 'logged') toast.show(…); }}
 * />
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  NotebookPen,
  PackageOpen,
  PackageX,
  PillBottle,
  Plus,
  TriangleAlert,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { formatDose } from '@/lib/ui/format';
import { isSupplyShort } from '@/lib/ui/supply';
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  MedTile,
  PressableScale,
  Sheet,
  Stepper,
  Text,
  TextField,
  useTheme,
} from '@/components/ds';
import type { IntakeLog, Medication } from '@/types';
import { getSupplyState } from './medicine-info';
import { Notice } from './parts';

export type AsNeededResult =
  | { type: 'logged'; medication: Medication; log: IntakeLog; amount: number }
  | { type: 'addMedicine' }
  /** Not enough supply for the dose: open the medicine so the supply can be updated. */
  | { type: 'updateSupply'; medicationId: string }
  | { type: 'cancelled' };

export interface AsNeededSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Fires after the exit animation with what happened. */
  onDismissed?: (result: AsNeededResult) => void;
  /** All medicines of the profile; the picker lists the active as-needed ones. */
  medications: Medication[];
  /** Preselect this medicine (skips the picker). */
  medicationId?: string;
  /** Safety check + save. Resolve the log, or null when cancelled / failed. */
  onLog: (medication: Medication, amount: number, notes?: string) => Promise<IntakeLog | null>;
}

const MAX_DOSES = 20;

export function AsNeededSheet({
  visible,
  onClose,
  onDismissed,
  medications,
  medicationId,
  onLog,
}: AsNeededSheetProps) {
  const prnMeds = React.useMemo(
    () =>
      medications.filter((m) => m.isActive && m.isPrn).sort((a, b) => a.name.localeCompare(b.name)),
    [medications]
  );
  const preset = medicationId ? medications.find((m) => m.id === medicationId) : undefined;
  const [selectedId, setSelectedId] = React.useState<string | null>(
    preset?.id ?? (prnMeds.length === 1 ? prnMeds[0].id : null)
  );
  const [count, setCount] = React.useState(1);
  const [note, setNote] = React.useState('');
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const result = React.useRef<AsNeededResult>({ type: 'cancelled' });

  // A preset id may arrive after the store loaded.
  React.useEffect(() => {
    if (!selectedId && preset) setSelectedId(preset.id);
    else if (!selectedId && !medicationId && prnMeds.length === 1) setSelectedId(prnMeds[0].id);
  }, [preset, prnMeds, selectedId, medicationId]);

  const selected = (selectedId && medications.find((m) => m.id === selectedId)) || null;
  const canChoose = !preset && prnMeds.length > 1;

  const select = (m: Medication) => {
    setSelectedId(m.id);
    setCount(1);
    setNote('');
    setNoteOpen(false);
  };

  const finish = (r: AsNeededResult) => {
    result.current = r;
    onClose();
  };

  const log = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const amount = count * selected.dosageAmount;
      const saved = await onLog(selected, amount, note);
      if (saved) finish({ type: 'logged', medication: selected, log: saved, amount });
    } finally {
      setBusy(false);
    }
  };

  const total = selected ? count * selected.dosageAmount : 0;
  // The backend refuses to log more than what's left (InventoryInsufficientError).
  const notEnough = !!selected && isSupplyShort(selected.inventoryCount, total);

  let title: string;
  let subtitle: string | undefined;
  let body: React.ReactNode;
  let footer: React.ReactNode = null;
  let headerLeft: React.ReactNode = null;

  if (!selected && prnMeds.length === 0) {
    title = i18n.t('ui.medicines.asNeeded.title');
    body = (
      <EmptyState
        compact
        icon={PillBottle}
        title={i18n.t('ui.medicines.asNeeded.emptyTitle')}
        message={i18n.t('ui.medicines.asNeeded.emptyMessage')}
        action={{
          label: i18n.t('ui.medicines.addMedicine'),
          icon: Plus,
          onPress: () => finish({ type: 'addMedicine' }),
        }}
      />
    );
  } else if (!selected) {
    title = i18n.t('ui.medicines.asNeeded.pickTitle');
    subtitle = i18n.t('ui.medicines.asNeeded.pickSubtitle');
    body = <MedicinePicker medications={prnMeds} onSelect={select} />;
  } else {
    title = i18n.t('ui.medicines.asNeeded.title');
    if (canChoose) {
      headerLeft = (
        <IconButton
          icon={ChevronLeft}
          size="sm"
          variant="tinted"
          tone="default"
          accessibilityLabel={i18n.t('ui.medicines.asNeeded.changeMedicine')}
          onPress={() => setSelectedId(null)}
        />
      );
    }
    body = (
      <DoseForm
        medication={selected}
        count={count}
        onCountChange={setCount}
        total={total}
        note={note}
        onNoteChange={setNote}
        noteOpen={noteOpen}
        onOpenNote={() => setNoteOpen(true)}
        notEnough={notEnough}
        onUpdateSupply={() => finish({ type: 'updateSupply', medicationId: selected.id })}
      />
    );
    footer = (
      <Button
        label={i18n.t('ui.medicines.asNeeded.log', {
          amount: formatDose(total, selected.dosageUnit),
        })}
        icon={Check}
        variant="success"
        size="lg"
        fullWidth
        loading={busy}
        disabled={notEnough && !busy}
        onPress={log}
      />
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        if (busy) return;
        onClose();
      }}
      onDismissed={() => {
        const r = result.current;
        result.current = { type: 'cancelled' };
        onDismissed?.(r);
      }}
      title={title}
      subtitle={subtitle}
      headerLeft={headerLeft}
      footer={footer}>
      {body}
    </Sheet>
  );
}

function MedicinePicker({
  medications,
  onSelect,
}: {
  medications: Medication[];
  onSelect: (m: Medication) => void;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <View style={{ gap: 10 }}>
      {medications.map((m, i) => {
        const supply = getSupplyState(m);
        const dose = formatDose(m.dosageAmount, m.dosageUnit);
        const detail = supply.empty
          ? i18n.t('ui.medicines.status.noneLeft')
          : `${dose} · ${supply.leftLabel}`;
        return (
          <Animated.View
            key={m.id}
            entering={reduceMotion ? undefined : FadeIn.delay(Math.min(i, 8) * 20)}>
            <PressableScale
              onPress={() => onSelect(m)}
              accessibilityRole="button"
              accessibilityLabel={`${m.name}, ${detail}`}
              style={{
                minHeight: 76,
                borderRadius: 20,
                backgroundColor: colors.surfaceSunken,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 14,
              }}>
              <MedTile name={m.name} imageUri={m.imageUri} size="md" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="headline">{m.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {supply.empty || supply.low ? (
                    <Icon
                      as={supply.empty ? PackageX : TriangleAlert}
                      size={14}
                      tone={supply.empty ? 'danger' : 'warning'}
                    />
                  ) : null}
                  <Text
                    variant="subhead"
                    tone={supply.empty ? 'danger' : 'secondary'}
                    style={{ flexShrink: 1 }}>
                    {detail}
                  </Text>
                </View>
              </View>
              <Icon as={ChevronRight} size={20} tone="tertiary" />
            </PressableScale>
          </Animated.View>
        );
      })}
    </View>
  );
}

function DoseForm({
  medication: med,
  count,
  onCountChange,
  total,
  note,
  onNoteChange,
  noteOpen,
  onOpenNote,
  notEnough,
  onUpdateSupply,
}: {
  medication: Medication;
  count: number;
  onCountChange: (n: number) => void;
  total: number;
  note: string;
  onNoteChange: (s: string) => void;
  noteOpen: boolean;
  onOpenNote: () => void;
  notEnough: boolean;
  onUpdateSupply: () => void;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const supply = getSupplyState(med);

  return (
    <View style={{ gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <MedTile name={med.name} imageUri={med.imageUri} size="lg" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title2">{med.name}</Text>
          <Text variant="subhead" tone="secondary">
            {i18n.t('ui.medicines.asNeeded.standardDose', {
              amount: formatDose(med.dosageAmount, med.dosageUnit),
            })}
          </Text>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="headline" align="center">
          {i18n.t('ui.medicines.asNeeded.howMany')}
        </Text>
        <Stepper
          value={count}
          onChange={onCountChange}
          min={0.5}
          max={MAX_DOSES}
          step={0.5}
          unit={i18n.t('ui.medicines.asNeeded.doseUnit', { count })}
          accessibilityLabel={i18n.t('ui.medicines.asNeeded.howMany')}
        />
      </View>

      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={i18n.t('ui.medicines.asNeeded.total', {
          amount: formatDose(total, med.dosageUnit),
        })}
        style={{
          alignItems: 'center',
          gap: 4,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 20,
          backgroundColor: colors.surfaceSunken,
        }}>
        <Text variant="title3" tabular>
          {i18n.t('ui.medicines.asNeeded.total', { amount: formatDose(total, med.dosageUnit) })}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon as={Clock} size={14} tone="secondary" />
          <Text variant="footnote" tone="secondary">
            {i18n.t('ui.medicines.asNeeded.takenNow')}
          </Text>
        </View>
      </View>

      {notEnough ? (
        <View style={{ gap: 8 }}>
          <Notice
            icon={PackageX}
            tone="danger"
            text={i18n.t('ui.medicines.asNeeded.notEnough', {
              amount: formatDose(med.inventoryCount, med.dosageUnit),
            })}
          />
          <Button
            label={i18n.t('ui.medicines.supply.update')}
            icon={PackageOpen}
            variant="secondary"
            fullWidth
            onPress={onUpdateSupply}
          />
        </View>
      ) : supply.lowMessage ? (
        <Notice icon={TriangleAlert} tone="warning" text={supply.lowMessage} />
      ) : null}

      {noteOpen ? (
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)}>
          <TextField
            label={i18n.t('ui.medicines.asNeeded.noteLabel')}
            placeholder={i18n.t('ui.medicines.asNeeded.notePlaceholder')}
            value={note}
            onChangeText={onNoteChange}
            multiline
            autoFocus
            maxLength={500}
          />
        </Animated.View>
      ) : (
        <Button
          label={i18n.t('ui.medicines.asNeeded.addNote')}
          icon={NotebookPen}
          variant="plain"
          onPress={onOpenNote}
          style={{ alignSelf: 'center' }}
        />
      )}
    </View>
  );
}
