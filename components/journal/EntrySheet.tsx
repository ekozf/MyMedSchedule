/**
 * Details of one journal entry, with **Change** (status, amount, time, note) and **Delete**.
 * Presentational: saving and deleting are done by the parent (`useJournalActions`).
 *
 * @example
 * <EntrySheet
 *   visible={open}
 *   log={log}
 *   medication={med}
 *   onClose={() => setOpen(false)}
 *   onDismissed={afterClose}
 *   onSave={(draft) => saveChange(log, draft)}   // resolves true when saved
 *   onDelete={() => { pendingDelete = log; setOpen(false); }}
 * />
 */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CalendarClock,
  Clock,
  NotebookPen,
  Pencil,
  Pill,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import {
  Button,
  Icon,
  MedTile,
  SegmentedControl,
  Sheet,
  Stepper,
  Text,
  TextField,
  radii,
  useTheme,
} from '@/components/ds';
import { formatDose, formatUnit, formatShortDate, useTimeFormat } from '@/lib/ui/format';
import type { IntakeAction, IntakeLog, Medication } from '@/types';
import { StatusDot, statusMeta } from './StatusDot';
import { WhenFields } from './WhenFields';
import { ACTIONS, amountStep, dayLabel, isInFuture, unscheduledLabel } from './utils';

export interface EntryDraft {
  action: IntakeAction;
  dosageAmount: number;
  notes: string;
  actualTime: Date;
}

export interface EntrySheetProps {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  log: IntakeLog | null;
  /** Undefined when the medicine was deleted (entry can only be removed). */
  medication?: Medication;
  /** Resolve `true` when saved (the parent then closes the sheet). */
  onSave: (draft: EntryDraft) => Promise<boolean>;
  onDelete: () => void;
  /** Open straight in "Change" mode (preview). */
  initialMode?: 'view' | 'change';
}

