import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import en from './locales/en';
import tr from './locales/tr';
import nl from './locales/nl';

const i18n = new I18n({
  en,
  tr,
  nl,
});

// We'll set the locale after loading saved preference
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const LANGUAGE_STORAGE_KEY = 'user_language';

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

export async function setLocale(locale: 'en' | 'tr' | 'nl') {
  i18n.locale = locale;
  // Save to storage for persistence
  try {
    await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, locale);
  } catch (error) {
    console.error('Failed to save language preference:', error);
  }
  // Notify all listeners that locale changed
  localeChangeListeners.forEach((listener) => listener());
}

export function onLocaleChange(listener: () => void) {
  localeChangeListeners.push(listener);
  return () => {
    localeChangeListeners = localeChangeListeners.filter((l) => l !== listener);
  };
}

export function getCurrentLocale(): string {
  return i18n.locale;
}

// Initialize locale from saved preference or device locale
export async function initializeLocale() {
  try {
    const savedLanguage = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
    if (
      savedLanguage &&
      (savedLanguage === 'en' || savedLanguage === 'tr' || savedLanguage === 'nl')
    ) {
      i18n.locale = savedLanguage;
    } else {
      // Fall back to device language or English
      const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'en';
      i18n.locale = deviceLanguage === 'tr' || deviceLanguage === 'nl' ? deviceLanguage : 'en';
    }
  } catch (error) {
    console.error('Failed to load language preference:', error);
    // Fall back to device language or English
    const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'en';
    i18n.locale = deviceLanguage === 'tr' || deviceLanguage === 'nl' ? deviceLanguage : 'en';
  }
}

export default i18n;
