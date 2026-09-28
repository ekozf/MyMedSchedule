/**
 * Sticky day header for the timeline: a small solid pill ("Today · Mon 28 Sep") that stays
 * readable when it pins over the scrolling cards.
 *
 * @example
 * <DayHeader date={section.date} count={section.data.length} />
 */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import i18n from '@/lib/i18n';
import { Text, useTheme, withAlpha } from '@/components/ds';
import { dayTitle } from './utils';

export function DayHeader({ date, count, now }: { date: Date; count: number; now?: Date }) {
  const { colors, isDark } = useTheme();
  const { title, detail } = dayTitle(date, now);
  const countLabel = i18n.t('ui.journal.row.entriesOnDay', { count });
  return (
    <View style={{ paddingTop: 10, paddingBottom: 8 }}>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={[title, detail, countLabel].filter(Boolean).join(', ')}
        style={{
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 8,
          minHeight: 32,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: withAlpha(colors.surfaceSolid, isDark ? 0.96 : 0.94),
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: colors.stroke,
          shadowColor: colors.shadow,
          shadowOpacity: isDark ? 0 : 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        }}>
        <Text variant="headline">{title}</Text>
        {detail ? (
          <Text variant="footnote" tone="secondary">
            {detail}
          </Text>
        ) : null}
        <Text variant="footnote" tone="tertiary">
          {countLabel}
        </Text>
      </View>
    </View>
  );
}
