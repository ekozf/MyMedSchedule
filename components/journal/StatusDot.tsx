/**
 * The 22 px dot on the Journal rail, plus the matching status pill tone. The dot is decoration:
 * the row always says the status in words (the pill), so it is hidden from screen readers.
 *
 * taken   = `done` fill + `doneInk` ring
 * partial = `now` fill + `nowInk` ring
 * skipped = `field` fill + `line2` ring
 *
 * @example
 * <StatusDot action="taken" />
 * <StatusPill label={statusLabel(a)} tone={statusPillTone(a)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { useTheme, type PillTone } from '@/components/ds';
import type { IntakeAction } from '@/types';

export const DOT_SIZE = 22;

export function statusPillTone(action: IntakeAction): PillTone {
  if (action === 'taken') return 'done';
  if (action === 'partial') return 'now';
  return 'neutral';
}

export function StatusDot({ action, size = DOT_SIZE }: { action: IntakeAction; size?: number }) {
  const { colors } = useTheme();
  const [fill, ring] =
    action === 'taken'
      ? [colors.done, colors.doneInk]
      : action === 'partial'
        ? [colors.now, colors.nowInk]
        : [colors.field, colors.line2];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fill,
        borderWidth: 3,
        borderColor: ring,
      }}
    />
  );
}
