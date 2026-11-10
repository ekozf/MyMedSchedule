/**
 * Small building blocks for the medicine screens and sheets.
 *
 * @example
 * <Notice tone="warning" icon={TriangleAlert} text="Only 3 doses left." />
 * <ValueRow label="Pack size" value="60 pills" />
 * <LinkRow label="Remind me when running low" onPress={openRefill} />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Icon, PressableScale, Text, radii, useTheme } from '@/components/ds';

/** Message box in words (icon + sentence). warning = `now` fill, danger = `dangerSoft`, else `field`. */
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
  const { bg, fg } =
    tone === 'warning'
      ? { bg: colors.now, fg: colors.nowInk }
      : tone === 'danger'
        ? { bg: colors.dangerSoft, fg: colors.danger }
        : tone === 'success'
          ? { bg: colors.done, fg: colors.doneInk }
          : { bg: colors.field, fg: colors.ink };
  return (
    <View
      accessible
      accessibilityLabel={text}
      style={[
        {
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-start',
          padding: 14,
          borderRadius: radii.tile,
          backgroundColor: bg,
        },
        style,
      ]}>
      <Icon as={icon} size={20} color={fg} style={{ marginTop: 2 }} />
      <Text variant="callout" color={fg} style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

/** Label / value row inside a card (wraps under large text). */
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
        minHeight: 48,
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

/** Tappable row inside a card: label and a chevron (opens an editor). */
export function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        minHeight: 48,
      }}>
      <Text variant="body" weight="600" style={{ flex: 1 }}>
        {label}
      </Text>
      <Icon as={ChevronRight} size={22} tone="secondary" />
    </PressableScale>
  );
}
