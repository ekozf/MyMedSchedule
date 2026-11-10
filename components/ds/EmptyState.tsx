/**
 * Empty state (docs/DESIGN.md §4): title 22/700, one sentence ink2, one primary button.
 * No illustration.
 *
 * @example
 * <EmptyState
 *   title="Nothing to take yet"
 *   message="Add your first medicine and we'll remind you when it's time."
 *   action={{ label: 'Add a medicine', onPress: () => router.push('/medication/add') }}
 * />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { Button, type ButtonVariant } from './Button';

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void; icon?: LucideIcon; variant?: ButtonVariant };
  /** Smaller top/bottom padding (inline use). */
  compact?: boolean;
  /** @deprecated remove after screen rewrite — no illustration (still passed by app/+not-found.tsx) */
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ title, message, action, compact = false, style }: EmptyStateProps) {
  return (
    <View style={[{ paddingVertical: compact ? 16 : 40, gap: 10 }, style]}>
      <Text variant="title3" align="center" accessibilityRole="header">
        {title}
      </Text>
      {message ? (
        <Text variant="body" tone="secondary" align="center" style={{ alignSelf: 'center', maxWidth: 360 }}>
          {message}
        </Text>
      ) : null}
      {action ? (
        <Button
          label={action.label}
          icon={action.icon}
          variant={action.variant ?? 'primary'}
          onPress={action.onPress}
          style={{ marginTop: 14 }}
        />
      ) : null}
    </View>
  );
}
