/**
 * Pressable with a soft spring "press-in" scale (0.97) and optional haptic.
 * Falls back to an opacity dip when Reduce Motion is on.
 *
 * @example
 * <PressableScale onPress={open} accessibilityLabel="Open Metformin" style={styles.row}>
 *   …
 * </PressableScale>
 * <PressableScale haptic="tap" onPress={select}>…</PressableScale>
 */
import * as React from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { cssInterop } from 'nativewind';
import { haptics } from '@/lib/ui/haptics';
import { SPRING } from '@/lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressHaptic = 'light' | 'tap' | 'medium' | 'none';

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** NativeWind classes (resolved into `style`). */
  className?: string;
  /** Scale while pressed. Default 0.97. */
  activeScale?: number;
  /** Haptic fired on press. Default 'light'. */
  haptic?: PressHaptic;
  ref?: React.Ref<View>;
}

function PressableScaleImpl({
  children,
  style,
  activeScale = 0.97,
  haptic = 'light',
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  accessibilityRole = 'button',
  accessibilityState,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1 - pressed.value * 0.3 };
    return { transform: [{ scale: 1 - pressed.value * (1 - activeScale) }] };
  });

  const handlePressIn = (e: GestureResponderEvent) => {
    pressed.value = reduceMotion ? withTiming(1, { duration: 80 }) : withSpring(1, SPRING);
    onPressIn?.(e);
  };
  const handlePressOut = (e: GestureResponderEvent) => {
    pressed.value = reduceMotion ? withTiming(0, { duration: 120 }) : withSpring(0, SPRING);
    onPressOut?.(e);
  };
  const handlePress = (e: GestureResponderEvent) => {
    if (haptic !== 'none') haptics[haptic]();
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress ? handlePress : undefined}
      style={[style, animatedStyle]}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
}

cssInterop(PressableScaleImpl, { className: 'style' });

export const PressableScale = PressableScaleImpl;
