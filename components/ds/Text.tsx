/**
 * Typography primitive (docs/DESIGN.md §3.2) in Atkinson Hyperlegible Next. Picks the font family
 * from the weight (Android needs one family per weight). Colour comes from `tone` or `color`.
 *
 * @example
 * <Text variant="title1">Medicines</Text>
 * <Text variant="footnote" tone="secondary">1 pill · with food</Text>
 * <Text variant="display" tabular>2</Text>
 * <Text variant="body" weight="700">Monday</Text>
 */
import * as React from 'react';
import {
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { fontForWeight, toneColor, type, useTheme, type Tone, type TypeRole } from '@/lib/theme';

export type TextVariant = TypeRole;

export type TextTone = Tone;

/** Style objects per variant (size, line height, weight, letter spacing). */
export const typography: Record<TextVariant, TextStyle> = {
  ...type,
};

const HEADING_VARIANTS: TextVariant[] = ['display', 'title1', 'title2'];

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Overrides `tone` with an explicit colour token. */
  color?: string;
  align?: TextStyle['textAlign'];
  /** Overrides the variant's weight (400/500/600/700/800). */
  weight?: TextStyle['fontWeight'];
  /** Tabular figures, for numbers and times that line up. */
  tabular?: boolean;
  className?: string;
  ref?: React.Ref<RNText>;
}

export function Text({
  variant = 'body',
  tone = 'primary',
  color,
  align,
  weight,
  tabular,
  style,
  accessibilityRole,
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const base = typography[variant];
  // A weight in `style` (legacy call sites) still maps to the right family.
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const resolvedWeight = weight ?? flat?.fontWeight ?? base.fontWeight;
  return (
    <RNText
      accessibilityRole={
        accessibilityRole ?? (HEADING_VARIANTS.includes(variant) ? 'header' : undefined)
      }
      style={[
        base,
        { color: color ?? toneColor(colors, tone) },
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
        fontForWeight(resolvedWeight),
      ]}
      {...rest}
    />
  );
}
