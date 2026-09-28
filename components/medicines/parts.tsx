/**
 * Small building blocks shared by the medicine detail cards.
 *
 * @example
 * <CardTitle icon={Package} title="Supply" />
 * <InfoLine icon={Hourglass} text="At least 6 hours between doses" />
 * <Notice tone="warning" icon={TriangleAlert} text="Only 3 doses left." />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Icon, Text, statusColors, useTheme, withAlpha } from '@/components/ds';

export function CardTitle({
  icon,
  title,
  tint,
  right,
}: {
  icon: LucideIcon;
  title: string;
  tint?: string;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const c = tint ?? colors.accent;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: withAlpha(c, 0.14),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon as={icon} size={18} color={c} />
      </View>
      <Text variant="title3" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </Text>
      {right}
    </View>
  );
}

/** Icon + text row (+ optional secondary line). Status is conveyed by icon and words. */
export function InfoLine({
  icon,
  text,
  detail,
  tone = 'secondary',
}: {
  icon: LucideIcon;
  text: string;
  detail?: string;
  tone?: 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
}) {
  return (
    <View
      accessible
      accessibilityLabel={[text, detail].filter(Boolean).join(', ')}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 32 }}>
      <Icon as={icon} size={20} tone={tone} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="body">{text}</Text>
        {detail ? (
          <Text variant="subhead" tone="secondary">
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Soft tinted message box. */
export function Notice({
  icon,
  text,
  tone = 'warning',
  style,
}: {
  icon: LucideIcon;
  text: string;
  tone?: 'accent' | 'warning' | 'danger' | 'success';
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const sc = statusColors(colors, tone);
  return (
    <View
      accessible
      accessibilityLabel={text}
      style={[
        {
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-start',
          padding: 12,
          borderRadius: 16,
          backgroundColor: sc.bg,
        },
        style,
      ]}>
      <Icon as={icon} size={18} color={sc.fg} style={{ marginTop: 1 }} />
      <Text variant="subhead" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

/** Label/value row used inside cards (wraps under large text). */
export function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${value}`}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        columnGap: 12,
        rowGap: 2,
        minHeight: 32,
      }}>
      <Text variant="body" tone="secondary">
        {label}
      </Text>
      <Text variant="body" weight="600">
        {value}
      </Text>
    </View>
  );
}
