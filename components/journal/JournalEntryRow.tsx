/**
 * One Journal entry on the timeline: a 3 px rail with a 22 px status dot on the left, then the
 * time (18/700, with a small "early" / "late" tag when a scheduled dose was taken more than 2
 * hours off its planned time) with the status pill on the right, the medicine name (19/700, wraps, never cut)
 * and a detail line (15): amount, "planned 20:00" or "when needed", and the note in quotes.
 * A chevron on the right says the row opens; tapping it opens the entry sheet.
 *
 * @example
 * <JournalEntryRow item={item} medication={med} onPress={open} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { medicineDisplayName } from '@/components/medicines/medicine-info';
import { ChevronRight } from 'lucide-react-native';
import { Icon, PressableScale, StatusPill, Text, radii, useTheme } from '@/components/ds';
import { useTimeFormat } from '@/lib/ui/format';
import type { Medication } from '@/types';
import { DOT_SIZE, StatusDot, statusPillTone } from './StatusDot';
import { doseTiming, type JournalItem } from './filtering';
import { entryDetail, quoted, skipReason, statusLabel } from './utils';

export interface JournalEntryRowProps {
  item: JournalItem;
  /** Undefined when the medicine was deleted. */
  medication?: Medication;
  onPress: () => void;
}

const RAIL_W = 28;
const RAIL_LINE = 3;
const PAD_V = 12;
/** Centres the dot on the first line (time + 28 tall pill). */
const DOT_TOP = PAD_V + 14 - DOT_SIZE / 2;

export function JournalEntryRow({ item, medication, onPress }: JournalEntryRowProps) {
  const { colors } = useTheme();
  const { formatTime } = useTimeFormat();
  const { log } = item;
  const name = medication
    ? medicineDisplayName(medication)
    : i18n.t('ui.journal.row.deletedMedicine');
  const time = formatTime(new Date(log.actualTime));
  const status = statusLabel(log.action);
  const timing = doseTiming(log);
  const timingLabel = timing ? i18n.t(`ui.journal.row.${timing}`) : null;
  const detail = entryDetail(log, medication, formatTime);
  // Skipped: the note is the reason and already sits in the detail line.
  const note = log.notes?.trim() && !skipReason(log) ? quoted(log.notes.trim()) : null;

  const line = (style: object) => (
    <View
      style={[
        {
          position: 'absolute',
          left: (RAIL_W - RAIL_LINE) / 2,
          width: RAIL_LINE,
          backgroundColor: colors.line2,
        },
        style,
      ]}
    />
  );

  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ width: RAIL_W }}>
        {!item.first ? line({ top: 0, height: DOT_TOP }) : null}
        {!item.last ? line({ top: DOT_TOP + DOT_SIZE, bottom: 0 }) : null}
        <View style={{ marginTop: DOT_TOP, alignItems: 'center' }}>
          <StatusDot action={log.action} />
        </View>
      </View>

      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={[time, timingLabel, name, status, detail, note]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint={i18n.t('ui.journal.row.hint')}
        style={{
          flex: 1,
          minHeight: 48,
          paddingVertical: PAD_V,
          paddingLeft: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
        <View style={{ flex: 1, gap: 2 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              minHeight: 28,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
              <Text variant="body" weight="700" tabular>
                {time}
              </Text>
              {timingLabel ? (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 1,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: colors.line2,
                  }}>
                  <Text variant="caption" weight="600" tone="secondary">
                    {timingLabel}
                  </Text>
                </View>
              ) : null}
            </View>
            <StatusPill label={status} tone={statusPillTone(log.action)} />
          </View>
          <Text variant="headline" tone={medication ? 'primary' : 'secondary'}>
            {name}
          </Text>
          <Text variant="footnote" tone="secondary">
            {detail}
          </Text>
          {note ? (
            <Text variant="footnote" tone="secondary" numberOfLines={3}>
              {note}
            </Text>
          ) : null}
        </View>
        <Icon as={ChevronRight} size={22} tone="secondary" />
      </PressableScale>
    </View>
  );
}
