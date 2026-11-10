/**
 * Details of one Journal entry (DESIGN.md §5.5): title = medicine, subtitle = date, then rows
 * What happened / Taken at (or Skipped at, with a small "Recorded …" line when the entry was
 * written more than 5 minutes later) / Planned for / Amount / Note. Secondary "Edit this entry" (the parent opens
 * Log a past dose in edit mode) and danger "Remove this entry" (the parent confirms).
 * Presentational: the parent runs the actions once the sheet has closed (`onDismissed`).
 *
 * @example
 * <EntrySheet visible={open} log={log} medication={med} onClose={() => setOpen(false)}
 *   onDismissed={afterClose} onChange={() => …} onDelete={() => …} />
 */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { isSameDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { medicineDisplayName } from '@/components/medicines/medicine-info';
import { Button, Sheet, StatusPill, Text, radii, useTheme } from '@/components/ds';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import type { IntakeLog, Medication } from '@/types';
import { statusPillTone } from './StatusDot';
import { dayHeading, longDate, statusLabel, unscheduledLabel } from './utils';

/** Show "Recorded …" when the entry was written this long after (or before) the dose time. */
const RECORDED_GAP_MS = 5 * 60_000;

export interface EntrySheetProps {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  log: IntakeLog | null;
  /** Undefined when the medicine was deleted (the entry can only be removed). */
  medication?: Medication;
  onChange: () => void;
  onDelete: () => void;
}

export function EntrySheet({
  visible,
  onClose,
  onDismissed,
  log,
  medication,
  onChange,
  onDelete,
}: EntrySheetProps) {
  const { formatTime } = useTimeFormat();
  if (!log) return null;

  const name = medication
    ? medicineDisplayName(medication)
    : i18n.t('ui.journal.row.deletedMedicine');
  const actual = new Date(log.actualTime);
  const unit = medication?.dosageUnit ?? 'units';

  let planned = unscheduledLabel(medication);
  if (log.scheduledTime) {
    const s = new Date(log.scheduledTime);
    planned = isSameDay(s, actual)
      ? formatTime(s)
      : i18n.t('ui.journal.entry.dayAtTime', { day: dayHeading(s), time: formatTime(s) });
  }

  const note = log.notes?.trim();
  const createdAt = log.createdAt ? new Date(log.createdAt) : null;
  const recordedLate =
    !!createdAt && Math.abs(createdAt.getTime() - actual.getTime()) > RECORDED_GAP_MS;
  const recorded = createdAt
    ? isSameDay(createdAt, actual)
      ? formatTime(createdAt)
      : i18n.t('ui.journal.entry.dayAtTime', {
          day: dayHeading(createdAt),
          time: formatTime(createdAt),
        })
    : '';

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title={name}
      subtitle={longDate(actual)}
      footer={
        <>
          {medication ? (
            <Button
              label={i18n.t('ui.journal.entry.edit')}
              variant="secondary"
              onPress={onChange}
            />
          ) : null}
          <Button
            label={i18n.t('ui.journal.entry.remove')}
            variant="dangerQuiet"
            onPress={onDelete}
          />
        </>
      }>
      <View style={{ gap: 12, paddingBottom: 4 }}>
        <DetailGroup>
          <DetailRow
            label={i18n.t('ui.journal.entry.whatHappened')}
            a11yValue={statusLabel(log.action)}>
            <StatusPill label={statusLabel(log.action)} tone={statusPillTone(log.action)} />
          </DetailRow>
          <DetailRow
            label={i18n.t(
              log.action === 'skipped' ? 'ui.journal.entry.skippedAt' : 'ui.journal.entry.takenAt'
            )}
            value={formatTime(actual)}
            detail={
              recordedLate ? i18n.t('ui.journal.entry.recorded', { when: recorded }) : undefined
            }
          />
          <DetailRow label={i18n.t('ui.journal.entry.plannedFor')} value={planned} />
          {log.action !== 'skipped' && log.dosageAmount > 0 ? (
            <DetailRow
              label={i18n.t('ui.journal.entry.amount')}
              value={formatDose(log.dosageAmount, unit)}
            />
          ) : null}
          {note ? <DetailRow label={i18n.t('ui.journal.entry.note')} value={note} stacked /> : null}
        </DetailGroup>
        {!medication ? (
          <Text variant="callout" tone="secondary" style={{ paddingHorizontal: 4 }}>
            {i18n.t('ui.journal.entry.deletedHint')}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

function DetailGroup({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ borderRadius: radii.card, backgroundColor: colors.field, overflow: 'hidden' }}>
      {rows.map((row, i) => (
        <View key={i}>
          {i > 0 ? (
            <View
              style={{
                marginHorizontal: 16,
                height: StyleSheet.hairlineWidth,
                backgroundColor: colors.line2,
              }}
            />
          ) : null}
          {row}
        </View>
      ))}
    </View>
  );
}

/** Label left (17 ink2), value right (19/700); `stacked` puts a long value under the label. */
function DetailRow({
  label,
  value,
  a11yValue,
  stacked = false,
  detail,
  children,
}: {
  label: string;
  value?: string;
  /** Small secondary line under the value (e.g. "Recorded 21:40"). */
  detail?: string;
  a11yValue?: string;
  stacked?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${a11yValue ?? value ?? ''}${detail ? `. ${detail}` : ''}`}
      style={{
        minHeight: 64,
        paddingHorizontal: 16,
        paddingVertical: 12,
        justifyContent: 'center',
        flexDirection: stacked ? 'column' : 'row',
        flexWrap: stacked ? 'nowrap' : 'wrap',
        alignItems: stacked ? 'stretch' : 'center',
        columnGap: 12,
        rowGap: 4,
      }}>
      <Text variant="callout" tone="secondary" style={stacked ? null : { flexGrow: 1 }}>
        {label}
      </Text>
      {children ?? (
        <Text
          variant={stacked ? 'body' : 'headline'}
          tabular={!stacked}
          style={stacked ? null : { flexShrink: 1, textAlign: 'right', marginLeft: 'auto' }}>
          {value}
        </Text>
      )}
      {detail ? (
        <Text
          variant="footnote"
          tone="secondary"
          tabular
          style={{ width: '100%', textAlign: 'right' }}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}
