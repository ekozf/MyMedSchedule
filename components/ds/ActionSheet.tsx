/**
 * Promise-based action sheet with large rows. Mount `<ActionSheetProvider>` once (root layout
 * does this); the sheet renders in the topmost `OverlayHost`. Resolves with the chosen option's
 * `key`, or `null` when dismissed — after the sheet has fully closed.
 *
 * @example
 * const showActionSheet = useActionSheet();
 * const choice = await showActionSheet({
 *   title: 'Profile photo',
 *   options: [
 *     { key: 'camera', label: 'Take photo', icon: Camera },
 *     { key: 'library', label: 'Choose from library', icon: ImageIcon },
 *     { key: 'remove', label: 'Remove photo', icon: Trash2, destructive: true },
 *   ],
 * });
 * if (choice === 'camera') …
 */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { Icon } from './Icon';
import { Button } from './Button';
import { PressableScale } from './PressableScale';
import { useExitFallback, useOverlayLayer } from './OverlayHost';

export interface ActionSheetOption<K extends string = string> {
  key: K;
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  disabled?: boolean;
}

export interface ActionSheetOptions<K extends string = string> {
  title?: string;
  message?: string;
  options: ActionSheetOption<K>[];
  /** Default: "Cancel". */
  cancelLabel?: string;
}

export type ShowActionSheet = <K extends string>(
  options: ActionSheetOptions<K>
) => Promise<K | null>;

const ActionSheetContext = React.createContext<ShowActionSheet | null>(null);

export function useActionSheet(): ShowActionSheet {
  const ctx = React.useContext(ActionSheetContext);
  if (!ctx) throw new Error('useActionSheet must be used inside <ActionSheetProvider>');
  return ctx;
}

export function ActionSheetProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = React.useState<{ options: ActionSheetOptions; gen: number } | null>(
    null
  );
  const [visible, setVisible] = React.useState(false);
  const resolver = React.useRef<((v: string | null) => void) | null>(null);
  const result = React.useRef<string | null>(null);
  const gen = React.useRef(0);
  const closing = React.useRef(false);
  const fallback = useExitFallback();

  const show = React.useCallback(
    (opts: ActionSheetOptions) => {
      // A pending sheet is cancelled (one already answered and closing keeps its answer).
      resolver.current?.(closing.current ? result.current : null);
      closing.current = false;
      fallback.cancel();
      gen.current += 1;
      const g = gen.current;
      return new Promise<string | null>((resolve) => {
        resolver.current = resolve;
        result.current = null;
        setCurrent({ options: opts, gen: g });
        setVisible(true);
      });
    },
    [fallback]
  ) as ShowActionSheet;

  /** Resolves the sheet of generation `g` (ignored when a newer one replaced it). */
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

  const close = (value: string | null) => {
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
        onClose={() => close(null)}
        onDismissed={() => finish(current.gen)}
        registerOverlayHost={false}
        title={current.options.title}
        subtitle={current.options.message}
        footer={
          <Button
            label={current.options.cancelLabel ?? i18n.t('ui.common.cancel')}
            variant="plain"
            size="lg"
            fullWidth
            haptic="none"
            onPress={() => close(null)}
          />
        }>
        <ActionRows options={current.options.options} onSelect={close} />
      </Sheet>
    ) : null
  );

  return <ActionSheetContext.Provider value={show}>{children}</ActionSheetContext.Provider>;
}

function ActionRows({
  options,
  onSelect,
}: {
  options: ActionSheetOption[];
  onSelect: (key: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderRadius: 20,
        backgroundColor: colors.surfaceSunken,
        overflow: 'hidden',
      }}>
      {options.map((opt, i) => {
        const tone = opt.destructive ? 'danger' : 'primary';
        return (
          <PressableScale
            key={opt.key}
            activeScale={0.98}
            disabled={opt.disabled}
            onPress={() => onSelect(opt.key)}
            accessibilityLabel={opt.label}
            style={{
              minHeight: 56,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              opacity: opt.disabled ? 0.45 : 1,
              borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
              borderTopColor: colors.separator,
            }}>
            {opt.icon ? (
              <Icon as={opt.icon} tone={opt.destructive ? 'danger' : 'accent'} size={22} />
            ) : null}
            <Text variant="body" tone={tone} style={{ flex: 1 }}>
              {opt.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