export function EntrySheet({
  visible,
  onClose,
  onDismissed,
  log,
  medication,
  onSave,
  onDelete,
  initialMode = 'view',
}: EntrySheetProps) {
  const { formatTime } = useTimeFormat();
  const [mode, setMode] = React.useState<'view' | 'change'>(initialMode);
  const [draft, setDraft] = React.useState<EntryDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);

  // Reset whenever the sheet opens for an entry.
  React.useEffect(() => {
    if (visible && log) {
      setMode(initialMode);
      setShowErrors(false);
      setDraft({
        action: log.action,
        dosageAmount: log.dosageAmount,
        notes: log.notes ?? '',
        actualTime: new Date(log.actualTime),
      });
    }
  }, [visible, log, initialMode]);

  if (!log) return null;

  const name = medication?.name ?? i18n.t('ui.journal.row.deletedMedicine');
  const status = statusMeta(log.action);
  const actual = new Date(log.actualTime);
  const unit = medication?.dosageUnit ?? 'units';
  const loggedWhen = i18n.t('ui.journal.entry.dayAtTime', {
    day: dayLabel(actual),
    time: formatTime(actual),
  });

  const scheduledText = log.scheduledTime
    ? (() => {
        const s = new Date(log.scheduledTime);
        const sameDay = formatShortDate(s) === formatShortDate(actual);
        return sameDay
          ? formatTime(s)
          : i18n.t('ui.journal.entry.dayAtTime', { day: dayLabel(s), time: formatTime(s) });
      })()
    : unscheduledLabel(medication);

  const changing = mode === 'change' && !!medication && !!draft;
  const amountInvalid = !!draft && draft.action !== 'skipped' && !(draft.dosageAmount > 0);
  const timeInvalid = !!draft && isInFuture(draft.actualTime);

  const save = async () => {
    if (!draft) return;
    if (amountInvalid || timeInvalid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <MedTile name={medication?.name ?? '?'} imageUri={medication?.imageUri} size="md" />
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      headerLeft={header}
      title={changing ? i18n.t('ui.journal.entry.changeTitle') : name}
      subtitle={changing ? name : `${status.label} · ${loggedWhen}`}
      footer={
        changing ? (
          <>
            <Button
              label={i18n.t('ui.common.save')}
              size="lg"
              fullWidth
              loading={saving}
              onPress={save}
            />
            <Button
              label={i18n.t('ui.common.cancel')}
              variant="plain"
              fullWidth
              disabled={saving}
              onPress={() => setMode('view')}
            />
          </>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {medication ? (
              <Button
                label={i18n.t('ui.common.change')}
                icon={Pencil}
                variant="secondary"
                size="lg"
                style={{ flex: 1 }}
                onPress={() => setMode('change')}
              />
            ) : null}
            <Button
              label={i18n.t('ui.common.delete')}
              icon={Trash2}
              variant="secondaryDanger"
              size="lg"
              style={{ flex: 1 }}
              onPress={onDelete}
            />
          </View>
        )
      }>
      {changing && draft ? (
        <View style={{ gap: 20, paddingBottom: 8 }}>
          <Field label={i18n.t('ui.journal.entry.whatHappened')}>
            <SegmentedControl
              size="lg"
              value={draft.action}
              onChange={(action) =>
                setDraft({
                  ...draft,
                  action,
                  // Coming from "skipped" with no amount: start from the standard dose.
                  dosageAmount:
                    action !== 'skipped' && !(draft.dosageAmount > 0)
                      ? medication!.dosageAmount
                      : draft.dosageAmount,
                })
              }
              options={ACTIONS.map((a) => ({
                value: a,
                label: statusMeta(a).label,
                icon: statusMeta(a).icon,
              }))}
            />
          </Field>

          {draft.action !== 'skipped' ? (
            <Field label={i18n.t('ui.journal.entry.howMuch')}>
              <Stepper
                value={draft.dosageAmount}
                onChange={(dosageAmount) => setDraft({ ...draft, dosageAmount })}
                min={amountStep(medication!.dosageAmount)}
                step={amountStep(medication!.dosageAmount)}
                allowDecimal
                unit={formatUnit(draft.dosageAmount, unit)}
                accessibilityLabel={i18n.t('ui.journal.entry.howMuch')}
              />
              <Text
                variant="footnote"
                tone={showErrors && amountInvalid ? 'danger' : 'tertiary'}
                align="center">
                {showErrors && amountInvalid
                  ? i18n.t('ui.journal.entry.invalidAmount')
                  : i18n.t('ui.journal.entry.standardDose', {
                      dose: formatDose(medication!.dosageAmount, unit),
                    })}
              </Text>
            </Field>
          ) : null}

          <Field label={i18n.t('ui.journal.entry.when')}>
            <WhenFields
              value={draft.actualTime}
              onChange={(actualTime) => setDraft({ ...draft, actualTime })}
            />
          </Field>

          <TextField
            label={i18n.t('ui.journal.entry.note')}
            value={draft.notes}
            onChangeText={(notes) => setDraft({ ...draft, notes })}
            placeholder={i18n.t('ui.journal.entry.notePlaceholder')}
            multiline
          />
        </View>
      ) : (
        <View style={{ gap: 14, paddingBottom: 4 }}>
          <DetailList>
            <DetailRow
              leading={<StatusDot action={log.action} size={28} />}
              label={i18n.t('ui.journal.entry.status')}
              value={status.label}
              valueTone={status.tone}
            />
            <DetailRow icon={Clock} label={i18n.t('ui.journal.entry.logged')} value={loggedWhen} />
            <DetailRow
              icon={CalendarClock}
              label={i18n.t('ui.journal.entry.scheduled')}
              value={scheduledText}
            />
            {log.dosageAmount > 0 ? (
              <DetailRow
                icon={Pill}
                label={i18n.t('ui.journal.entry.amount')}
                value={formatDose(log.dosageAmount, unit)}
              />
            ) : null}
            {log.notes ? (
              <DetailRow
                icon={NotebookPen}
                label={i18n.t('ui.journal.entry.note')}
                value={log.notes}
                italic
              />
            ) : null}
          </DetailList>
          {!medication ? (
            <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 4 }}>
              {i18n.t('ui.journal.entry.deletedHint')}
            </Text>
          ) : null}
        </View>
      )}
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text variant="headline" accessibilityRole="header">
        {label}
      </Text>
      {children}
    </View>
  );
}

function DetailList({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View
      style={{
        borderRadius: radii.row,
        backgroundColor: colors.surfaceSunken,
        overflow: 'hidden',
      }}>
      {rows.map((row, i) => (
        <View key={i}>
          {i > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 56,
                right: 0,
                height: StyleSheet.hairlineWidth * 2,
                backgroundColor: colors.separator,
              }}
            />
          ) : null}
          {row}
        </View>
      ))}
    </View>
  );
}

function DetailRow({
  icon,
  leading,
  label,
  value,
  valueTone,
  italic,
}: {
  icon?: LucideIcon;
  leading?: React.ReactNode;
  label: string;
  value: string;
  valueTone?: 'success' | 'danger' | 'warning';
  italic?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}>
      <View style={{ width: 30, alignItems: 'center' }}>
        {leading ?? (icon ? <Icon as={icon} size={20} tone="secondary" /> : null)}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="footnote" tone="secondary">
          {label}
        </Text>
        <Text
          variant="body"
          weight={valueTone ? '600' : undefined}
          tone={valueTone ?? 'primary'}
          style={italic ? { fontStyle: 'italic' } : null}>
          {value}
        </Text>
      </View>
    </View>
  );
}
