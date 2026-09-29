/**
 * Floating glass tab bar (DESIGN.md §4.1): three labelled items on a pill with a sliding
 * accent-soft capsule, plus a separate round + button that opens the Quick add sheet.
 * Floats 12pt above the bottom safe area; hidden while the keyboard is open.
 * Screens should use `<Screen bottomInset="tabBar">` (or `useTabBarInset()`) so content clears it.
 */
import * as React from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, CalendarCheck2, Pill, Plus, type LucideIcon } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { SPRING, useTheme, withAlpha } from '@/lib/theme';
import { haptics } from '@/lib/ui/haptics';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/lib/ui/layout';
import { Icon, PressableScale, Text } from '@/components/ds';
import { QuickAddSheet } from './QuickAddSheet';

const TAB_META: Record<string, { icon: LucideIcon; labelKey: string }> = {
  dashboard: { icon: CalendarCheck2, labelKey: 'ui.shell.tabs.today' },
  medications: { icon: Pill, labelKey: 'ui.shell.tabs.medicines' },
  history: { icon: BookOpen, labelKey: 'ui.shell.tabs.journal' },
};

const PAD = 6;

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const [quickAdd, setQuickAdd] = React.useState(false);
  const [keyboardOpen, setKeyboardOpen] = React.useState(false);
  const [width, setWidth] = React.useState(0);

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

  const routes = state.routes.filter((r) => TAB_META[r.name]);
  const focusedKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    routes.findIndex((r) => r.key === focusedKey)
  );
  const itemW = width > 0 ? (width - PAD * 2) / Math.max(routes.length, 1) : 0;

  const x = useSharedValue(0);
  React.useEffect(() => {
    const target = activeIndex * itemW;
    x.value =
      reduceMotion || itemW === 0
        ? withTiming(target, { duration: 0 })
        : withSpring(target, SPRING);
  }, [activeIndex, itemW, reduceMotion, x]);
  const capsuleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  if (keyboardOpen) return null;

  const glassFill = Platform.OS === 'ios' ? colors.surface : withAlpha(colors.surfaceSolid, 0.96);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + TAB_BAR_BOTTOM_GAP,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={i18n.t('ui.shell.a11y.tabBar')}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[
          styles.pill,
          {
            borderColor: colors.stroke,
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : glassFill,
            shadowColor: colors.shadow,
            shadowOpacity: isDark ? 0.35 : 0.12,
          },
        ]}>
        {Platform.OS === 'ios' ? (
          <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
            <BlurView
              intensity={40}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: glassFill }]} />
          </View>
        ) : null}
        {itemW > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: PAD,
                left: PAD,
                width: itemW,
                height: TAB_BAR_HEIGHT - PAD * 2,
                borderRadius: (TAB_BAR_HEIGHT - PAD * 2) / 2,
                backgroundColor: colors.accentSoft,
              },
              capsuleStyle,
            ]}
          />
        ) : null}
        {routes.map((route) => {
          const meta = TAB_META[route.name];
          const focused = route.key === focusedKey;
          const label = i18n.t(meta.labelKey);
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              haptics.tap();
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={styles.item}>
              <Icon as={meta.icon} size={24} tone={focused ? 'accent' : 'secondary'} />
              <Text
                variant="footnote"
                weight="600"
                tone={focused ? 'accent' : 'secondary'}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
                style={{ fontSize: 12, lineHeight: 15 }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <PressableScale
        accessibilityLabel={i18n.t('ui.shell.a11y.quickAdd')}
        onPress={() => setQuickAdd(true)}
        style={[
          styles.plus,
          {
            backgroundColor: colors.accent,
            shadowColor: colors.accent,
            shadowOpacity: isDark ? 0 : 0.35,
          },
        ]}>
        <Icon as={Plus} size={30} color={colors.onAccent} strokeWidth={2.5} />
      </PressableScale>

      <QuickAddSheet visible={quickAdd} onClose={() => setQuickAdd(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: 'row',
    padding: PAD,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  clip: { borderRadius: TAB_BAR_HEIGHT / 2, overflow: 'hidden' },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  plus: {
    width: TAB_BAR_HEIGHT,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
