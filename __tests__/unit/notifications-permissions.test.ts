import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  requestNotificationPermissions,
  checkNotificationPermissions,
  getNotificationPermissionState,
} from '@/lib/notifications/permissions';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PermissionStatus } from 'expo-modules-core';

// This suite runs in Node, without Expo's native runtime.
vi.mock('expo-modules-core', () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

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
        status: PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      } as any);

      const result = await checkNotificationPermissions();
      expect(result).toBe(true);
    });

    it('should return false when permissions are not granted', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: PermissionStatus.DENIED,
        canAskAgain: false,
        expires: 'never',
      } as any);

      const result = await checkNotificationPermissions();
      expect(result).toBe(false);
    });
  });

  describe('getNotificationPermissionState', () => {
    const mockPermissions = (p: { status: string; granted: boolean; canAskAgain: boolean }) =>
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        expires: 'never',
        ...p,
      } as any);

    it('granted', async () => {
      mockPermissions({ status: 'granted', granted: true, canAskAgain: true });
      expect(await getNotificationPermissionState()).toBe('granted');
    });

    it('never asked on iOS / older Android: undetermined', async () => {
      mockPermissions({ status: 'undetermined', granted: false, canAskAgain: true });
      expect(await getNotificationPermissionState()).toBe('undetermined');
    });

    it('Android 13+ before the first ask ("denied" but askable): undetermined', async () => {
      mockPermissions({ status: 'denied', granted: false, canAskAgain: true });
      expect(await getNotificationPermissionState()).toBe('undetermined');
    });

    it('denied and the OS will not ask again: denied', async () => {
      mockPermissions({ status: 'denied', granted: false, canAskAgain: false });
      expect(await getNotificationPermissionState()).toBe('denied');
    });

    it('not granted and not askable, whatever the status: denied', async () => {
      mockPermissions({ status: 'undetermined', granted: false, canAskAgain: false });
      expect(await getNotificationPermissionState()).toBe('denied');
    });
  });

  describe('requestNotificationPermissions', () => {
    it('Android 13+ before the first ask: can plan without prompting', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: PermissionStatus.DENIED,
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as any);

      expect(await requestNotificationPermissions()).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should return true when permissions are already granted', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      } as any);

      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should request permissions when not granted', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: PermissionStatus.UNDETERMINED,
        canAskAgain: true,
        expires: 'never',
      } as any);
      vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
        status: PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      } as any);

      const result = await requestNotificationPermissions({ prompt: true });
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('never shows the OS dialog without prompt (the app explains first)', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: PermissionStatus.UNDETERMINED,
        canAskAgain: true,
        expires: 'never',
      } as any);

      const result = await requestNotificationPermissions();
      expect(result).toBe(true); // not decided yet: reminders can still be planned
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    });

    it('returns false without prompting when already denied', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: PermissionStatus.DENIED,
        canAskAgain: false,
        expires: 'never',
      } as any);

      expect(await requestNotificationPermissions()).toBe(false);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should set notification channel on Android when granted', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: PermissionStatus.UNDETERMINED,
        canAskAgain: true,
        expires: 'never',
      } as any);
      vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
        status: PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      } as any);

      await requestNotificationPermissions({ prompt: true });
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'medication_reminders',
        expect.any(Object)
      );
    });

    it('should return false when permissions are denied', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: PermissionStatus.UNDETERMINED,
        canAskAgain: true,
        expires: 'never',
      } as any);
      vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
        status: PermissionStatus.DENIED,
        canAskAgain: false,
        expires: 'never',
      } as any);

      const result = await requestNotificationPermissions({ prompt: true });
      expect(result).toBe(false);
    });
  });
});
