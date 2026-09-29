/**
 * Friendly empty state: big icon in a soft circle, title, message, optional action.
 *
 * @example
 * <EmptyState
 *   icon={Pill}
 *   title="No medicines yet"
 *   message="Add your first medicine and we'll remind you when it's time."
 *   action={{ label: 'Add your first medicine', icon: Plus, onPress: () => router.push('/medication/add') }}
 * />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { statusColors, useTheme, type StatusTone } from '@/lib/theme';
import { Text } from './Text';
import { Icon } from './Icon';
import { Button, type ButtonVariant } from './Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
  tone?: StatusTone;
  action?: { label: string; onPress: () => void; icon?: LucideIcon; variant?: ButtonVariant };
  /** Smaller, inline version (e.g. "Nothing scheduled"). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon,
  title,
  message,
  tone = 'accent',
  action,
  compact = false,
  style,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const sc = statusColors(colors, tone);
  const circle = compact ? 64 : 96;
  return (
    <View style={[{ alignItems: 'center', paddingVertical: compact ? 16 : 32, gap: 12 }, style]}>
      <View
        style={{
          width: circle,
          height: circle,
          borderRadius: circle / 2,
          backgroundColor: sc.bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}>
        <Icon as={icon} size={compact ? 28 : 42} color={sc.fg} />
      </View>
      <Text variant={compact ? 'headline' : 'title2'} align="center">
        {title}
      </Text>
      {message ? (
        <Text
          variant={compact ? 'subhead' : 'body'}
          tone="secondary"
          align="center"
          style={{ maxWidth: 340 }}>
          {message}
        </Text>
      ) : null}
      {action ? (
        <Button
          label={action.label}
          icon={action.icon}
          variant={action.variant ?? 'primary'}
          size="lg"
          onPress={action.onPress}
          style={{ marginTop: 8, alignSelf: 'center' }}
        />
      ) : null}
    </View>
  );
}
