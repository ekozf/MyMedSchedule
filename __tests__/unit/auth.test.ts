import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isDeviceSupportsBiometric,
  getBiometricType,
  getAuthMethod,
  setAuthMethod,
  setPIN,
  verifyPIN,
  hasPIN,
  deletePIN,
  authenticateWithBiometric,
  authenticate,
  setupBiometricAuth,
  setupPINAuth,
  disableAuth,
  changeAuthMethod,
} from '@/lib/auth/index';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// Mock expo-local-authentication
vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  supportedAuthenticationTypesAsync: vi.fn(),
  authenticateAsync: vi.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

// Mock expo-secure-store
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

describe('Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isDeviceSupportsBiometric', () => {
    it('should return true when hardware is available and enrolled', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);

      const result = await isDeviceSupportsBiometric();
      expect(result).toBe(true);
    });

    it('should return false when hardware is not available', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);

      const result = await isDeviceSupportsBiometric();
      expect(result).toBe(false);
    });

    it('should return false when not enrolled', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);

      const result = await isDeviceSupportsBiometric();
      expect(result).toBe(false);
    });
  });

  describe('getBiometricType', () => {
    it('should return fingerprint type', async () => {
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const types = await getBiometricType();
      expect(types).toContain('fingerprint');
    });

    it('should return face type', async () => {
      vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const types = await getBiometricType();
      expect(types).toContain('face');
    });
  });

  describe('getAuthMethod', () => {
    it('should return stored auth method', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('biometric');

      const method = await getAuthMethod();
      expect(method).toBe('biometric');
    });

    it('should return none when no method is stored', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);

      const method = await getAuthMethod();
      expect(method).toBe('none');
    });
  });

  describe('setAuthMethod', () => {
    it('should store auth method', async () => {
      await setAuthMethod('pin');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_method', 'pin');
    });
  });

  describe('setPIN', () => {
    it('should store PIN when valid', async () => {
      await setPIN('1234');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_pin', '1234');
    });

    it('should throw error when PIN is too short', async () => {
      await expect(setPIN('123')).rejects.toThrow('PIN must be at least 4 digits');
    });
  });

  describe('verifyPIN', () => {
    it('should return true when PIN matches', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('1234');

      const result = await verifyPIN('1234');
      expect(result).toBe(true);
    });

    it('should return false when PIN does not match', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('1234');

      const result = await verifyPIN('5678');
      expect(result).toBe(false);
    });
  });

  describe('hasPIN', () => {
    it('should return true when PIN exists', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('1234');

      const result = await hasPIN();
      expect(result).toBe(true);
    });

    it('should return false when PIN does not exist', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);

      const result = await hasPIN();
      expect(result).toBe(false);
    });
  });

  describe('deletePIN', () => {
    it('should delete PIN from storage', async () => {
      await deletePIN();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_pin');
    });
  });

  describe('authenticateWithBiometric', () => {
    it('should return success when authentication succeeds', async () => {
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
        success: true,
        warning: undefined,
        error: undefined,
      });

      const result = await authenticateWithBiometric();
      expect(result.success).toBe(true);
    });

    it('should return error when authentication fails', async () => {
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
        success: false,
        warning: undefined,
        error: 'User canceled',
      });

      const result = await authenticateWithBiometric();
      expect(result.success).toBe(false);
      expect(result.error).toBe('User canceled');
    });
  });

  describe('authenticate', () => {
    it('should use biometric when method is biometric', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('biometric');
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
        success: true,
        warning: undefined,
        error: undefined,
      });

      const result = await authenticate();
      expect(result.success).toBe(true);
      expect(result.method).toBe('biometric');
    });

    it('should return success when method is none', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('none');

      const result = await authenticate();
      expect(result.success).toBe(true);
      expect(result.method).toBe('none');
    });

    it('should return error when biometric not available and no PIN', async () => {
      vi.mocked(SecureStore.getItemAsync)
        .mockResolvedValueOnce('biometric') // getAuthMethod
        .mockResolvedValueOnce(null); // hasPIN
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);

      const result = await authenticate();
      expect(result.success).toBe(false);
    });
  });

  describe('setupBiometricAuth', () => {
    it('should set auth method when biometric is supported', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
        success: true,
        warning: undefined,
        error: undefined,
      });

      const result = await setupBiometricAuth();
      expect(result.success).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_method', 'biometric');
    });

    it('should return error when biometric not supported', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);

      const result = await setupBiometricAuth();
      expect(result.success).toBe(false);
    });
  });

  describe('setupPINAuth', () => {
    it('should set PIN and auth method when valid', async () => {
      const result = await setupPINAuth('1234');
      expect(result.success).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_pin', '1234');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_method', 'pin');
    });

    it('should return error when PIN is too short', async () => {
      const result = await setupPINAuth('123');
      expect(result.success).toBe(false);
    });

    it('should return error when PIN is too long', async () => {
      const result = await setupPINAuth('1234567');
      expect(result.success).toBe(false);
    });

    it('should return error when PIN contains non-digits', async () => {
      const result = await setupPINAuth('12ab');
      expect(result.success).toBe(false);
    });
  });

  describe('disableAuth', () => {
    it('should set auth method to none and delete PIN', async () => {
      await disableAuth();
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_method', 'none');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_pin');
    });
  });

  describe('changeAuthMethod', () => {
    it('should change to none', async () => {
      const result = await changeAuthMethod('none');
      expect(result.success).toBe(true);
    });

    it('should change to biometric', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
        success: true,
        warning: undefined,
        error: undefined,
      });

      const result = await changeAuthMethod('biometric');
      expect(result.success).toBe(true);
    });

    it('should change to PIN', async () => {
      const result = await changeAuthMethod('pin', '1234');
      expect(result.success).toBe(true);
    });

    it('should return error when PIN is required but not provided', async () => {
      const result = await changeAuthMethod('pin');
      expect(result.success).toBe(false);
    });
  });
});
