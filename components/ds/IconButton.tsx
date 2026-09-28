/**
 * Circular icon-only button. `accessibilityLabel` is required.
 *
 * @example
 * <IconButton icon={ChevronLeft} accessibilityLabel="Go back" onPress={router.back} />
 * <IconButton icon={Plus} variant="filled" size="lg" accessibilityLabel="Add" onPress={add} />
 * <IconButton icon={CalendarDays} variant="tinted" tone="accent" … />
 */
import * as React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { statusColors, useTheme } from '@/lib/theme';
import { PressableScale, type PressableScaleProps } from './PressableScale';
import { Icon } from './Icon';

export type IconButtonVariant = 'glass' | 'tinted' | 'filled' | 'plain';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<PressableScaleProps, 'style' | 'children'> {
  icon: LucideIcon;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Colour family for tinted/filled/plain. Default 'accent'. */
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'default';
  style?: StyleProp<ViewStyle>;
}

const DIAMETER: Record<IconButtonSize, number> = { sm: 36, md: 44, lg: 56 };
const ICON_SIZE: Record<IconButtonSize, number> = { sm: 18, md: 22, lg: 26 };

export function IconButton({
  icon,
  variant = 'glass',
  size = 'md',
  tone = 'accent',
  style,
  disabled,
  ...rest
}: IconButtonProps) {
  const { colors, isDark } = useTheme();
  const d = DIAMETER[size];
  const sc =
    tone === 'default' ? { fg: colors.ink, bg: colors.surfaceSunken } : statusColors(colors, tone);

  let bg = 'transparent';
  let fg = variant === 'glass' ? colors.ink : sc.fg;
  if (variant === 'tinted') bg = sc.bg;
  if (variant === 'filled') {
    bg = tone === 'default' ? colors.ink : sc.fg;
    fg = tone === 'default' ? colors.surfaceSolid : colors.onAccent;
  }
  if (variant === 'glass') bg = colors.surface;

  const hitSlop = Math.max(0, Math.ceil((48 - d) / 2));

  return (
    <PressableScale
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={hitSlop || undefined}
      style={[
        {
          width: d,
          height: d,
          borderRadius: d / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'glass' && Platform.OS === 'ios' ? 'transparent' : bg,
          borderWidth: variant === 'glass' ? StyleSheet.hairlineWidth * 2 : 0,
          borderColor: colors.stroke,
          opacity: disabled ? 0.45 : 1,
          overflow: 'hidden',
        },
        style,
      ]}
      {...rest}>
      {variant === 'glass' && Platform.OS === 'ios' ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BlurView
            intensity={30}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />
        </View>
      ) : null}
      <Icon as={icon} size={ICON_SIZE[size]} color={fg} />
    </PressableScale>
  );
}
