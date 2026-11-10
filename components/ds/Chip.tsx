/**
 * Chips (docs/DESIGN.md §4): 50 tall, radius 999, `field`; selected = accent fill + onAccent text.
 * `ChipRow` lays chips out (wrapping by default, or one scrolling line). `ChipGroup` is the
 * controlled single- or multi-select version.
 *
 * @example
 * <ChipRow>
 *   <Chip label="All" selected={f === 'all'} onPress={() => setF('all')} />
 *   <Chip label="Taken" selected={f === 'taken'} onPress={() => setF('taken')} />
 * </ChipRow>
 *
 * <ChipGroup options={units} value={unit} onChange={setUnit} />                       // single
 * <ChipGroup multiple options={days} value={selectedDays} onChange={setSelectedDays} />  // multi
 */
import * as React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, type LucideIcon } from 'lucide-react-native';
import { radii, useTheme } from '@/lib/theme';
import { GUTTER } from '@/lib/ui/layout';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { Icon } from './Icon';

export interface ChipProps {
  label: string;
  /** Small text after the label ("08:00 · taken"): footnote size, `ink2` (onAccent when selected). */
  detail?: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  /** Show a check mark when selected (multi-select). */
  check?: boolean;
  /** `sm` = 48 tall (dense rows). Default 50. */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  accessibilityLabel?: string;
  /** 'radio' for single select, 'checkbox' for multi select. Default 'button'. */
  accessibilityRole?: 'button' | 'radio' | 'checkbox';
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  detail,
  selected = false,
  onPress,
  icon,
  check = false,
  size = 'md',
  disabled,
  accessibilityLabel,
  accessibilityRole = 'button',
  style,
}: ChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.onAccent : colors.ink;
  const height = size === 'sm' ? 48 : 50;
  const leading = selected && check ? Check : icon;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? accessibilityRole : 'text'}
      accessibilityLabel={accessibilityLabel ?? (detail ? `${label}, ${detail}` : label)}
      accessibilityState={
        accessibilityRole === 'button'
          ? { selected, disabled: !!disabled }
          : { checked: selected, disabled: !!disabled }
      }
      style={[
        {
          minHeight: height,
          minWidth: 48,
          paddingHorizontal: 20,
          borderRadius: radii.pill,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: selected ? colors.accent : colors.field,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      {leading ? <Icon as={leading} size={20} color={fg} /> : null}
      <Text variant="callout" weight="600" color={fg} tabular>
        {label}
        {detail ? (
          <Text variant="footnote" weight="500" color={selected ? colors.onAccent : colors.ink2}>
            {` · ${detail}`}
          </Text>
        ) : null}
      </Text>
    </PressableScale>
  );
}

export interface ChipRowProps {
  children: React.ReactNode;
  /** One horizontally scrolling line instead of wrapping. Default false. */
  scroll?: boolean;
  /** Scrolling only: extend to the screen edges (negates the 20pt side padding). Default true. */
  bleed?: boolean;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export function ChipRow({ children, scroll = false, bleed = true, gap = 8, style }: ChipRowProps) {
  if (!scroll) {
    return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap }, style]}>{children}</View>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={[bleed ? { marginHorizontal: -GUTTER } : null, { flexGrow: 0 }, style]}
      contentContainerStyle={{
        paddingHorizontal: bleed ? GUTTER : 0,
        gap,
        alignItems: 'center',
      }}>
      {children}
    </ScrollView>
  );
}

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  /** Small text after the label (see `Chip.detail`). */
  detail?: string;
  accessibilityLabel?: string;
}

type ChipGroupProps<T extends string | number> = {
  options: ChipOption<T>[];
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
} & (
  | { multiple?: false; value: T | null; onChange: (value: T) => void }
  | { multiple: true; value: T[]; onChange: (value: T[]) => void }
);

/** Controlled chip set. Single select (radio) by default; `multiple` toggles values (checkbox). */
export function ChipGroup<T extends string | number>(props: ChipGroupProps<T>) {
  const { options, scroll, style } = props;
  return (
    <ChipRow scroll={scroll} style={style}>
      {options.map((o) => {
        const selected = props.multiple ? props.value.includes(o.value) : props.value === o.value;
        const onPress = () => {
          if (props.multiple) {
            props.onChange(
              selected ? props.value.filter((v) => v !== o.value) : [...props.value, o.value]
            );
          } else if (!selected) {
            props.onChange(o.value);
          }
        };
        return (
          <Chip
            key={String(o.value)}
            label={o.label}
            detail={o.detail}
            accessibilityLabel={o.accessibilityLabel}
            selected={selected}
            check={props.multiple}
            accessibilityRole={props.multiple ? 'checkbox' : 'radio'}
            onPress={onPress}
          />
        );
      })}
    </ChipRow>
  );
}
