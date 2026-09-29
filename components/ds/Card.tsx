/**
 * Glass surface (docs/DESIGN.md §2.3): translucent fill + hairline stroke + soft shadow (light
 * only). iOS adds a BlurView; Android uses the translucent fill only.
 *
 * @example
 * <Card>…</Card>
 * <Card tone="warning" onPress={openSupply} accessibilityLabel="Supply">…</Card>
 * <Card padded={false} style={{ overflow: 'hidden' }}>{list}</Card>
 */
import * as React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { cssInterop } from 'nativewind';
import { radii, statusColors, useTheme, type StatusTone } from '@/lib/theme';
import { PressableScale, type PressableScaleProps } from './PressableScale';

export type CardTone = StatusTone;

export interface CardProps extends Omit<PressableScaleProps, 'style' | 'children'> {
  children?: React.ReactNode;
  /** Inner padding 16. Default true. */
  padded?: boolean;
  /** Soft tinted background instead of glass. */
  tone?: CardTone;
  /** When set, the card is pressable (spring scale + haptic). */
  onPress?: PressableScaleProps['onPress'];
  /** iOS only: blur behind the glass. Default true. Turn off in long lists for perf. */
  blur?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

function CardImpl({
  children,
  padded = true,
  tone = 'default',
  onPress,
  blur = true,
  radius = radii.card,
  style,
  ...pressableProps
}: CardProps) {
  const { colors, isDark } = useTheme();
  const tinted = tone !== 'default';
  const fill = tinted ? statusColors(colors, tone).bg : colors.surface;
  const useBlur = Platform.OS === 'ios' && blur && !tinted;

  const surfaceStyle: ViewStyle = {
    borderRadius: radius,
    borderWidth: tinted ? 0 : StyleSheet.hairlineWidth * 2,
    borderColor: colors.stroke,
    backgroundColor: useBlur ? 'transparent' : fill,
    ...(isDark
      ? null
      : {
          shadowColor: colors.shadow,
          shadowOpacity: 0.08,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
        }),
  };

  const content = (
    <>
      {useBlur ? (
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
          <BlurView
            intensity={30}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
        </View>
      ) : null}
      <View style={padded ? { padding: 16 } : null}>{children}</View>
    </>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[surfaceStyle, style]} {...pressableProps}>
        {content}
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
      {content}
    </View>
  );
}

cssInterop(CardImpl, { className: 'style' });

export const Card = CardImpl;
