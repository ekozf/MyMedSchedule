/**
 * Round icon-only button: 48 on `field` by default (header back/close, calendar). Always ≥ 48
 * touch target. `accessibilityLabel` is required.
 *
 * @example
 * <IconButton icon={ChevronLeft} accessibilityLabel="Go back" onPress={router.back} />
 * <IconButton icon={X} size="sm" accessibilityLabel="Close" onPress={close} />  // 44 sheet close
 * <IconButton icon={Plus} variant="bg" size="lg" tone="accent" … />            // 64 stepper key
 */
import * as React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/lib/theme';
import { PressableScale, type PressableScaleProps } from './PressableScale';
import { Icon } from './Icon';

export type IconButtonVariant =
  /** `field` fill (default). */
  | 'field'
  /** `bg` fill (on a `field` card). */
  | 'bg'
  /** Accent fill. */
  | 'accent'
  /** No fill. */
  | 'plain';

/** sm 44 · md 48 · lg 64. */
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<PressableScaleProps, 'style' | 'children'> {
  icon: LucideIcon;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Glyph colour (ignored for `accent`). Default 'default' (ink). */
  tone?: 'default' | 'accent' | 'danger' | 'secondary' | 'success' | 'warning';
  /**
   * How a disabled button looks. `fade` (default): 45% opacity. `solid`: `line2` fill with an
   * `ink` glyph at 60%, at least 3:1 in both themes (Stepper − / + at their limits).
   */
  disabledLook?: 'fade' | 'solid';
  style?: StyleProp<ViewStyle>;
}

const DIAMETER: Record<IconButtonSize, number> = { sm: 44, md: 48, lg: 64 };
const ICON_SIZE: Record<IconButtonSize, number> = { sm: 22, md: 24, lg: 28 };

export function IconButton({
  icon,
  variant = 'field',
  size = 'md',
  tone = 'default',
  style,
  disabled,
  disabledLook = 'fade',
  ...rest
}: IconButtonProps) {
  const { colors } = useTheme();
  const d = DIAMETER[size];
  const v = variant;

  const bg =
    v === 'field'
      ? colors.field
      : v === 'bg'
        ? colors.bg
        : v === 'accent'
          ? colors.accent
          : 'transparent';
  const fg =
    v === 'accent'
      ? colors.onAccent
      : tone === 'accent'
        ? colors.accent
        : tone === 'danger'
          ? colors.danger
          : tone === 'secondary'
            ? colors.ink2
            : colors.ink;

  const solidOff = !!disabled && disabledLook === 'solid';

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
          backgroundColor: solidOff ? colors.line2 : bg,
          opacity: disabled && !solidOff ? 0.45 : 1,
        },
        style,
      ]}
      {...rest}>
      <Icon
        as={icon}
        size={ICON_SIZE[size]}
        color={solidOff ? withAlpha(colors.ink, 0.6) : fg}
        strokeWidth={size === 'lg' ? 2.5 : 2}
      />
    </PressableScale>
  );
}
