/**
 * Inline status message: icon + text (never colour alone), announced politely to screen readers.
 * Reserves its height when `reserve` is set so layouts don't jump when a message appears.
 *
 * @example
 * <StatusLine tone="danger" icon={CircleAlert} text="That's not right. Try again." />
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { Icon, Text, statusColors, useTheme, type StatusTone } from '@/components/ds';

export interface StatusLineProps {
  text?: string | null;
  icon: LucideIcon;
  tone?: StatusTone;
  /** Keep a one-line gap when empty. */
  reserve?: boolean;
}

export function StatusLine({ text, icon, tone = 'danger', reserve = false }: StatusLineProps) {
  const { colors } = useTheme();
  if (!text) return reserve ? <View style={{ minHeight: 22 }} /> : null;
  const fg = statusColors(colors, tone).fg;
  return (
    <Animated.View
      key={text}
      entering={FadeIn.duration(200)}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        minHeight: 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 8,
      }}>
      <Icon as={icon} size={18} color={fg} />
      <Text variant="subhead" color={fg} align="center" style={{ flexShrink: 1 }}>
        {text}
      </Text>
    </Animated.View>
  );
}
