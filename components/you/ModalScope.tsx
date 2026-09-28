/**
 * Wraps a modal route so toasts show *inside* the modal (the root toast layer sits under native
 * modals on iOS) and gestures work in it. Screens inside call `useToast()` as usual.
 *
 * @example
 * export default function Route() {
 *   return <ModalScope><ExportScreen /></ModalScope>;
 * }
 */
import * as React from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '@/components/ds';

/** iOS presents modals as page sheets that already sit below the status bar. */
export const MODAL_SAFE_TOP = Platform.OS !== 'ios';

export function ModalScope({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>{children}</ToastProvider>
    </GestureHandlerRootView>
  );
}
