/**
 * Haptic feedback helpers (docs/DESIGN.md §2.5). Every call is fire-and-forget and a safe no-op on
 * web or when the device/OS refuses.
 *
 * @example
 * import { haptics } from '@/lib/ui/haptics';
 * haptics.tap();      // selection change: chip, segment, tab
 * haptics.light();    // button press
 * haptics.success();  // dose logged
 * haptics.warning();  // safety warning shown
 * haptics.error();    // wrong PIN
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function safe(fn: () => Promise<void>) {
  if (!enabled) return;
  try {
    fn().catch(() => {});
  } catch {
    // ignore
  }
}

export const haptics = {
  /** Selection tick (chips, segmented control, tab change, stepper). */
  tap: () => safe(() => Haptics.selectionAsync()),
  /** Light impact (button press). */
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Medium impact (swipe threshold crossed, long-press). */
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export type HapticKind = keyof typeof haptics;
