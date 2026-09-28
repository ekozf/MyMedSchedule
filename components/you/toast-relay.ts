/**
 * Relays a toast from a screen that is about to close (profile pages, export) to the You screen
 * underneath. Needed because the root toast renders *under* native modals on iOS, and /you is
 * itself a modal: the You screen hosts its own toast layer (see `ModalScope`) and shows a relayed
 * toast when it regains focus. When no You screen is mounted, the toast goes to `fallback`.
 *
 * @example
 * relayToast({ title: 'Profile saved', tone: 'success' }, rootToast);
 * router.back();
 */
import * as React from 'react';
import { useFocusEffect } from 'expo-router';
import type { ToastApi, ToastOptions } from '@/components/ds';

let hosts = 0;
let pending: ToastOptions | null = null;

export function relayToast(options: ToastOptions, fallback: ToastApi) {
  if (hosts > 0) pending = options;
  else fallback.show(options);
}

/** Registers the caller as the relay host; shows a pending toast each time it gains focus. */
export function useToastRelayHost(toast: ToastApi) {
  React.useEffect(() => {
    hosts += 1;
    return () => {
      hosts -= 1;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!pending) return;
      const options = pending;
      pending = null;
      // Let the closing modal finish its animation first.
      const timer = setTimeout(() => toast.show(options), 350);
      return () => clearTimeout(timer);
    }, [toast])
  );
}
