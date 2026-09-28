/**
 * Inset grouped list (glass) + rows.
 *
 * @example
 * <ListGroup header="Preferences" footer="Used for all times in the app.">
 *   <ListRow icon={Languages} iconTint={colors.accent} title="Language" value="English" onPress={…} />
 *   <ListRow icon={Clock} title="24-hour time" switchValue={is24h} onSwitchChange={set24h} />
 *   <ListRow title="Nederlands" accessory="check" onPress={…} />
 *   <ListRow icon={Trash2} title="Delete medicine" destructive accessory="none" onPress={…} />
 * </ListGroup>
 */
import * as React from 'react';
import { Platform, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/lib/theme';
import { haptics } from '@/lib/ui/haptics';
import { Card } from './Card';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { Icon } from './Icon';

const RowIndexContext = React.createContext<number>(0);

export interface ListGroupProps {
  children: React.ReactNode;
  /** Caption above the group. */
  header?: string;
  /** Footnote below the group. */
  footer?: string;
  style?: StyleProp<ViewStyle>;
}

export function ListGroup({ children, header, footer, style }: ListGroupProps) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ gap: 8 }, style]}>
      {header ? (
        <Text
          variant="caption"
          tone="secondary"
          style={{ paddingHorizontal: 16 }}
          accessibilityRole="header">
          {header}
        </Text>
      ) : null}
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <RowIndexContext.Provider key={(row as React.ReactElement).key ?? i} value={i}>
            {row}
          </RowIndexContext.Provider>
        ))}
      </Card>
      {footer ? (
        <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 16 }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export type ListRowAccessory = 'chevron' | 'check' | 'none' | React.ReactNode;

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Tile tint for the icon. Default accent (danger when destructive). */
  iconTint?: string;
  /** Custom leading node instead of `icon` (e.g. an Avatar or MedTile). */
  leading?: React.ReactNode;
  /** Right-aligned secondary text. */
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
  iconTint,
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
  const tint = iconTint ?? (destructive ? colors.danger : colors.accent);
  const hasLeading = !!(leading || icon);
  const separatorInset = 16 + (hasLeading ? (leading ? 56 : 44) : 0);
  const resolvedAccessory: ListRowAccessory =
    accessory ?? (onPress && !hasSwitch ? 'chevron' : 'none');

  const toggle = () => {
    if (!onSwitchChange || disabled) return;
    haptics.tap();
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
        trackColor={{
          false: Platform.OS === 'android' ? colors.inkTertiary : undefined,
          true: colors.success,
        }}
        thumbColor={Platform.OS === 'android' ? colors.surfaceSolid : undefined}
        ios_backgroundColor={colors.surfaceSunken}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    );
  } else if (resolvedAccessory === 'chevron') {
    right = <Icon as={ChevronRight} size={20} tone="tertiary" />;
  } else if (resolvedAccessory === 'check') {
    right = <Icon as={Check} size={22} tone="accent" />;
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
            left: separatorInset,
            right: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.separator,
          }}
        />
      ) : null}
      {leading ??
        (icon ? (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              backgroundColor: withAlpha(tint, 0.14),
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon as={icon} size={19} color={tint} />
          </View>
        ) : null)}
      <View style={{ flex: 1, paddingVertical: 12 }}>
        <Text variant="body" tone={destructive ? 'danger' : 'primary'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subhead" tone="secondary" style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="body" tone="secondary" numberOfLines={1} style={{ maxWidth: '45%' }}>
          {value}
        </Text>
      ) : null}
      {right}
    </>
  );

  const rowStyle: ViewStyle = {
    minHeight: 56,
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
        activeScale={0.985}
        haptic={hasSwitch ? 'none' : 'light'}
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
