/**
 * Supply meter (docs/DESIGN.md §4): 8 px track, `accent` fill, `late` when low. Track is `bg`
 * when the bar sits on a `field` card (default; `field2` in dark mode, where `bg` barely differs
 * from `field`) or `field` when it sits on `bg`.
 *
 * @example
 * <SupplyBar value={29 / 60} low={false} />
 * <SupplyBar value={0.1} low on="bg" accessibilityLabel="6 left, refill soon" />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme';

export interface SupplyBarProps {
  /** 0..1 */
  value: number;
  low?: boolean;
  /** Fill when not low: 'accent' (default) or 'neutral' (`ink2`, a plain count with no warning). */
  tone?: 'accent' | 'neutral';
  /** Surface the bar sits on. Default 'field'. */
  on?: 'field' | 'bg';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function SupplyBar({
  value,
  low = false,
  tone = 'accent',
  on = 'field',
  accessibilityLabel,
  style,
}: SupplyBarProps) {
  const { colors, isDark } = useTheme();
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: on === 'field' ? (isDark ? colors.field2 : colors.bg) : colors.field,
          overflow: 'hidden',
        },
        style,
      ]}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: 4,
          backgroundColor: low ? colors.late : tone === 'neutral' ? colors.ink2 : colors.accent,
        }}
      />
    </View>
  );
}
