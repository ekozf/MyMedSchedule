/**
 * On/off switch (docs/DESIGN.md §4): 56×34 track, `line2` with a 1 px `ink2` 30% border when off
 * (so it reads as a control on `field` and `bg`), `accent` when on, white knob. Drawn in JS
 * instead of the RN `Switch` because the native track can't take a border and its size differs
 * per platform. Wrap it in a row that carries the label (`ListRow` does), or pass
 * `accessibilityLabel`.
 *
 * @example
 * <Switch value={is24h} onValueChange={set24h} accessibilityLabel="24-hour time" />
 */
import * as React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/lib/theme';

export interface SwitchProps extends Omit<PressableProps, 'onPress' | 'style' | 'children'> {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const W = 56;
const H = 34;
const KNOB = 28;
const INSET = (H - KNOB) / 2;

/** "#RRGGBB" + alpha 0..1 → "#RRGGBBAA". */
function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export function Switch({ value, onValueChange, disabled, style, ...rest }: SwitchProps) {
  const { colors, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  // Knob: white in light mode; in dark mode the near-white `inverse` token plays white.
  const knob = isDark ? colors.inverse : colors.onAccent;
  const travel = W - KNOB - INSET * 2 - 2; // minus the 1 px border on both sides

  const knobStyle = useAnimatedStyle(
    () => ({
      transform: [
        { translateX: withTiming(value ? travel : 0, { duration: reduceMotion ? 1 : 180 }) },
      ],
    }),
    [value, travel, reduceMotion]
  );

  return (
    <Pressable
      onPress={() => onValueChange?.(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      hitSlop={8}
      style={[
        {
          width: W,
          height: H,
          borderRadius: H / 2,
          padding: INSET,
          borderWidth: 1,
          borderColor: value ? colors.accent : withAlpha(colors.ink2, 0.3),
          backgroundColor: value ? colors.accent : colors.line2,
          justifyContent: 'center',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
      {...rest}>
      <Animated.View
        style={[
          {
            width: KNOB,
            height: KNOB,
            borderRadius: KNOB / 2,
            backgroundColor: knob,
          },
          knobStyle,
        ]}
      />
    </Pressable>
  );
}
