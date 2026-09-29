/**
 * Current app-lock method, resolved to what the person actually uses (Face ID, Touch ID, …).
 */
import { Platform } from 'react-native';
import { Fingerprint, KeyRound, LockOpen, ScanFace, type LucideIcon } from 'lucide-react-native';
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
  switch (kind) {
    case 'face':
      return i18n.t(ios ? 'ui.you.security.lock.faceId' : 'ui.you.security.lock.faceUnlock');
    case 'fingerprint':
      return i18n.t(ios ? 'ui.you.security.lock.touchId' : 'ui.you.security.lock.fingerprint');
    case 'biometric':
      return i18n.t('ui.you.security.lock.biometrics');
    case 'pin':
      return i18n.t('ui.you.security.lock.pin');
    default:
      return i18n.t('ui.you.security.lock.off');
  }
}

export function appLockIcon(kind: AppLockKind): LucideIcon {
  switch (kind) {
    case 'face':
      return ScanFace;
    case 'fingerprint':
    case 'biometric':
      return Fingerprint;
    case 'pin':
      return KeyRound;
    default:
      return LockOpen;
  }
}
