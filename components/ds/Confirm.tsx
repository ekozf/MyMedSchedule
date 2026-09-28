/**
 * Promise-based confirmation sheet. Mount `<ConfirmProvider>` once (root layout does this).
 * The promise resolves after the sheet has fully closed, so it's safe to open another sheet,
 * navigate or show a toast right after.
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
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const [visible, setVisible] = React.useState(false);
  const resolver = React.useRef<((v: boolean) => void) | null>(null);
  const result = React.useRef(false);

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    // Only one at a time: a pending confirm is cancelled.
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      result.current = false;
      setOptions(opts);
      setVisible(true);
      if (opts.tone === 'danger' || opts.tone === 'warning') haptics.warning();
    });
  }, []);

  const close = (value: boolean) => {
    result.current = value;
    setVisible(false);
  };

  const onDismissed = () => {
    const resolve = resolver.current;
    resolver.current = null;
    setOptions(null);
    resolve?.(result.current);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options ? (
        <Sheet
          visible={visible}
          onClose={() => close(false)}
          onDismissed={onDismissed}
          scrollable={false}
          accessibilityLabel={options.title}>
          <ConfirmBody
            options={options}
            onConfirm={() => close(true)}
            onCancel={() => close(false)}
          />
        </Sheet>
      ) : null}
    </ConfirmContext.Provider>
  );
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
