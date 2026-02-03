import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'user_pin';
const AUTH_METHOD_KEY = 'auth_method';

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
  return types.map(type => {
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

export async function setPIN(pin: string): Promise<void> {
  if (pin.length < 4) {
    throw new Error('PIN must be at least 4 digits');
  }
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function verifyPIN(pin: string): Promise<boolean> {
  const storedPin = await SecureStore.getItemAsync(PIN_KEY);
  return storedPin === pin;
}

export async function hasPIN(): Promise<boolean> {
  const pin = await SecureStore.getItemAsync(PIN_KEY);
  return pin !== null;
}

export async function deletePIN(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
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
        error: result.error || 'Authentication failed' 
      };
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Authentication error' 
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
          method: 'pin'
        };
      } else {
        return { 
          success: false, 
          error: 'No authentication method available' 
        };
      }
    }
  }
  
  if (authMethod === 'pin') {
    // PIN authentication needs to be handled in UI
    return { 
      success: false, 
      error: 'PIN authentication required',
      method: 'pin'
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
      error: 'Biometric authentication is not available on this device' 
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
        error: 'PIN must be between 4 and 6 digits' 
      };
    }
    
    if (!/^\d+$/.test(pin)) {
      return { 
        success: false, 
        error: 'PIN must contain only numbers' 
      };
    }
    
    await setPIN(pin);
    await setAuthMethod('pin');
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to set up PIN' 
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
