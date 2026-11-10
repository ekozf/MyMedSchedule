/**
 * Grouped list (docs/DESIGN.md §4): `field` group radius 20, rows 64 min height separated by
 * `line2` hairlines. Row: title 19/600, optional description 15 ink2, value 17/500 ink2 with
 * chevron, a check, or a `Switch`.
 *
 * @example
 * <ListGroup header="Preferences">
 *   <ListRow title="Language" value="English" onPress={…} />
 *   <ListRow title="24-hour time" subtitle="Times look like 20:00" switchValue={is24h} onSwitchChange={set24h} />
 *   <ListRow title="Nederlands" accessory="check" onPress={…} />
 *   <ListRow title="Delete medicine" destructive accessory="none" onPress={…} />
 * </ListGroup>
 */
import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { radii, useTheme } from '@/lib/theme';
import { PressableScale } from './PressableScale';
import { Switch } from './Switch';
import { Text } from './Text';
import { Icon } from './Icon';

const RowIndexContext = React.createContext<number>(0);

export interface ListGroupProps {
  children: React.ReactNode;
  /** Label above the group (16/700 ink2). */
  header?: string;
  /** Footnote below the group. */
  footer?: string;
  style?: StyleProp<ViewStyle>;
}

export function ListGroup({ children, header, footer, style }: ListGroupProps) {
  const { colors } = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ gap: 8 }, style]}>
      {header ? (
        <Text
          variant="subhead"
          weight="700"
          tone="secondary"
          style={{ paddingHorizontal: 4 }}
          accessibilityRole="header">
          {header}
        </Text>
      ) : null}
      <View style={{ borderRadius: radii.group, backgroundColor: colors.field, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <RowIndexContext.Provider key={(row as React.ReactElement).key ?? i} value={i}>
            {row}
          </RowIndexContext.Provider>
        ))}
      </View>
      {footer ? (
        <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 4 }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export type ListRowAccessory = 'chevron' | 'check' | 'none' | React.ReactNode;

export interface ListRowProps {
  title: string;
  /** Description under the title (15, ink2). */
  subtitle?: string;
  /** Monochrome 24 icon before the title (no tinted tile). */
  icon?: LucideIcon;
  /** Custom leading node instead of `icon` (e.g. an Avatar or MedIcon). */
  leading?: React.ReactNode;
  /** Right-aligned value text (17/500 ink2). */
  value?: string;
  /** Default: 'chevron' when pressable, else 'none'. */
  accessory?: ListRowAccessory;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  destructive?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function ListRow({
  title,
  subtitle,
  icon,
  leading,
  value,
  accessory,
  switchValue,
  onSwitchChange,
  destructive = false,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: ListRowProps) {
  const { colors } = useTheme();
  const index = React.useContext(RowIndexContext);
  const hasSwitch = switchValue !== undefined;
  const resolvedAccessory: ListRowAccessory =
    accessory ?? (onPress && !hasSwitch ? 'chevron' : 'none');

  const toggle = () => {
    if (!onSwitchChange || disabled) return;
    onSwitchChange(!switchValue);
  };
  const handlePress = hasSwitch ? toggle : onPress;

  let right: React.ReactNode = null;
  if (hasSwitch) {
    right = (
      <Switch
        value={!!switchValue}
        onValueChange={() => toggle()}
        disabled={disabled}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    );
  } else if (resolvedAccessory === 'chevron') {
    right = <Icon as={ChevronRight} size={22} tone="secondary" />;
  } else if (resolvedAccessory === 'check') {
    right = <Icon as={Check} size={24} tone="accent" strokeWidth={2.5} />;
  } else if (resolvedAccessory !== 'none') {
    right = resolvedAccessory;
  }

  const content = (
    <>
      {index > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 16,
            right: 16,
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.line2,
          }}
        />
      ) : null}
      {leading ?? (icon ? <Icon as={icon} size={24} tone={destructive ? 'danger' : 'primary'} /> : null)}
      <View style={{ flex: 1, paddingVertical: 12 }}>
        <Text variant="headline" weight="600" tone={destructive ? 'danger' : 'primary'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" weight="400" tone="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="callout" tone="secondary" style={{ maxWidth: '50%' }} align="right">
          {value}
        </Text>
      ) : null}
      {right}
    </>
  );

  const rowStyle: ViewStyle = {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    opacity: disabled ? 0.45 : 1,
  };

  const label = accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ');

  if (handlePress) {
    return (
      <PressableScale
        activeScale={0.99}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole={hasSwitch ? 'switch' : 'button'}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{
          disabled,
          checked: hasSwitch ? !!switchValue : undefined,
          selected: resolvedAccessory === 'check' ? true : undefined,
        }}
        style={rowStyle}>
        {content}
      </PressableScale>
    );
  }
  return (
    <View style={rowStyle} accessible accessibilityLabel={label}>
      {content}
    </View>
  );
}
