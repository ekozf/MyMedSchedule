/**
 * Button (docs/DESIGN.md §4). One `primary` per screen; `secondary` grey; `quiet` transparent;
 * `danger` red text on a soft red fill; `link` accent text (inline text actions).
 * Height 60 (52 quiet, 48 for `size="sm"`), radius 16, full width by default.
 *
 * @example
 * <Button label="I took it" onPress={take} />
 * <Button label="A different time" variant="secondary" onPress={…} />
 * <Button label="Cancel" variant="quiet" onPress={close} />
 * <Button label="Delete medicine" variant="danger" onPress={…} />
 * <Button label="Part of it" variant="link" size="sm" onPress={…} />
 * <Button label="Log a dose" variant="secondary" size="sm" onPress={…} />  // compact, auto width
 */
import * as React from 'react';
import { ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import { radii, useTheme, type Palette } from '@/lib/theme';
import { PressableScale, type PressableScaleProps } from './PressableScale';
import { Text } from './Text';
import { Icon } from './Icon';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'quiet'
  | 'danger'
  /** Red text without a fill, for a lesser destructive action ("Remove this entry"). */
  | 'dangerQuiet'
  | 'link';

/** `sm` = compact 48 tall, auto width. `md`/`lg` = the standard 60. */
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
  /** Default true, except for `size="sm"` and `link`. */
  fullWidth?: boolean;
  /** Defaults to `label`. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}


export function buttonColors(colors: Palette, variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return { bg: colors.accent, fg: colors.onAccent };
    case 'secondary':
      return { bg: colors.field, fg: colors.ink };
    case 'quiet':
      return { bg: 'transparent', fg: colors.ink2 };
    case 'danger':
      return { bg: colors.dangerSoft, fg: colors.danger };
    case 'dangerQuiet':
      return { bg: 'transparent', fg: colors.danger };
    case 'link':
      return { bg: 'transparent', fg: colors.accent };
  }
}

function ButtonImpl({
  label,
  variant = 'primary',
  size = 'lg',
  icon,
  iconPosition = 'leading',
  loading = false,
  disabled = false,
  fullWidth,
  accessibilityLabel,
  style,
  onPress,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const v = variant;
  const { bg, fg } = buttonColors(colors, v);
  const inactive = disabled || loading;
  const compact = size === 'sm';
  const height = compact ? 48 : v === 'quiet' || v === 'dangerQuiet' || v === 'link' ? 52 : 60;
  const stretch = fullWidth ?? (!compact && v !== 'link');

  const iconEl = icon ? <Icon as={icon} size={compact ? 20 : 22} color={fg} /> : null;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      activeScale={0.98}
      style={[
        {
          minHeight: height,
          minWidth: 48,
          paddingHorizontal: v === 'link' ? 4 : compact ? 18 : 24,
          paddingVertical: 8,
          borderRadius: compact ? radii.pill : radii.button,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          alignSelf: stretch ? 'stretch' : 'flex-start',
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
            variant={compact ? 'callout' : 'headline'}
            weight="700"
            color={fg}
            align="center"
            style={v === 'link' ? { textDecorationLine: 'underline' } : null}>
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
