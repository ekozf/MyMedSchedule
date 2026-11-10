/**
 * Shell layout constants + hooks shared by the tab bar, toast and screens.
 *
 * @example
 * const bottom = useTabBarInset(); // extra bottom padding for scroll content on tab screens
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

/** Tab bar content height (icon 28 + label), excluding the bottom safe area. */
export const TAB_BAR_HEIGHT = 60;
/** Minimum space under the tab bar items, so the bar is 92 tall on devices without an inset. */
export const TAB_BAR_MIN_BOTTOM = 32;
/** Screen side padding (DESIGN.md §3.4). */
export const GUTTER = 20;

/** Full tab bar height for the given bottom safe-area inset. */
export function tabBarTotalHeight(insetBottom: number): number {
  return TAB_BAR_HEIGHT + Math.max(insetBottom, TAB_BAR_MIN_BOTTOM);
}

/**
 * Height of the tab bar while it is on screen (0 when a pushed page or the keyboard hides it).
 * Written by `TabBar`, read by `Toast` to float above it.
 */
export const useTabBarHeight = create<{ height: number; set: (h: number) => void }>((set) => ({
  height: 0,
  set: (height) => set((s) => (s.height === height ? s : { height })),
}));

/**
 * Bottom padding for scroll content on tab screens. The tab bar is laid out below the scene (not
 * floating), so this is just breathing room above it.
 */
export function useTabBarInset(extra: number = 24): number {
  return extra;
}

/** Bottom padding for scroll content on pages without a tab bar. */
export function usePageBottomInset(extra: number = 24): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + extra;
}
