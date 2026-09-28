/**
 * Selectable pill + horizontal chip row.
 *
 * @example
 * <ChipRow>
 *   <Chip label="All" selected={f === 'all'} onPress={() => setF('all')} />
 *   <Chip label="Taken" icon={Check} selected={f === 'taken'} onPress={() => setF('taken')} />
 * </ChipRow>
 * <Chip label="Add a full pack (30)" icon={Plus} onPress={addPack} />
 * <Chip label="Metformin" tone="success" selected check onPress={…} />
 */
import * as React from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Check, type LucideIcon } from 'lucide-react-native';
import { statusColors, useTheme } from '@/lib/theme';
import { GUTTER } from '@/lib/ui/layout';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { Icon } from './Icon';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  /** Show a check mark when selected. */
  check?: boolean;
  /** Selected colour family. Default 'accent'. */
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  size?: 'md' | 'lg';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  check = false,
  tone = 'accent',
  size = 'md',
  disabled,
  accessibilityLabel,
  style,
}: ChipProps) {
  const { colors } = useTheme();
  const sc = statusColors(colors, tone);
  const fg = selected ? sc.fg : colors.ink;
  const height = size === 'lg' ? 48 : 40;
  const showCheck = selected && check;
  const leading = showCheck ? Check : icon;

  return (
    <PressableScale
      haptic="tap"
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled: !!disabled }}
      hitSlop={size === 'md' ? 4 : undefined}
      style={[
        {
          minHeight: height,
          paddingHorizontal: size === 'lg' ? 18 : 14,
          borderRadius: height / 2,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: selected ? sc.bg : colors.surface,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: selected ? 'transparent' : colors.stroke,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      {leading ? (
        <Icon
          as={leading}
          size={size === 'lg' ? 20 : 18}
          color={selected ? sc.fg : colors.inkSecondary}
        />
      ) : null}
      <Text
        variant={size === 'lg' ? 'callout' : 'subhead'}
        weight="600"
        color={fg}
        numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

export interface ChipRowProps {
  children: React.ReactNode;
  /** Extend to the screen edges (negates the 20pt gutter) and pad content by it. Default true. */
  bleed?: boolean;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export function ChipRow({ children, bleed = true, gap = 8, style }: ChipRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={[bleed ? { marginHorizontal: -GUTTER } : null, { flexGrow: 0 }, style]}
      contentContainerStyle={{
        paddingHorizontal: bleed ? GUTTER : 0,
        paddingVertical: 4,
        gap,
        alignItems: 'center',
      }}>
      {children}
    </ScrollView>
  );
}
