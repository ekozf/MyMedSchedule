/**
 * Caption-style section overline with optional icon and right accessory.
 *
 * @example
 * <SectionHeader icon={Sunrise} title="Morning" right={<Text variant="footnote" tone="tertiary">2 of 3</Text>} />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { Icon } from './Icon';

export interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, icon, right, style }: SectionHeaderProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 4,
          marginTop: 20,
          marginBottom: 8,
          minHeight: 24,
        },
        style,
      ]}>
      {icon ? <Icon as={icon} size={16} tone="secondary" /> : null}
      <Text variant="caption" tone="secondary" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </Text>
      {right}
    </View>
  );
}
