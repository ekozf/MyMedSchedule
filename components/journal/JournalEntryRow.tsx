/**
 * One journal entry on the timeline: time column · status node on a vertical rail · glass card
 * with the medicine name, "Taken · 1 pill · scheduled 08:00" and the note.
 * Tap opens the entry sheet; swipe left reveals Delete (also in the sheet).
 *
 * @example
 * <JournalEntryRow item={item} medication={med} onPress={open} onDelete={remove} />
 */
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Card, SwipeableRow, Text, radii, useTheme } from '@/components/ds';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import type { Medication } from '@/types';
import { StatusDot, statusMeta } from './StatusDot';
import { unscheduledLabel, type JournalItem } from './utils';

export interface JournalEntryRowProps {
  item: JournalItem;
  /** Undefined when the medicine was deleted. */
  medication?: Medication;
  onPress: () => void;
  onDelete: () => void;
  /** Stagger the entering animation (first few rows only). */
  animate?: boolean;
}

const DOT = 24;
const DOT_TOP = 16;
const MAX_STAGGERED = 8;

/** "1 pill · scheduled 08:00" (amount only for taken / partial). */
export function entryDetail(
  item: Pick<JournalItem, 'log'>,
  medication: Medication | undefined,
  formatTime: (d: Date) => string
): string {
  const { log } = item;
  const parts: string[] = [];
  if (log.action !== 'skipped' && log.dosageAmount > 0) {
    parts.push(formatDose(log.dosageAmount, medication?.dosageUnit ?? 'units'));
  }
  parts.push(
    log.scheduledTime
      ? i18n.t('ui.journal.row.scheduled', { time: formatTime(new Date(log.scheduledTime)) })
      : unscheduledLabel(medication)
  );
  return parts.join(' · ');
}

export function JournalEntryRow({
  item,
  medication,
  onPress,
  onDelete,
  animate = true,
}: JournalEntryRowProps) {
  const { colors } = useTheme();
  const { formatTime, is24h } = useTimeFormat();
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { log } = item;
  const status = statusMeta(log.action);
  const name = medication?.name ?? i18n.t('ui.journal.row.deletedMedicine');
  const time = formatTime(new Date(log.actualTime));
  const detail = entryDetail(item, medication, formatTime);
  // Time column grows with the system font size so the rail stays aligned without clipping.
  const timeWidth = Math.round((is24h ? 48 : 70) * Math.min(Math.max(fontScale, 1), 1.8));

  const entering =
    !animate || item.index >= MAX_STAGGERED
      ? undefined
      : reduceMotion
        ? FadeIn.duration(200)
        : FadeInDown.delay(item.index * 20)
            .springify()
            .damping(18)
            .stiffness(180);

  return (
    <Animated.View entering={entering} style={{ flexDirection: 'row' }}>
      <View style={{ width: timeWidth, paddingTop: DOT_TOP }}>
        <Text
          variant="subhead"
          weight="600"
          tabular
          align="right"
          numberOfLines={1}
          adjustsFontSizeToFit
          importantForAccessibility="no"
          accessibilityElementsHidden>
          {time}
        </Text>
      </View>

      {/* Rail + status node */}
      <View style={{ width: DOT + 16, alignItems: 'center' }}>
        {!item.first ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              height: DOT_TOP,
              width: 2,
              backgroundColor: colors.separator,
            }}
          />
        ) : null}
        {!item.last ? (
          <View
            style={{
              position: 'absolute',
              top: DOT_TOP + DOT,
              bottom: 0,
              width: 2,
              backgroundColor: colors.separator,
            }}
          />
        ) : null}
        <View style={{ marginTop: DOT_TOP }}>
          <StatusDot action={log.action} size={DOT} />
        </View>
      </View>

      <View style={{ flex: 1, paddingBottom: 10 }}>
        <SwipeableRow
          radius={radii.row}
          rightActions={[
            {
              label: i18n.t('ui.common.delete'),
              icon: Trash2,
              tone: 'danger',
              onPress: onDelete,
            },
          ]}>
          <Card
            blur={false}
            radius={radii.row}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={[time, name, status.label, detail, log.notes]
              .filter(Boolean)
              .join(', ')}
            accessibilityHint={i18n.t('ui.journal.row.hint')}
            accessibilityActions={[{ name: 'delete', label: i18n.t('ui.common.delete') }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'delete') onDelete();
            }}
            style={{ paddingVertical: 12, paddingHorizontal: 14, minHeight: 56 }}
            padded={false}>
            <Text variant="headline" numberOfLines={2} tone={medication ? 'primary' : 'secondary'}>
              {name}
            </Text>
            <Text variant="subhead" tone="secondary" style={{ marginTop: 2 }}>
              <Text variant="subhead" weight="600" tone={status.tone}>
                {status.label}
              </Text>
              {` · ${detail}`}
            </Text>
            {log.notes ? (
              <Text
                variant="subhead"
                tone="secondary"
                numberOfLines={3}
                style={{ marginTop: 4, fontStyle: 'italic' }}>
                {log.notes}
              </Text>
            ) : null}
          </Card>
        </SwipeableRow>
      </View>
    </Animated.View>
  );
}
