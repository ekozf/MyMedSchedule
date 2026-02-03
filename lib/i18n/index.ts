import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import en from './locales/en';
import tr from './locales/tr';
import nl from './locales/nl';

const i18n = new I18n({
  en,
  tr,
  nl,
});

i18n.locale = Localization.getLocales()[0]?.languageCode ?? 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Enable pluralization
i18n.pluralization.register('en', (count) => {
  if (count === 0) return 'zero';
  if (count === 1) return 'one';
  return 'other';
});

i18n.pluralization.register('tr', (count) => {
  if (count === 0) return 'zero';
  if (count === 1) return 'one';
  return 'other';
});

i18n.pluralization.register('nl', (count) => {
  if (count === 0) return 'zero';
  if (count === 1) return 'one';
  return 'other';
});

// Helper function to change locale and notify listeners
let localeChangeListeners: Array<() => void> = [];

export function setLocale(locale: 'en' | 'tr' | 'nl') {
  i18n.locale = locale;
  // Notify all listeners that locale changed
  localeChangeListeners.forEach(listener => listener());
}

export function onLocaleChange(listener: () => void) {
  localeChangeListeners.push(listener);
  return () => {
    localeChangeListeners = localeChangeListeners.filter(l => l !== listener);
  };
}

export function getCurrentLocale(): string {
  return i18n.locale;
}

export default i18n;
