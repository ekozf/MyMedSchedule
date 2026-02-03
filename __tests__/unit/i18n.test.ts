import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setLocale, getCurrentLocale, onLocaleChange } from '@/lib/i18n';
import * as Localization from 'expo-localization';

// Mock expo-localization
vi.mock('expo-localization', () => ({
  getLocales: vi.fn(() => [{ languageCode: 'en' }]),
}));

describe('i18n', () => {
  beforeEach(() => {
    // Reset locale to default
    setLocale('en');
  });

  describe('setLocale', () => {
    it('should set the locale', () => {
      setLocale('tr');
      expect(getCurrentLocale()).toBe('tr');
    });

    it('should notify listeners when locale changes', () => {
      const listener = vi.fn();
      const unsubscribe = onLocaleChange(listener);

      setLocale('nl');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      setLocale('en');
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again after unsubscribe
    });
  });

  describe('getCurrentLocale', () => {
    it('should return the current locale', () => {
      setLocale('tr');
      expect(getCurrentLocale()).toBe('tr');
    });
  });

  describe('onLocaleChange', () => {
    it('should register and call listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = onLocaleChange(listener1);
      const unsubscribe2 = onLocaleChange(listener2);

      setLocale('nl');
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      unsubscribe1();
      setLocale('en');
      expect(listener1).toHaveBeenCalledTimes(1); // Should not be called again
      expect(listener2).toHaveBeenCalledTimes(2); // Should still be called
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = onLocaleChange(listener);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      setLocale('tr');
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
