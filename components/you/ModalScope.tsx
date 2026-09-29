/**
 * Wraps a native modal route (`presentation: 'modal'`) so app overlays — confirm, action sheet,
 * toast — are presented from inside the modal (the root can't present over it on iOS; see
 * `components/ds/OverlayHost.tsx`) and gestures work in it. Screens inside call `useToast()` etc.
 * as usual; a toast shown right before `router.back()` moves to the screen underneath.
 *
 * Only for modal routes: an ordinary pushed screen must not host overlays.
 *
 * @example
 * export default function Route() {
 *   return <ModalScope><ExportScreen /></ModalScope>;
 * }
 */
import * as React from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OverlayScope } from '@/components/ds';

/** iOS presents modals as page sheets that already sit below the status bar. */
export const MODAL_SAFE_TOP = Platform.OS !== 'ios';

export function ModalScope({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OverlayScope>{children}</OverlayScope>
    </GestureHandlerRootView>
  );
}
