/**
 * One-line status message under a form or PIN pad ("That's not it. Try again."). The words carry
 * the meaning; colour only supports it. Announced politely to screen readers. With `reserve` it
 * keeps its height when empty so the layout doesn't jump.
 *
 * @example
 * <StatusLine text={message} reserve />
 * <StatusLine text="Times must go in order" tone="danger" />
 */
import * as React from 'react';
import { View } from 'react-native';
import { Text, type TextTone } from '@/components/ds';

export interface StatusLineProps {
  text?: string | null;
  /** Default 'danger'. */
  tone?: TextTone;
  reserve?: boolean;
  align?: 'center' | 'left';
  /** A mistake the person must act on: 17/600 and announced right away (assertive). */
  strong?: boolean;
}

export function StatusLine({
  text,
  tone = 'danger',
  reserve = false,
  align = 'center',
  strong = false,
}: StatusLineProps) {
  if (!text) return reserve ? <View style={{ minHeight: 22 }} /> : null;
  return (
    <View
      accessibilityLiveRegion={strong ? 'assertive' : 'polite'}
      accessibilityRole="alert"
      style={{ minHeight: 22, paddingHorizontal: align === 'center' ? 8 : 0 }}>
      <Text
        variant={strong ? 'callout' : 'footnote'}
        weight={strong ? '600' : undefined}
        tone={tone}
        align={align}>
        {text}
      </Text>
    </View>
  );
}
