/**
 * Human label + icon for the device's biometric method, from `getBiometricType()`.
 *
 * @example
 * const info = biometricInfo(await getBiometricType()); // { label: 'Face ID', icon: ScanFace }
 */
import { Platform } from 'react-native';
import { Eye, Fingerprint, ScanFace, type LucideIcon } from 'lucide-react-native';
import i18n from '@/lib/i18n';

export interface BiometricInfo {
  label: string;
  icon: LucideIcon;
}

export function biometricInfo(types: string[]): BiometricInfo {
  const t = (k: string) => i18n.t(`ui.onboarding.biometric.${k}`);
  if (types.includes('face')) {
    return { label: t(Platform.OS === 'ios' ? 'faceId' : 'faceUnlock'), icon: ScanFace };
  }
  if (types.includes('fingerprint')) return { label: t('fingerprint'), icon: Fingerprint };
  if (types.includes('iris')) return { label: t('iris'), icon: Eye };
  return { label: t('generic'), icon: Fingerprint };
}

const CANCELLED = ['user_cancel', 'system_cancel', 'app_cancel'];

/** True when the biometric prompt was dismissed by the user/system (not a real failure). */
export function isBiometricCancel(error?: string): boolean {
  return !!error && CANCELLED.includes(error);
}
