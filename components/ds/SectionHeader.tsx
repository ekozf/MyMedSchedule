/**
 * Section label above a group of cards: 16/700 ink2 (no all-caps), optional right accessory.
 * Use `size="day"` for the larger 20/800 journal day header.
 *
 * @example
 * <SectionHeader title="When needed" />
 * <SectionHeader title="Today, Monday 9" size="day" right={<Text variant="footnote" tone="secondary">2 taken</Text>} />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { Icon } from './Icon';

export interface SectionHeaderProps {
  title: string;
  size?: 'label' | 'day';
  /** Optional 22 px monochrome icon. */
  icon?: LucideIcon;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, size = 'label', icon, right, style }: SectionHeaderProps) {
  const day = size === 'day';
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 4,
          marginTop: 24,
          marginBottom: 10,
          minHeight: 24,
        },
        style,
      ]}>
      {icon ? <Icon as={icon} size={22} tone="secondary" /> : null}
      <Text
        variant={day ? 'title3' : 'subhead'}
        weight={day ? '800' : '700'}
        tone={day ? 'primary' : 'secondary'}
        style={[{ flex: 1 }, day ? { fontSize: 20, lineHeight: 25 } : null]}
        accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}
