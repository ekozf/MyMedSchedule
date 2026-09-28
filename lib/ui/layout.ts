/**
 * Shell layout constants + hooks shared by the floating tab bar and screens.
 *
 * @example
 * const bottom = useTabBarInset(); // padding so content clears the floating tab bar
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the floating tab bar pill and the + button. */
export const TAB_BAR_HEIGHT = 64;
/** Gap between the tab bar and the bottom safe area. */
export const TAB_BAR_BOTTOM_GAP = 12;
/** Screen gutter (DESIGN.md §2.3). */
export const GUTTER = 20;

/** Bottom padding a scroll view needs so its last item clears the floating tab bar. */
export function useTabBarInset(extra: number = 16): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + TAB_BAR_BOTTOM_GAP + TAB_BAR_HEIGHT + extra;
}
