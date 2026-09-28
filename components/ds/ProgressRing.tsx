/**
 * Circular progress (react-native-svg). Animates from the previous value (600 ms ease-out).
 *
 * @example
 * <ProgressRing progress={taken / total} size={88} strokeWidth={10} tone="success">
 *   <Text variant="title3">{taken}/{total}</Text>
 * </ProgressRing>
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  /** Explicit track colour (default surfaceSunken). */
  trackColor?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 8,
  tone = 'accent',
  trackColor,
  children,
  style,
  accessibilityLabel,
}: ProgressRingProps) {
  const { colors, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(clamped);

  React.useEffect(() => {
    p.value = reduceMotion
      ? clamped
      : withTiming(clamped, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [clamped, reduceMotion, p]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - p.value),
    strokeOpacity: p.value <= 0.001 ? 0 : 1,
  }));

  const color = colors[tone];
  const track = trackColor ?? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,27,45,0.07)');

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[
        { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}
