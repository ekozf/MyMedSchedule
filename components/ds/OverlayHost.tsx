/**
 * Overlay hosts: render app-wide overlays (confirm, action sheet, toast) inside the topmost
 * presented context.
 *
 * Why: on iOS an RN `<Modal>` is presented from the view controller that contains its host view.
 * If the providers rendered their sheets at the app root, UIKit would silently refuse to present
 * them while the root is already presenting something (an open `Sheet`, or a native modal route
 * such as `/medication/add`) — the promise would never resolve. Plain views (toasts) at the root
 * would also sit *under* those modals.
 *
 * How:
 * - A provider calls `useOverlayLayer(node)`; the node is stored under the provider's own key.
 *   Providers never subscribe to the store, so publishing a layer can't re-render them (no loop).
 * - Every `<OverlayHost />` registers itself while mounted. Only the top host renders the layers
 *   (in its own place in the tree, so contexts resolve there). Nodes move to the next host when
 *   the top one unmounts (e.g. a toast shown right before a sheet/modal closes lands on the
 *   screen underneath).
 * - "Top" = deepest host (hosts inside a `Sheet` or `ModalScope` are one level deeper than the
 *   host that encloses them, via `OverlayDepth`), then the most recently registered. Depth makes
 *   the order right even when a nested host mounts in the same commit as its parent (child
 *   effects run first).
 *
 * Hosts: one at the root (`app/_layout.tsx`), one inside every `Sheet` (opt out with
 * `registerOverlayHost={false}` — the sheets rendered *by* Confirm/ActionSheet must, or they would
 * take the top slot from the host that renders them), one inside each native modal route
 * (`ModalScope`, `AddMedicineFlow`, `/log/*`). Never in ordinary pushed/tab screens: hidden
 * screens stay mounted and would win the top slot.
 *
 * @example
 * function MyOverlayProvider({ children }) {
 *   const [open, setOpen] = React.useState(false);
 *   useOverlayLayer(open ? <Sheet visible registerOverlayHost={false} … /> : null);
 *   return <Ctx.Provider value={setOpen}>{children}</Ctx.Provider>;
 * }
 */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { create } from 'zustand';

interface HostEntry {
  id: string;
  depth: number;
  seq: number;
}

interface OverlayState {
  hosts: HostEntry[];
  topId: string | null;
  /** Insertion order is render order (later = above). Keys stay until their provider unmounts. */
  layers: Record<string, React.ReactNode>;
  register: (id: string, depth: number) => void;
  unregister: (id: string) => void;
  setLayer: (key: string, node: React.ReactNode) => void;
  removeLayer: (key: string) => void;
}

let seqCounter = 0;

function pickTop(hosts: HostEntry[]): string | null {
  let top: HostEntry | null = null;
  for (const h of hosts) {
    if (!top || h.depth > top.depth || (h.depth === top.depth && h.seq > top.seq)) top = h;
  }
  return top?.id ?? null;
}

const useOverlayStore = create<OverlayState>((set) => ({
  hosts: [],
  topId: null,
  layers: {},
  register: (id, depth) =>
    set((s) => {
      const hosts = [...s.hosts.filter((h) => h.id !== id), { id, depth, seq: ++seqCounter }];
      return { hosts, topId: pickTop(hosts) };
    }),
  unregister: (id) =>
    set((s) => {
      const hosts = s.hosts.filter((h) => h.id !== id);
      return { hosts, topId: pickTop(hosts) };
    }),
  setLayer: (key, node) =>
    set((s) => (s.layers[key] === node ? s : { layers: { ...s.layers, [key]: node } })),
  removeLayer: (key) =>
    set((s) => {
      if (!(key in s.layers)) return s;
      const layers = { ...s.layers };
      delete layers[key];
      return { layers };
    }),
}));

/** Nesting level of the closest enclosing host (0 = app root). */
const OverlayDepthContext = React.createContext(0);

/**
 * Wraps a presented context (sheet content, native modal screen) so hosts inside it rank above
 * the host that encloses it. Renders `children` and, when `host` is true, this level's host.
 */
export function OverlayScope({
  children,
  host = true,
}: {
  children: React.ReactNode;
  host?: boolean;
}) {
  const depth = React.useContext(OverlayDepthContext) + 1;
  return (
    <OverlayDepthContext.Provider value={depth}>
      {children}
      {host ? <OverlayHost /> : null}
    </OverlayDepthContext.Provider>
  );
}

/** Renders the overlay layers while it is the top host. */
export function OverlayHost() {
  const id = React.useId();
  const depth = React.useContext(OverlayDepthContext);
  const layers = useOverlayStore((s) => (s.topId === id ? s.layers : null));

  React.useLayoutEffect(() => {
    const { register, unregister } = useOverlayStore.getState();
    register(id, depth);
    return () => unregister(id);
  }, [id, depth]);

  if (!layers) return null;
  const entries = Object.entries(layers).filter(([, node]) => node != null && node !== false);
  if (entries.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {entries.map(([key, node]) => (
        <React.Fragment key={key}>{node}</React.Fragment>
      ))}
    </View>
  );
}

/**
 * Publishes `node` as this component's overlay layer (rendered by the top `OverlayHost`).
 * Pass `null` to render nothing. The layer is removed when the caller unmounts.
 */
export function useOverlayLayer(node: React.ReactNode | null) {
  const key = React.useId();

  React.useLayoutEffect(() => {
    useOverlayStore.getState().setLayer(key, node);
  }, [key, node]);

  React.useLayoutEffect(() => {
    return () => useOverlayStore.getState().removeLayer(key);
  }, [key]);
}

/** How long an overlay sheet may take to report its exit before its promise is settled anyway. */
const EXIT_FALLBACK_MS = 1200;

/**
 * Safety net for promise-based overlays: `arm(fn)` when the sheet starts closing, `cancel()` when
 * it reported `onDismissed`. If the sheet never reports (its host unmounted mid-exit and the new
 * host mounted it already closed), `fn` runs after a short delay so the caller is never stuck.
 */
export function useExitFallback() {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const api = React.useMemo(
    () => ({
      arm(fn: () => void) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          timer.current = null;
          fn();
        }, EXIT_FALLBACK_MS);
      },
      cancel() {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
      },
    }),
    []
  );
  React.useEffect(() => api.cancel, [api]);
  return api;
}
