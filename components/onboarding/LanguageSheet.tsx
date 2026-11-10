/**
 * Language choice: one `OptionRow` per language, titled in its own name ("Nederlands") with the
 * name in the current language underneath ("Dutch"). `LanguageOptions` is the bare list (used by
 * the You → Language page); `LanguageSheet` puts it in a sheet (Welcome). The caller applies the
 * choice: from a sheet do it in `onDismissed`, because `setLocale` remounts the navigator.
 *
 * @example
 * <LanguageSheet visible={open} current="en" onSelect={(l) => { pending.current = l; setOpen(false); }}
 *   onClose={() => setOpen(false)} onDismissed={apply} />
 * <LanguageOptions current={locale} onSelect={apply} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { OptionRow, Sheet } from '@/components/ds';

export type AppLocale = 'en' | 'nl' | 'tr';
export const APP_LOCALES: AppLocale[] = ['en', 'nl', 'tr'];

export function toAppLocale(locale: string): AppLocale {
  return (APP_LOCALES as string[]).includes(locale) ? (locale as AppLocale) : 'en';
}

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as string[]).includes(value);
}

/** A language in its own name (not translated). */
export function languageName(locale: AppLocale): string {
  return i18n.t(`ui.onboarding.languages.${locale}`, { locale: 'en' });
}

/** A language's name in the current UI language ("Dutch" while the app is in English). */
export function languageLocalName(locale: AppLocale): string {
  return i18n.t(`ui.onboarding.languagesLocal.${locale}`);
}

export interface LanguageOptionsProps {
  current: AppLocale;
  onSelect: (locale: AppLocale) => void;
  disabled?: boolean;
}

export function LanguageOptions({ current, onSelect, disabled }: LanguageOptionsProps) {
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup">
      {APP_LOCALES.map((l) => {
        const own = languageName(l);
        const local = languageLocalName(l);
        return (
          <OptionRow
            key={l}
            title={own}
            description={local !== own ? local : undefined}
            selected={l === current}
            disabled={disabled}
            onPress={() => onSelect(l)}
          />
        );
      })}
    </View>
  );
}

export interface LanguageSheetProps {
  visible: boolean;
  current: AppLocale;
  onSelect: (locale: AppLocale) => void;
  onClose: () => void;
  onDismissed?: () => void;
}

export function LanguageSheet({
  visible,
  current,
  onSelect,
  onClose,
  onDismissed,
}: LanguageSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title={i18n.t('ui.onboarding.welcome.languageTitle')}
      subtitle={i18n.t('ui.onboarding.welcome.languageSubtitle')}>
      <View style={{ paddingBottom: 8 }}>
        <LanguageOptions current={current} onSelect={onSelect} />
      </View>
    </Sheet>
  );
}
