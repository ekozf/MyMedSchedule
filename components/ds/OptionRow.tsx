/**
 * Radio option card (docs/DESIGN.md §4): full width, 76 min height, title 20/700, description 16
 * ink2, 30 px radio on the right. Selected = `bg` fill with 2 px accent border, radio filled.
 * Optional `badge` pill ("Recommended", "Current").
 *
 * @example
 * <OptionRow title="Every day" description="Same time or times each day" selected={t === 'daily'} onPress={() => setT('daily')} />
 * <OptionRow title="PIN code" description="4 to 6 digits only you know" badge="Recommended" … />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { radii, useTheme } from '@/lib/theme';
import { PressableScale } from './PressableScale';
import { StatusPill } from './StatusPill';
import { Text } from './Text';

export interface OptionRowProps {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  badge?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Radio({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        // Unselected: a heavier 2.5 px ring so the control reads as tappable.
        borderWidth: selected ? 2 : 2.5,
        borderColor: selected ? colors.accent : colors.line2,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {selected ? (
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent }} />
      ) : null}
    </View>
  );
}

export function OptionRow({
  title,
  description,
  selected,
  onPress,
  badge,
  disabled,
  accessibilityLabel,
  style,
}: OptionRowProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={
        accessibilityLabel ?? [title, description, badge].filter(Boolean).join(', ')
      }
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      style={[
        {
          minHeight: 76,
          borderRadius: radii.card,
          backgroundColor: selected ? colors.bg : colors.field,
          borderWidth: 2,
          borderColor: selected ? colors.accent : 'transparent',
          paddingHorizontal: 18,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Text variant="title3" style={{ fontSize: 20, lineHeight: 25, letterSpacing: 0 }}>
            {title}
          </Text>
          {badge ? <StatusPill label={badge} tone="done" /> : null}
        </View>
        {description ? (
          <Text variant="subhead" weight="400" tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      <Radio selected={selected} />
    </PressableScale>
  );
}
