/**
 * Tab bar (docs/DESIGN.md §4): full width, `bg` with a top hairline, 92 tall including the bottom
 * safe area. Four items: Today, Medicines, Journal, Settings (route `you`). Icon 28 + label 14/600;
 * active = accent.
 * Hidden while the keyboard is open. Publishes its height (see `useTabBarHeight`) so toasts float
 * above it.
 */
import * as React from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Grid2x2, Pill, Settings, type LucideIcon } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { TAB_BAR_HEIGHT, TAB_BAR_MIN_BOTTOM, useTabBarHeight } from '@/lib/ui/layout';
import { Icon, Text } from '@/components/ds';

const TAB_META: Record<string, { icon: LucideIcon; labelKey: string }> = {
  dashboard: { icon: Grid2x2, labelKey: 'ui.shell.tabs.today' },
  medications: { icon: Pill, labelKey: 'ui.shell.tabs.medicines' },
  history: { icon: BookOpen, labelKey: 'ui.shell.tabs.journal' },
  you: { icon: Settings, labelKey: 'ui.shell.tabs.you' },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  // False while a page is pushed over the tabs (the bar is covered then).
  const focused = useIsFocused();
  const setHeight = useTabBarHeight((s) => s.set);
  const [keyboardOpen, setKeyboardOpen] = React.useState(false);

  React.useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardOpen(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardOpen(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const bottomPad = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM);
  const total = TAB_BAR_HEIGHT + bottomPad;
  const visible = focused && !keyboardOpen;

  React.useEffect(() => {
    setHeight(visible ? total : 0);
  }, [visible, total, setHeight]);
  React.useEffect(() => () => setHeight(0), [setHeight]);

  if (keyboardOpen) return null;

  const routes = state.routes.filter((r) => TAB_META[r.name]);
  const focusedKey = state.routes[state.index]?.key;

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={i18n.t('ui.shell.a11y.tabBar')}
      style={{
        flexDirection: 'row',
        backgroundColor: colors.bg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.line,
        paddingBottom: bottomPad,
        paddingHorizontal: 8,
      }}>
      {routes.map((route) => {
        const meta = TAB_META[route.name];
        const selected = route.key === focusedKey;
        const label = i18n.t(meta.labelKey);
        const color = selected ? colors.accent : colors.ink2;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!selected && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <TabItem
            key={route.key}
            label={label}
            selected={selected}
            icon={meta.icon}
            color={color}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    minHeight: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 8,
  },
  pressed: { opacity: 0.6 },
});

/**
 * One tab. Pressed state lives in React state because function `style` props are dropped by the
 * NativeWind css-interop in this project.
 */
function TabItem({
  label,
  selected,
  icon,
  color,
  onPress,
  onLongPress,
}: {
  label: string;
  selected: boolean;
  icon: LucideIcon;
  color: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const [pressed, setPressed] = React.useState(false);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.item, pressed && styles.pressed]}>
      <Icon as={icon} size={28} color={color} />
      <Text
        variant="caption"
        weight="600"
        color={color}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={{ fontSize: 14, lineHeight: 18 }}>
        {label}
      </Text>
    </Pressable>
  );
}
