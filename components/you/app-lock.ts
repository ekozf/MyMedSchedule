/**
 * Current app-lock method, resolved to what the person actually uses (Face ID, fingerprint, …),
 * and its short label for the You → Privacy row.
 *
 * @example
 * appLockLabel(await getAppLockKind()); // "PIN"
 */
import { Platform } from 'react-native';
import i18n from '@/lib/i18n';
import { getAuthMethod, getBiometricType } from '@/lib/auth';

export type AppLockKind = 'face' | 'fingerprint' | 'biometric' | 'pin' | 'off';

export async function getAppLockKind(): Promise<AppLockKind> {
  const method = await getAuthMethod();
  if (method === 'pin') return 'pin';
  if (method !== 'biometric') return 'off';
  let types: string[] = [];
  try {
    types = await getBiometricType();
  } catch {
    // Unknown hardware: fall back to the generic label.
  }
  if (types.includes('face')) return 'face';
  if (types.includes('fingerprint')) return 'fingerprint';
  return 'biometric';
}

export function appLockLabel(kind: AppLockKind): string {
  const ios = Platform.OS === 'ios';
  const t = (k: string) => i18n.t(`ui.you.privacy.lock.${k}`);
  switch (kind) {
    case 'face':
      return t(ios ? 'faceId' : 'faceUnlock');
    case 'fingerprint':
      return t(ios ? 'touchId' : 'fingerprint');
    case 'biometric':
      return t('biometrics');
    case 'pin':
      return t('pin');
    default:
      return t('off');
  }
}
