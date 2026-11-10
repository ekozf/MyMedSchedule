/**
 * Appearance radio sheet (Settings): System / Light / Dark. Picking one applies it right away
 * and closes the sheet.
 *
 * @example
 * <AppearanceSheet visible={open} value="system" onChange={save} onClose={() => setOpen(false)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { OptionRow, Sheet } from '@/components/ds';
import { APPEARANCES } from '@/lib/settings/appearance';
import type { Appearance } from '@/types';

const t = (key: string) => i18n.t(`ui.you.preferences.${key}`);

export function appearanceLabel(value: Appearance): string {
  return t(
    value === 'light' ? 'appearanceLight' : value === 'dark' ? 'appearanceDark' : 'appearanceSystem'
  );
}

export function AppearanceSheet({
  visible,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: Appearance;
  onChange: (value: Appearance) => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('appearanceTitle')}
      subtitle={t('appearanceSubtitle')}>
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {APPEARANCES.map((a) => (
          <OptionRow
            key={a}
            title={appearanceLabel(a)}
            description={a === 'system' ? t('appearanceSystemDescription') : undefined}
            selected={value === a}
            onPress={() => {
              onChange(a);
              onClose();
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}
