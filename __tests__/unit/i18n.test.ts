import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setLocale, getCurrentLocale, onLocaleChange, initializeLocale } from '@/lib/i18n';
import * as Localization from 'expo-localization';

// Mock expo-localization
vi.mock('expo-localization', () => ({
  getLocales: vi.fn(() => [{ languageCode: 'en' }]),
}));

// Mock expo-secure-store
vi.mock('expo-secure-store', () => ({
  setItemAsync: vi.fn(() => Promise.resolve()),
  getItemAsync: vi.fn(() => Promise.resolve(null)),
  deleteItemAsync: vi.fn(() => Promise.resolve()),
}));

describe('i18n', () => {
  beforeEach(() => {
    // Reset locale to default
    vi.clearAllMocks();
  });

  describe('setLocale', () => {
    it('should set the locale', async () => {
      await setLocale('tr');
      expect(getCurrentLocale()).toBe('tr');
    });

    it('should save locale to storage', async () => {
      const SecureStore = await import('expo-secure-store');
      await setLocale('tr');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_language', 'tr');
    });

    it('should notify listeners when locale changes', async () => {
      const listener = vi.fn();
      const unsubscribe = onLocaleChange(listener);

      await setLocale('nl');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      await setLocale('en');
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again after unsubscribe
    });
  });

  describe('getCurrentLocale', () => {
    it('should return the current locale', async () => {
      await setLocale('tr');
      expect(getCurrentLocale()).toBe('tr');
    });
  });

  describe('onLocaleChange', () => {
    it('should register and call listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = onLocaleChange(listener1);
      const unsubscribe2 = onLocaleChange(listener2);

      await setLocale('nl');
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      unsubscribe1();
      await setLocale('en');
      expect(listener1).toHaveBeenCalledTimes(1); // Should not be called again
      expect(listener2).toHaveBeenCalledTimes(2); // Should still be called
    });

    it('should return unsubscribe function', async () => {
      const listener = vi.fn();
      const unsubscribe = onLocaleChange(listener);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      await setLocale('tr');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('initializeLocale', () => {
    it('should load saved language from storage', async () => {
      const SecureStore = await import('expo-secure-store');
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('tr');

      await initializeLocale();
      expect(getCurrentLocale()).toBe('tr');
    });

    it('should fall back to device language if no saved preference', async () => {
      const SecureStore = await import('expo-secure-store');
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
      vi.mocked(Localization.getLocales).mockReturnValue([{ languageCode: 'nl' }] as any);

      await initializeLocale();
      expect(getCurrentLocale()).toBe('nl');
    });

    it('should fall back to English for unsupported languages', async () => {
      const SecureStore = await import('expo-secure-store');
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
      vi.mocked(Localization.getLocales).mockReturnValue([{ languageCode: 'fr' }] as any);

      await initializeLocale();
      expect(getCurrentLocale()).toBe('en');
    });
  });
});
