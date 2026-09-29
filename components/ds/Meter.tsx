/**
 * Thin capsule progress bar (e.g. supply level).
 *
 * @example
 * <Meter progress={count / packageSize} tone={low ? 'warning' : 'success'} />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, withAlpha } from '@/lib/theme';

export interface MeterProps {
  /** 0..1 */
  progress: number;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Meter({
  progress,
  tone = 'accent',
  height = 6,
  style,
  accessibilityLabel,
}: MeterProps) {
  const { colors, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const p = useSharedValue(clamped);

  React.useEffect(() => {
    p.value = reduceMotion
      ? clamped
      : withTiming(clamped, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [clamped, reduceMotion, p]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: withAlpha(colors.ink, isDark ? 0.08 : 0.07),
          overflow: 'hidden',
        },
        style,
      ]}>
      <Animated.View
        style={[{ height, borderRadius: height / 2, backgroundColor: colors[tone] }, fillStyle]}
      />
    </View>
  );
}
