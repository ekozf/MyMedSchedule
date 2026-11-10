/**
 * Promise-based confirmation sheet (docs/DESIGN.md §4): `title2`, a plain sentence, one primary
 * (or danger) button and a quiet Cancel. Only for deleting, removing and turning off the lock;
 * everything else uses a toast with Undo. Mount `<ConfirmProvider>` once (root layout does this).
 * The sheet renders in the topmost `OverlayHost` (so it shows above an open sheet or modal
 * screen). The promise resolves after the sheet has fully closed, so it's safe to open another
 * sheet, navigate or show a toast right after.
 *
 * @example
 * const confirm = useConfirm();
 * const ok = await confirm({
 *   title: 'Delete Metformin?',
 *   message: 'Its history will be removed too.',
 *   confirmLabel: 'Delete medicine',
 *   tone: 'danger',
 * });
 * if (ok) await deleteMedication(id);
 *
 * // Two ways forward plus Cancel (e.g. "Log anyway" / "Update supply first"):
 * const choose = useConfirmChoice();
 * const pick = await choose({ title, message, confirmLabel: 'Log anyway', secondaryLabel: 'Update supply first' });
 * // 'confirm' | 'secondary' | 'cancel'
 */
import * as React from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { Button } from './Button';
import { useExitFallback, useOverlayLayer } from './OverlayHost';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  /** Default: "Cancel". */
  cancelLabel?: string;
  /** 'danger' = danger button. 'warning' behaves like 'default' (kept for safety checks). */
  tone?: 'default' | 'danger' | 'warning';
  /** @deprecated remove after screen rewrite — confirms have no icon (still passed by lib/ui/dose-actions.ts) */
  icon?: LucideIcon;
  /** Optional second way forward, a secondary button between the main one and Cancel. */
  secondaryLabel?: string;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
export type ConfirmChoice = 'confirm' | 'secondary' | 'cancel';
export type ConfirmChoiceFn = (options: ConfirmOptions) => Promise<ConfirmChoice>;

const ConfirmContext = React.createContext<ConfirmChoiceFn | null>(null);

export function useConfirm(): ConfirmFn {
  const choose = useConfirmChoice();
  return React.useCallback(async (opts) => (await choose(opts)) === 'confirm', [choose]);
}

/** Like `useConfirm`, but tells apart the main button, `secondaryLabel` and Cancel. */
export function useConfirmChoice(): ConfirmChoiceFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = React.useState<{ options: ConfirmOptions; gen: number } | null>(
    null
  );
  const [visible, setVisible] = React.useState(false);
  const resolver = React.useRef<((v: ConfirmChoice) => void) | null>(null);
  const result = React.useRef<ConfirmChoice>('cancel');
  const gen = React.useRef(0);
  const closing = React.useRef(false);
  const fallback = useExitFallback();

  const confirm = React.useCallback<ConfirmChoiceFn>(
    (opts) => {
      // Only one at a time: a pending confirm is cancelled (one already answered and closing
      // keeps its answer).
      resolver.current?.(closing.current ? result.current : 'cancel');
      closing.current = false;
      fallback.cancel();
      gen.current += 1;
      const g = gen.current;
      return new Promise<ConfirmChoice>((resolve) => {
        resolver.current = resolve;
        result.current = 'cancel';
        setCurrent({ options: opts, gen: g });
        setVisible(true);
      });
    },
    [fallback]
  );

  /** Resolves the confirm of generation `g` (ignored when a newer one replaced it). */
  const finish = React.useCallback(
    (g: number) => {
      if (g !== gen.current) return;
      fallback.cancel();
      closing.current = false;
      const resolve = resolver.current;
      resolver.current = null;
      setCurrent(null);
      resolve?.(result.current);
    },
    [fallback]
  );

  const close = (value: ConfirmChoice) => {
    // First answer wins (e.g. a backdrop tap during the exit doesn't turn "yes" into "no").
    if (!current || closing.current) return;
    result.current = value;
    closing.current = true;
    setVisible(false);
    // Safety net in case the sheet never reports its exit (see useExitFallback).
    const g = current.gen;
    fallback.arm(() => finish(g));
  };

  useOverlayLayer(
    current ? (
      <Sheet
        visible={visible}
        onClose={() => close('cancel')}
        onDismissed={() => finish(current.gen)}
        scrollable={false}
        registerOverlayHost={false}
        accessibilityLabel={current.options.title}>
        <ConfirmBody
          options={current.options}
          onConfirm={() => close('confirm')}
          onSecondary={() => close('secondary')}
          onCancel={() => close('cancel')}
        />
      </Sheet>
    ) : null
  );

  return <ConfirmContext.Provider value={confirm}>{children}</ConfirmContext.Provider>;
}

function ConfirmBody({
  options,
  onConfirm,
  onSecondary,
  onCancel,
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onSecondary: () => void;
  onCancel: () => void;
}) {
  const danger = options.tone === 'danger';
  return (
    <View style={{ paddingTop: 8, gap: 12 }}>
      <Text variant="title2">{options.title}</Text>
      {options.message ? (
        <Text variant="body" tone="secondary">
          {options.message}
        </Text>
      ) : null}
      <View style={{ alignSelf: 'stretch', gap: 4, marginTop: 12 }}>
        <Button
          label={options.confirmLabel}
          variant={danger ? 'danger' : 'primary'}
          onPress={onConfirm}
        />
        {options.secondaryLabel ? (
          <Button
            label={options.secondaryLabel}
            variant="secondary"
            onPress={onSecondary}
            style={{ marginTop: 6 }}
          />
        ) : null}
        <Button
          label={options.cancelLabel ?? i18n.t('ui.common.cancel')}
          variant="quiet"
          onPress={onCancel}
        />
      </View>
    </View>
  );
}
