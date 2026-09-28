/**
 * Promise-based confirmation sheet. Mount `<ConfirmProvider>` once (root layout does this).
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
 *   icon: Trash2,
 * });
 * if (ok) await deleteMedication(id);
 */
import * as React from 'react';
import { View } from 'react-native';
import { CircleHelp, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { haptics } from '@/lib/ui/haptics';
import { statusColors, useTheme } from '@/lib/theme';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { Icon } from './Icon';
import { Button } from './Button';
import { useExitFallback, useOverlayLayer } from './OverlayHost';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  /** Default: "Cancel". */
  cancelLabel?: string;
  tone?: 'default' | 'danger' | 'warning';
  icon?: LucideIcon;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = React.useState<{ options: ConfirmOptions; gen: number } | null>(
    null
  );
  const [visible, setVisible] = React.useState(false);
  const resolver = React.useRef<((v: boolean) => void) | null>(null);
  const result = React.useRef(false);
  const gen = React.useRef(0);
  const closing = React.useRef(false);
  const fallback = useExitFallback();

  const confirm = React.useCallback<ConfirmFn>(
    (opts) => {
      // Only one at a time: a pending confirm is cancelled (one already answered and closing
      // keeps its answer).
      resolver.current?.(closing.current ? result.current : false);
      closing.current = false;
      fallback.cancel();
      gen.current += 1;
      const g = gen.current;
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        result.current = false;
        setCurrent({ options: opts, gen: g });
        setVisible(true);
        if (opts.tone === 'danger' || opts.tone === 'warning') haptics.warning();
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

  const close = (value: boolean) => {
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
        onClose={() => close(false)}
        onDismissed={() => finish(current.gen)}
        scrollable={false}
        registerOverlayHost={false}
        accessibilityLabel={current.options.title}>
        <ConfirmBody
          options={current.options}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />
      </Sheet>
    ) : null
  );

  return <ConfirmContext.Provider value={confirm}>{children}</ConfirmContext.Provider>;
}

function ConfirmBody({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const tone = options.tone ?? 'default';
  const sc = statusColors(colors, tone === 'default' ? 'accent' : tone);
  const icon = options.icon ?? (tone === 'default' ? CircleHelp : TriangleAlert);

  return (
    <View style={{ alignItems: 'center', paddingTop: 8, gap: 12 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: sc.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon as={icon} size={30} color={sc.fg} />
      </View>
      <Text variant="title2" align="center">
        {options.title}
      </Text>
      {options.message ? (
        <Text variant="body" tone="secondary" align="center">
          {options.message}
        </Text>
      ) : null}
      <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 12 }}>
        <Button
          label={options.confirmLabel}
          variant={tone === 'danger' ? 'danger' : 'primary'}
          size="lg"
          fullWidth
          onPress={onConfirm}
        />
        <Button
          label={options.cancelLabel ?? i18n.t('ui.common.cancel')}
          variant="plain"
          size="lg"
          fullWidth
          haptic="none"
          onPress={onCancel}
        />
      </View>
    </View>
  );
}
