import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { constantTimeEqual, hashPIN, isPINHash, verifyPINHash } from './pin-hash';

/** Salted hash of the PIN (see pin-hash.ts). */
export const PIN_HASH_KEY = 'user_pin_hash';
/** Plaintext PIN written by versions before the hash; migrated and deleted on first use. */
export const LEGACY_PIN_KEY = 'user_pin';
/** Number of digits in the PIN (not secret): lets the PIN pad submit on its own. */
export const PIN_LENGTH_KEY = 'user_pin_length';
export const AUTH_METHOD_KEY = 'auth_method';

export type AuthMethod = 'biometric' | 'pin' | 'none';

// ============================================================================
// Check Device Capabilities
// ============================================================================

export async function isDeviceSupportsBiometric(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function getBiometricType(): Promise<string[]> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return types.map((type) => {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'fingerprint';
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'face';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'iris';
      default:
        return 'unknown';
    }
  });
}

// ============================================================================
// Authentication Methods Storage
// ============================================================================

export async function getAuthMethod(): Promise<AuthMethod> {
  const method = await SecureStore.getItemAsync(AUTH_METHOD_KEY);
  return (method as AuthMethod) || 'none';
}

export async function setAuthMethod(method: AuthMethod): Promise<void> {
  await SecureStore.setItemAsync(AUTH_METHOD_KEY, method);
}

// ============================================================================
// PIN Management
// ============================================================================

/**
 * Stores a salted, stretched hash of the PIN (lib/auth/pin-hash.ts) plus its length. Any plaintext
 * PIN left by an older version is removed.
 */
export async function setPIN(pin: string): Promise<void> {
  if (pin.length < 4) {
    throw new Error('PIN must be at least 4 digits');
  }
  const hash = await hashPIN(pin);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
  await SecureStore.setItemAsync(PIN_LENGTH_KEY, String(pin.length));
  await SecureStore.deleteItemAsync(LEGACY_PIN_KEY);
}

/**
 * Length of the stored PIN, or null when unknown (no PIN, or a PIN set by an older version that
 * didn't store its length: the lock screen then keeps its "Open" button).
 */
export async function getPINLength(): Promise<number | null> {
  const raw = await SecureStore.getItemAsync(PIN_LENGTH_KEY);
  const n = raw == null ? NaN : parseInt(raw, 10);
  return Number.isInteger(n) && n >= 4 && n <= 6 ? n : null;
}

/**
 * Checks a PIN against the stored hash. Older installs stored the PIN as plain text under
 * `user_pin`: a correct entry then replaces it with a hash (and deletes the plain text).
 * Does not rate-limit by itself — callers use components/onboarding/pin-guard.ts.
 */
export async function verifyPIN(pin: string): Promise<boolean> {
  const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (isPINHash(storedHash)) {
    return verifyPINHash(pin, storedHash);
  }

  const legacy = await SecureStore.getItemAsync(LEGACY_PIN_KEY);
  if (legacy == null) return false;
  const ok = constantTimeEqual(legacy, pin);
  if (ok) {
    try {
      await setPIN(pin); // migrate: hash + length, plaintext removed
    } catch (error) {
      console.warn('Could not migrate the stored PIN to a hash:', error);
    }
  }
  return ok;
}

export async function hasPIN(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (hash !== null && hash !== undefined) return true;
  const legacy = await SecureStore.getItemAsync(LEGACY_PIN_KEY);
  return legacy !== null && legacy !== undefined;
}

export async function deletePIN(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await SecureStore.deleteItemAsync(LEGACY_PIN_KEY);
  await SecureStore.deleteItemAsync(PIN_LENGTH_KEY);
}

// ============================================================================
// Biometric Authentication
// ============================================================================

export interface BiometricAuthOptions {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
}

export async function authenticateWithBiometric(
  options?: BiometricAuthOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options?.promptMessage || 'Authenticate to access your medications',
      cancelLabel: options?.cancelLabel || 'Cancel',
      fallbackLabel: options?.fallbackLabel || 'Use PIN',
      disableDeviceFallback: options?.disableDeviceFallback ?? false,
    });

    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Authentication error',
    };
  }
}

// ============================================================================
// Main Authentication Flow
// ============================================================================

