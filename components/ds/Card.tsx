/**
 * Flat card: `field` fill on `bg`, radius 22, no border, no shadow (docs/DESIGN.md §3.4).
 * Pressable when `onPress` is set. `tone` switches to a semantic fill.
 *
 * @example
 * <Card>…</Card>
 * <Card tone="now">…</Card>
 * <Card onPress={open} accessibilityLabel="Metformin, 29 left">…</Card>
 * <Card selected>…</Card>     // 2 px accent border on bg (option cards)
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { cssInterop } from 'nativewind';
import { radii, useTheme, type Palette } from '@/lib/theme';
import { PressableScale, type PressableScaleProps } from './PressableScale';

export type CardTone =
  | 'default'
  | 'done'
  | 'now'
  | 'danger'
  | 'inverse'
  | 'bg';

export interface CardProps extends Omit<PressableScaleProps, 'style' | 'children'> {
  children?: React.ReactNode;
  /** Inner padding 16. Default true. */
  padded?: boolean;
  tone?: CardTone;
  /** 2 px accent border on `bg` fill. */
  selected?: boolean;
  /** When set, the card is pressable. */
  onPress?: PressableScaleProps['onPress'];
  radius?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function cardFill(colors: Palette, tone: CardTone): string {
  switch (tone) {
    case 'done':
      return colors.done;
    case 'now':
      return colors.now;
    case 'danger':
      return colors.dangerSoft;
    case 'inverse':
      return colors.inverse;
    case 'bg':
      return colors.bg;
    default:
      return colors.field;
  }
}

function CardImpl({
  children,
  padded = true,
  tone = 'default',
  selected = false,
  onPress,
  radius = radii.card,
  style,
  ...pressableProps
}: CardProps) {
  const { colors } = useTheme();
  const surfaceStyle: ViewStyle = {
    borderRadius: radius,
    backgroundColor: selected ? colors.bg : cardFill(colors, tone),
    borderWidth: 2,
    borderColor: selected ? colors.accent : 'transparent',
    padding: padded ? 16 : 0,
  };

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[surfaceStyle, style]} {...pressableProps}>
        {children}
      </PressableScale>
    );
  }
  return (
    <View
      style={[surfaceStyle, style]}
      accessible={pressableProps.accessible}
      accessibilityRole={pressableProps.accessibilityRole}
      accessibilityLabel={pressableProps.accessibilityLabel}
      accessibilityHint={pressableProps.accessibilityHint}
      accessibilityState={pressableProps.accessibilityState ?? undefined}
      testID={pressableProps.testID}>
      {children}
    </View>
  );
}

cssInterop(CardImpl, { className: 'style' });

export const Card = CardImpl;
