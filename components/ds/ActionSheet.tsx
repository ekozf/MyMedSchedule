/**
 * Promise-based action sheet with large rows. Mount `<ActionSheetProvider>` once (root layout
 * does this). Resolves with the chosen option's `key`, or `null` when dismissed — after the sheet
 * has fully closed.
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
  const [options, setOptions] = React.useState<ActionSheetOptions | null>(null);
  const [visible, setVisible] = React.useState(false);
  const resolver = React.useRef<((v: string | null) => void) | null>(null);
  const result = React.useRef<string | null>(null);

  const show = React.useCallback((opts: ActionSheetOptions) => {
    resolver.current?.(null);
    return new Promise<string | null>((resolve) => {
      resolver.current = resolve;
      result.current = null;
      setOptions(opts);
      setVisible(true);
    });
  }, []) as ShowActionSheet;

  const close = (value: string | null) => {
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
    <ActionSheetContext.Provider value={show}>
      {children}
      {options ? (
        <Sheet
          visible={visible}
          onClose={() => close(null)}
          onDismissed={onDismissed}
          title={options.title}
          subtitle={options.message}
          footer={
            <Button
              label={options.cancelLabel ?? i18n.t('ui.common.cancel')}
              variant="plain"
              size="lg"
              fullWidth
              haptic="none"
              onPress={() => close(null)}
            />
          }>
          <ActionRows options={options.options} onSelect={close} />
        </Sheet>
      ) : null}
    </ActionSheetContext.Provider>
  );
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