export async function authenticate(
  options?: BiometricAuthOptions
): Promise<{ success: boolean; error?: string; method?: AuthMethod }> {
  const authMethod = await getAuthMethod();

  if (authMethod === 'none') {
    return { success: true, method: 'none' };
  }

  if (authMethod === 'biometric') {
    const biometricSupported = await isDeviceSupportsBiometric();

    if (biometricSupported) {
      const result = await authenticateWithBiometric(options);
      return { ...result, method: 'biometric' };
    } else {
      // Fallback to PIN if biometric is not available
      const hasPinStored = await hasPIN();
      if (hasPinStored) {
        return {
          success: false,
          error: 'Biometric not available, please use PIN',
          method: 'pin',
        };
      } else {
        return {
          success: false,
          error: 'No authentication method available',
        };
      }
    }
  }

  if (authMethod === 'pin') {
    // PIN authentication needs to be handled in UI
    return {
      success: false,
      error: 'PIN authentication required',
      method: 'pin',
    };
  }

  return { success: false, error: 'Unknown authentication method' };
}

// ============================================================================
// Setup Functions
// ============================================================================

export async function setupBiometricAuth(): Promise<{ success: boolean; error?: string }> {
  const supported = await isDeviceSupportsBiometric();

  if (!supported) {
    return {
      success: false,
      error: 'Biometric authentication is not available on this device',
    };
  }

  // Test authentication
  const result = await authenticateWithBiometric({
    promptMessage: 'Verify your biometric to enable authentication',
  });

  if (result.success) {
    await setAuthMethod('biometric');
    return { success: true };
  }

  return result;
}

export async function setupPINAuth(pin: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (pin.length < 4 || pin.length > 6) {
      return {
        success: false,
        error: 'PIN must be between 4 and 6 digits',
      };
    }

    if (!/^\d+$/.test(pin)) {
      return {
        success: false,
        error: 'PIN must contain only numbers',
      };
    }

    await setPIN(pin);
    await setAuthMethod('pin');
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to set up PIN',
    };
  }
}

export async function disableAuth(): Promise<void> {
  await setAuthMethod('none');
  await deletePIN();
}

// ============================================================================
// Change Authentication Method
// ============================================================================

export async function changeAuthMethod(
  newMethod: AuthMethod,
  pin?: string
): Promise<{ success: boolean; error?: string }> {
  if (newMethod === 'none') {
    await disableAuth();
    return { success: true };
  }

  if (newMethod === 'biometric') {
    return await setupBiometricAuth();
  }

  if (newMethod === 'pin') {
    if (!pin) {
      return { success: false, error: 'PIN is required' };
    }
    return await setupPINAuth(pin);
  }

  return { success: false, error: 'Invalid authentication method' };
}

// ============================================================================
// Re-confirm identity (outside the lock screen, e.g. before "Delete all data")
// ============================================================================

/**
 * - `confirmed`: no lock is set, or biometrics / the phone's passcode succeeded.
 * - `needs-pin`: the person must type their PIN — show a PinPad and check it with `verifyPIN`
 *   (rate-limit with `registerPinFailure` / `useCooldownSeconds` from components/onboarding).
 * - `cancelled`: the person dismissed the prompt.
 * - `failed`: biometrics failed or are locked out.
 */
export type IdentityResult = 'confirmed' | 'needs-pin' | 'cancelled' | 'failed';

const CANCEL_ERRORS = new Set(['user_cancel', 'system_cancel', 'app_cancel']);

/**
 * Asks the person to prove it's them before a destructive action. Biometric lock: shows the
 * system prompt right away (works from any screen). PIN lock — or biometric lock where the person
 * taps "Use PIN" / biometrics are gone but a PIN exists — resolves `needs-pin`: the UI then asks for
 * the PIN itself. Biometric lock with neither biometrics nor a PIN left: falls back to the phone's
 * passcode, like the lock screen does.
 *
 * @example
 * const r = await confirmIdentity({ promptMessage: t('confirmDelete') });
 * if (r === 'needs-pin') openPinSheet(async (pin) => (await verifyPIN(pin)) && wipe());
 * else if (r === 'confirmed') wipe();
 */
export async function confirmIdentity(options?: BiometricAuthOptions): Promise<IdentityResult> {
  const method = await getAuthMethod();
  if (method === 'none') return 'confirmed';
  if (method === 'pin') return (await hasPIN()) ? 'needs-pin' : 'confirmed';

  const pinStored = await hasPIN();
  if (!(await isDeviceSupportsBiometric())) {
    if (pinStored) return 'needs-pin';
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options?.promptMessage || 'Confirm it’s you',
        cancelLabel: options?.cancelLabel || 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) return 'confirmed';
      return CANCEL_ERRORS.has((result as any).error) ? 'cancelled' : 'failed';
    } catch {
      return 'failed';
    }
  }

  const result = await authenticateWithBiometric(options);
  if (result.success) return 'confirmed';
  if (result.error === 'user_fallback' && pinStored) return 'needs-pin';
  if (result.error && CANCEL_ERRORS.has(result.error)) return 'cancelled';
  return 'failed';
}
