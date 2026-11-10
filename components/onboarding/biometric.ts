/**
 * Human labels for the device's biometric method, from `getBiometricType()`.
 *
 * @example
 * const info = biometricInfo(await getBiometricType());
 * // { label: 'Fingerprint', useLabel: 'Use fingerprint' }
 */
import { Platform } from 'react-native';
import i18n from '@/lib/i18n';

export interface BiometricInfo {
  /** "Face ID", "Fingerprint" (used in sentences: "Use {{method}} to continue."). */
  label: string;
  /** Short action for the quiet PinPad key: "Use fingerprint". */
  useLabel: string;
}

function info(key: string): BiometricInfo {
  return {
    label: i18n.t(`ui.onboarding.biometric.${key}`),
    useLabel: i18n.t(`ui.onboarding.biometric.use.${key}`),
  };
}

export function biometricInfo(types: string[]): BiometricInfo {
  if (types.includes('face')) return info(Platform.OS === 'ios' ? 'faceId' : 'faceUnlock');
  if (types.includes('fingerprint')) return info('fingerprint');
  if (types.includes('iris')) return info('iris');
  return info('generic');
}

/** Labels for unlocking with the phone's own passcode (biometrics removed, no PIN). */
export function passcodeInfo(): BiometricInfo {
  return info('passcode');
}

const CANCELLED = ['user_cancel', 'system_cancel', 'app_cancel'];

/** True when the biometric prompt was dismissed by the user/system (not a real failure). */
export function isBiometricCancel(error?: string): boolean {
  return !!error && CANCELLED.includes(error);
}
