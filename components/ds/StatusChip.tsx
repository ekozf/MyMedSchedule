/**
 * Small status pill: icon + label (status is never colour alone).
 *
 * @example
 * <StatusChip tone="warning" icon={Clock} label="Late · 2 h" />
 * <StatusChip tone="danger" icon={X} label="Skipped" />
 * <StatusChip label="Moved" />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { statusColors, useTheme, type StatusTone } from '@/lib/theme';
import { Text } from './Text';
import { Icon } from './Icon';

export interface StatusChipProps {
  label: string;
  icon?: LucideIcon;
  tone?: StatusTone;
  style?: StyleProp<ViewStyle>;
}

export function StatusChip({ label, icon, tone = 'default', style }: StatusChipProps) {
  const { colors } = useTheme();
  const sc = statusColors(colors, tone);
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 4,
          minHeight: 24,
          paddingHorizontal: 9,
          paddingVertical: 2,
          borderRadius: 12,
          backgroundColor: sc.bg,
        },
        style,
      ]}>
      {icon ? <Icon as={icon} size={13} color={sc.fg} strokeWidth={2.5} /> : null}
      <Text variant="footnote" weight="600" color={sc.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
