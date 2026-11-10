/**
 * Journal day header: "Today, Monday 9" (20/800) with "2 taken" on the right. Sits on `bg` so it
 * stays readable when it sticks to the top while scrolling.
 *
 * @example
 * <DayHeader date={section.date} counts={countLogs(section.data.map((i) => i.log))} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from '@/components/ds';
import type { JournalCounts } from './filtering';
import { dayCountLabel, dayHeading } from './utils';

export function DayHeader({
  date,
  counts,
  now,
}: {
  date: Date;
  counts: JournalCounts;
  now?: Date;
}) {
  const { colors } = useTheme();
  const title = dayHeading(date, now);
  const right = dayCountLabel(counts);
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${title}, ${right}`}
      style={{
        backgroundColor: colors.bg,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        columnGap: 12,
        paddingTop: 20,
        paddingBottom: 10,
      }}>
      <Text variant="title3" weight="800" style={{ fontSize: 20, lineHeight: 25, flexShrink: 1 }}>
        {title}
      </Text>
      <Text variant="callout" tone="secondary" tabular>
        {right}
      </Text>
    </View>
  );
}
