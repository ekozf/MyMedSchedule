/**
 * Status marker for a journal entry: taken (teal check), skipped (x), partial (half circle).
 * Always paired with the status word elsewhere in the row — never colour alone.
 *
 * @example
 * <StatusDot action="taken" />
 * const { label, tone, icon } = statusMeta('partial');
 */
import * as React from 'react';
import { View } from 'react-native';
import { Check, Contrast, X, type LucideIcon } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Icon, statusColors, useTheme } from '@/components/ds';
import type { IntakeAction } from '@/types';

export type StatusToneName = 'success' | 'danger' | 'warning';

const META: Record<IntakeAction, { icon: LucideIcon; tone: StatusToneName }> = {
  taken: { icon: Check, tone: 'success' },
  skipped: { icon: X, tone: 'danger' },
  partial: { icon: Contrast, tone: 'warning' },
};

export function statusMeta(action: IntakeAction): {
  icon: LucideIcon;
  tone: StatusToneName;
  label: string;
} {
  const m = META[action] ?? META.taken;
  return { ...m, label: i18n.t(`ui.journal.actions.${action}`) };
}

export function StatusDot({ action, size = 24 }: { action: IntakeAction; size?: number }) {
  const { colors } = useTheme();
  const { icon, tone } = statusMeta(action);
  const sc = statusColors(colors, tone);
  const filled = action === 'taken';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: filled ? sc.fg : sc.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon
        as={icon}
        size={Math.round(size * 0.58)}
        color={filled ? colors.onAccent : sc.fg}
        strokeWidth={action === 'partial' ? 2.25 : 3}
      />
    </View>
  );
}
