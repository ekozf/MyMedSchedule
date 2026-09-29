/**
 * Typography primitive (docs/DESIGN.md §2.2). Colour comes from theme tokens via `tone`.
 *
 * @example
 * <Text variant="largeTitle">Today</Text>
 * <Text variant="subhead" tone="secondary" numberOfLines={1}>1 pill · with food</Text>
 * <Text variant="time">08:00</Text>
 * <Text variant="caption" tone="tertiary">Morning</Text>   // rendered uppercase
 */
import * as React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { toneColor, useTheme, type Tone } from '@/lib/theme';

export type TextVariant =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'time';

export type TextTone = Tone;

export const typography: Record<TextVariant, TextStyle> = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.2 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  time: { fontSize: 24, lineHeight: 28, fontWeight: '600', fontVariant: ['tabular-nums'] },
};

const HEADING_VARIANTS: TextVariant[] = ['largeTitle', 'title1', 'title2'];

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Overrides `tone` with an explicit colour (e.g. a medicine tint). */
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
  /** Force tabular numbers (always on for `time`). */
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
  return (
    <RNText
      accessibilityRole={
        accessibilityRole ?? (HEADING_VARIANTS.includes(variant) ? 'header' : undefined)
      }
      style={[
        typography[variant],
        { color: color ?? toneColor(colors, tone) },
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
      {...rest}
    />
  );
}
