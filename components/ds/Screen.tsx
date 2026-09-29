/**
 * Screen scaffold: sky gradient + safe area + (scrolling) content with the 20pt gutter.
 *
 * @example
 * // Tab screen: large header scrolls with content, bottom padding clears the floating tab bar
 * <Screen bottomInset="tabBar" refreshControl={<RefreshControl … />}>
 *   <TabHeader title="Medicines" />
 *   …
 * </Screen>
 *
 * // Stack screen: fixed nav header + sticky primary action
 * <Screen header={<NavHeader title="Supply" />} footer={<Button label="Save" size="lg" fullWidth />}>
 *   …
 * </Screen>
 */
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, withAlpha } from '@/lib/theme';
import { GUTTER, useTabBarInset } from '@/lib/ui/layout';
import { GradientBackground } from './GradientBackground';

export interface ScreenProps {
  children?: React.ReactNode;
  /** Wrap content in a ScrollView. Default true. */
  scroll?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Fixed (non-scrolling) header, e.g. `<NavHeader />`. Put `<TabHeader />` in children instead to let it scroll. */
  header?: React.ReactNode;
  /** Sticky bottom area (primary action), above the bottom safe area. */
  footer?: React.ReactNode;
  /** 'tabBar' adds padding so content clears the floating tab bar. Default 'none'. */
  bottomInset?: 'tabBar' | 'none';
  /** Lift content (and footer) above the keyboard. */
  keyboardAware?: boolean;
  /** Apply the top safe-area inset. Default true; set false for iOS page-sheet modals. */
  safeTop?: boolean;
  /** Horizontal 20pt gutter on content. Default true. */
  padded?: boolean;
  scrollRef?: React.Ref<ScrollView>;
  /** Extra ScrollView props (onScroll, stickyHeaderIndices, …). */
  scrollProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle' | 'refreshControl'>;
}

export function Screen({
  children,
  scroll = true,
  refreshControl,
  contentContainerStyle,
  style,
  header,
  footer,
  bottomInset = 'none',
  keyboardAware = false,
  safeTop = true,
  padded = true,
  scrollRef,
  scrollProps,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const tabBarInset = useTabBarInset();

  const onTabBar = bottomInset === 'tabBar';
  const contentBottom = footer ? 16 : onTabBar ? tabBarInset : insets.bottom + 24;
  const footerBottom = onTabBar ? tabBarInset - 8 : insets.bottom + 12;

  const contentStyle: StyleProp<ViewStyle> = [
    { paddingHorizontal: padded ? GUTTER : 0, paddingTop: header ? 4 : 8 },
    scroll
      ? { paddingBottom: contentBottom, flexGrow: 1 }
      : { flex: 1, paddingBottom: footer ? 0 : contentBottom },
    contentContainerStyle,
  ];

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={contentStyle}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      {...scrollProps}>
      {children}
    </ScrollView>
  ) : (
    <View style={contentStyle}>{children}</View>
  );

  const inner = (
    <>
      {header ? <View style={{ paddingHorizontal: padded ? GUTTER : 0 }}>{header}</View> : null}
      {body}
      {footer ? (
        <View style={{ paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: footerBottom }}>
          <LinearGradient
            pointerEvents="none"
            colors={[withAlpha(colors.bgBottom, 0), colors.bgBottom]}
            locations={[0, 0.35]}
            style={StyleSheet.absoluteFill}
          />
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[{ flex: 1, paddingTop: safeTop ? insets.top : 0 }, style]}>
      <GradientBackground />
      {keyboardAware ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </View>
  );
}
