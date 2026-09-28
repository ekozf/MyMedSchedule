/**
 * Pill button (docs/DESIGN.md §1: one filled primary action per surface).
 *
 * @example
 * <Button label="Take now" variant="success" size="lg" fullWidth icon={Check} onPress={take} />
 * <Button label="Skip" variant="secondaryDanger" onPress={skip} />
 * <Button label="Add a note" variant="plain" size="sm" onPress={…} />
 * <Button label="Save medicine" loading={saving} disabled={!valid} onPress={save} />
 */
import * as React from 'react';
import { ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import { useTheme, type Palette } from '@/lib/theme';
import { PressableScale, type PressableScaleProps } from './PressableScale';
import { Text } from './Text';
import { Icon } from './Icon';

export type ButtonVariant =
  | 'primary'
  | 'success'
  | 'danger'
  | 'secondary'
  | 'secondaryDanger'
  | 'plain';
export type ButtonSize = 'lg' | 'md' | 'sm';

export interface ButtonProps extends Omit<
  PressableScaleProps,
  'style' | 'children' | 'accessibilityLabel'
> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'leading' | 'trailing';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Defaults to `label`. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

const HEIGHT: Record<ButtonSize, number> = { lg: 56, md: 48, sm: 36 };
const PAD_X: Record<ButtonSize, number> = { lg: 24, md: 20, sm: 14 };
const ICON: Record<ButtonSize, number> = { lg: 22, md: 20, sm: 18 };

export function buttonColors(colors: Palette, variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return { bg: colors.accent, fg: colors.onAccent };
    case 'success':
      return { bg: colors.success, fg: colors.onAccent };
    case 'danger':
      return { bg: colors.danger, fg: colors.onAccent };
    case 'secondary':
      return { bg: colors.accentSoft, fg: colors.accent };
    case 'secondaryDanger':
      return { bg: colors.dangerSoft, fg: colors.danger };
    case 'plain':
      return { bg: 'transparent', fg: colors.accent };
  }
}

function ButtonImpl({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'leading',
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  style,
  onPress,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const { bg, fg } = buttonColors(colors, variant);
  const inactive = disabled || loading;
  const height = HEIGHT[size];

  const iconEl = icon ? <Icon as={icon} size={ICON[size]} color={fg} /> : null;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      // Keep a 48pt hit area for the small size.
      hitSlop={size === 'sm' ? 6 : undefined}
      style={[
        {
          minHeight: height,
          paddingHorizontal: variant === 'plain' && size !== 'lg' ? 8 : PAD_X[size],
          borderRadius: 999,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {iconPosition === 'leading' ? iconEl : null}
          <Text
            variant={size === 'sm' ? 'subhead' : 'headline'}
            weight="600"
            color={fg}
            numberOfLines={1}>
            {label}
          </Text>
          {iconPosition === 'trailing' ? iconEl : null}
        </>
      )}
    </PressableScale>
  );
}

cssInterop(ButtonImpl, { className: 'style' });

export const Button = ButtonImpl;
