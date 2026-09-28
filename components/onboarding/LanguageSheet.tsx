/**
 * Language picker sheet: each language in its own name, check on the current one. The caller
 * applies the choice in `onDismissed` (after the sheet is gone), because `setLocale` remounts the
 * whole navigator.
 *
 * @example
 * <LanguageSheet visible={open} current="en" onSelect={(l) => { pending.current = l; setOpen(false); }}
 *   onClose={() => setOpen(false)} onDismissed={apply} />
 */
import * as React from 'react';
import i18n from '@/lib/i18n';
import { ListGroup, ListRow, Sheet } from '@/components/ds';

export type AppLocale = 'en' | 'nl' | 'tr';
export const APP_LOCALES: AppLocale[] = ['en', 'nl', 'tr'];

export function toAppLocale(locale: string): AppLocale {
  return (APP_LOCALES as string[]).includes(locale) ? (locale as AppLocale) : 'en';
}

/** A language in its own name (not translated). */
export function languageName(locale: AppLocale): string {
  return i18n.t(`ui.onboarding.languages.${locale}`, { locale: 'en' });
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
      title={i18n.t('ui.onboarding.welcome.languageTitle')}>
      <ListGroup>
        {APP_LOCALES.map((l) => (
          <ListRow
            key={l}
            title={languageName(l)}
            accessory={l === current ? 'check' : 'none'}
            onPress={() => onSelect(l)}
          />
        ))}
      </ListGroup>
    </Sheet>
  );
}
