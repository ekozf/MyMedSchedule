/**
 * Small status pill (13/700, radius 999): "Taken 08:12", "Skipped", "Recommended", "Paused".
 * Always words, never colour alone.
 *
 * @example
 * <StatusPill label="Taken" tone="done" />
 * <StatusPill label="Partial" tone="now" />
 * <StatusPill label="Skipped" />           // neutral
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { radii, useTheme } from '@/lib/theme';
import { Text } from './Text';
import { Icon } from './Icon';

export type PillTone = 'neutral' | 'done' | 'now' | 'danger' | 'accent';

export interface StatusPillProps {
  label: string;
  tone?: PillTone;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function StatusPill({ label, tone = 'neutral', icon, style }: StatusPillProps) {
  const { colors } = useTheme();
  const { bg, fg } =
    tone === 'done'
      ? { bg: colors.done, fg: colors.doneInk }
      : tone === 'now'
        ? { bg: colors.now, fg: colors.nowInk }
        : tone === 'danger'
          ? { bg: colors.dangerSoft, fg: colors.danger }
          : tone === 'accent'
            ? { bg: colors.accent, fg: colors.onAccent }
            : { bg: colors.field2, fg: colors.ink2 };
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 4,
          minHeight: 28,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radii.pill,
          backgroundColor: bg,
        },
        style,
      ]}>
      {icon ? <Icon as={icon} size={16} color={fg} strokeWidth={2.5} /> : null}
      <Text variant="caption" color={fg}>
        {label}
      </Text>
    </View>
  );
}
