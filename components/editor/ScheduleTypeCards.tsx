/**
 * Large plain-language choice cards for the 9 schedule types (icon + title + one-line example).
 *
 * @example
 * <ScheduleTypeCards value={form.scheduleType} onSelect={(type) => update.setScheduleType(type)} />
 */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import {
  CalendarClock,
  CalendarDays,
  Check,
  HandHelping,
  RefreshCw,
  Repeat,
  Sun,
  SunMoon,
  Timer,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import type { ScheduleType } from '@/types';
import { Icon, PressableScale, Text, radii, useTheme, withAlpha } from '@/components/ds';
import { SCHEDULE_TYPES } from './form-model';

export const SCHEDULE_TYPE_ICONS: Record<ScheduleType, LucideIcon> = {
  once_daily: Sun,
  multiple_daily: SunMoon,
  every_x_days: Repeat,
  specific_weekdays: CalendarDays,
  xth_weekday: CalendarClock,
  cycle: RefreshCw,
  every_x_hours: Timer,
  tapering: TrendingDown,
  prn: HandHelping,
};

export interface ScheduleTypeCardsProps {
  value: ScheduleType | null;
  onSelect: (type: ScheduleType) => void;
}

export function ScheduleTypeCards({ value, onSelect }: ScheduleTypeCardsProps) {
  const reduceMotion = useReducedMotion();
  return (
    <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
      {SCHEDULE_TYPES.map((type, i) => (
        <Animated.View
          key={type}
          entering={reduceMotion ? undefined : FadeInDown.delay(Math.min(i, 8) * 20).duration(260)}>
          <ScheduleTypeCard type={type} selected={value === type} onPress={() => onSelect(type)} />
        </Animated.View>
      ))}
    </View>
  );
}

export function ScheduleTypeCard({
  type,
  selected,
  onPress,
}: {
  type: ScheduleType;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const title = i18n.t(`ui.editor.type.${type}.title`);
  const example = i18n.t(`ui.editor.type.${type}.example`);
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${example}`}
      accessibilityState={{ selected, checked: selected }}
      style={{
        minHeight: 76,
        borderRadius: radii.row,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: selected ? colors.accentSoft : colors.surface,
        borderWidth: selected ? 2 : StyleSheet.hairlineWidth * 2,
        borderColor: selected ? colors.accent : colors.stroke,
      }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: selected ? colors.accent : withAlpha(colors.accent, 0.12),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon
          as={SCHEDULE_TYPE_ICONS[type]}
          size={22}
          color={selected ? colors.onAccent : colors.accent}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline">{title}</Text>
        <Text variant="subhead" tone="secondary">
          {example}
        </Text>
      </View>
      {selected ? <Icon as={Check} size={22} tone="accent" /> : null}
    </PressableScale>
  );
}
