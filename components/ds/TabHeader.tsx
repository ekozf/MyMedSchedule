/**
 * Top of a tab screen: optional line above the title (tappable, e.g. the date that opens a day
 * picker), the `title1` title, and optional right actions.
 *
 * @example
 * <TabHeader title="Medicines" right={<HeaderTextAction label="+ Add" onPress={add} />} />
 * <TabHeader overline="Monday 9 November" onOverlinePress={openCalendar} title="Hello, Margaret" />
 */
import * as React from 'react';
import { View } from 'react-native';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface TabHeaderProps {
  title: string;
  /** Line above the title (callout, ink2). */
  overline?: string;
  onOverlinePress?: () => void;
  /** Accessibility label for the overline button. */
  overlineAccessibilityLabel?: string;
  right?: React.ReactNode;
  /**
   * Put `right` on the title row instead of the row above it (only when there is no overline).
   * Default false.
   */
  rightInline?: boolean;
  /** Line under the title (callout, ink2). */
  subtitle?: string;
}

export function TabHeader({
  title,
  overline,
  onOverlinePress,
  overlineAccessibilityLabel,
  right,
  rightInline = false,
  subtitle,
}: TabHeaderProps) {
  const inline = rightInline && !overline && !!right;
  const over = overline ? (
    <Text variant="callout" tone="secondary">
      {overline}
    </Text>
  ) : null;
  return (
    <View style={{ paddingTop: 4, paddingBottom: 16 }}>
      {!inline && (over || right) ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 48,
            marginBottom: 8,
            gap: 12,
          }}>
          <View style={{ flex: 1 }}>
            {over && onOverlinePress ? (
              <PressableScale
                onPress={onOverlinePress}
                accessibilityRole="button"
                accessibilityLabel={overlineAccessibilityLabel ?? overline}
                style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}>
                {over}
              </PressableScale>
            ) : (
              over
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{right}</View>
        </View>
      ) : null}
      {inline ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text variant="title1" style={{ flex: 1 }}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{right}</View>
        </View>
      ) : (
        <Text variant="title1">{title}</Text>
      )}
      {subtitle ? (
        <Text variant="callout" tone="secondary" style={{ marginTop: 6 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
