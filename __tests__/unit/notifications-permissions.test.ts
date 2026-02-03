import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requestNotificationPermissions, checkNotificationPermissions } from '@/lib/notifications/permissions';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Mock expo-notifications
vi.mock('expo-notifications', () => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  AndroidImportance: {
    MAX: 'max',
    HIGH: 'high',
    DEFAULT: 'default',
    LOW: 'low',
    MIN: 'min',
    NONE: 'none',
  },
}));

// Mock Platform
vi.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

describe('Notification Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkNotificationPermissions', () => {
    it('should return true when permissions are granted', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      });

      const result = await checkNotificationPermissions();
      expect(result).toBe(true);
    });

    it('should return false when permissions are not granted', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
        expires: 'never',
      });

      const result = await checkNotificationPermissions();
      expect(result).toBe(false);
    });
  });

  describe('requestNotificationPermissions', () => {
    it('should return true when permissions are already granted', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      });

      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should request permissions when not granted', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        expires: 'never',
      });
      vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      });

      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should set notification channel on Android when granted', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        expires: 'never',
      });
      vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      });

      await requestNotificationPermissions();
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('medication_reminders', expect.any(Object));
    });

    it('should return false when permissions are denied', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        expires: 'never',
      });
      vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
        expires: 'never',
      });

      const result = await requestNotificationPermissions();
      expect(result).toBe(false);
    });
  });
});
