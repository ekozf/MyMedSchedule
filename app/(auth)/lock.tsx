/**
 * Lock screen. PIN: PinPad (auto-submit at 6 digits, Unlock key from 4), 30 s cool-down after 5
 * wrong tries. Biometric: auto-prompt on mount with a "Use PIN instead" fallback when a PIN is
 * stored. Biometric lock but the phone no longer has biometrics and there is no PIN: unlock with
 * the phone's own passcode instead (retry button stays). No lock: straight to Today (as before).
 */
import * as React from 'react';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { KeyRound } from 'lucide-react-native';
import { useStore } from '@/store';
import {
  authenticate,
  getAuthMethod,
  getBiometricType,
  hasPIN,
  isDeviceSupportsBiometric,
  verifyPIN,
} from '@/lib/auth';
import i18n from '@/lib/i18n';
import {
  LockView,
  ONBOARDING_ROUTES,
  biometricInfo,
  isBiometricCancel,
  registerPinFailure,
  registerPinSuccess,
  useCooldownSeconds,
  type BiometricInfo,
} from '@/components/onboarding';

const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(`ui.onboarding.lock.${key}`, opts);

type Mode = 'loading' | 'pin' | 'biometric';

/** The "biometric" button, relabelled for the phone passcode. */
const passcodeInfo = (): BiometricInfo => ({
  label: i18n.t('ui.onboarding.biometric.passcode'),
  icon: KeyRound,
});

export default function LockScreen() {
  const setAuthenticated = useStore((s) => s.setAuthenticated);
  const activeProfile = useStore((s) => s.activeProfile);
  const cooldownSeconds = useCooldownSeconds();

  const [mode, setMode] = React.useState<Mode>('loading');
  /** Method stored in settings — biometric users can still switch to their PIN. */
  const [method, setMethod] = React.useState<'pin' | 'biometric' | null>(null);
  const [biometric, setBiometric] = React.useState<BiometricInfo | null>(null);
  const [pinAvailable, setPinAvailable] = React.useState(false);
  const [biometricBusy, setBiometricBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const [pin, setPin] = React.useState('');
  const [pinError, setPinError] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const clearTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptingRef = React.useRef(false);
  const unlockedRef = React.useRef(false);
  /** Biometrics are gone and no PIN exists: the button asks for the phone's passcode. */
  const passcodeRef = React.useRef(false);

  React.useEffect(
    () => () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    },
    []
  );

  const unlock = React.useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    registerPinSuccess();
    setAuthenticated(true);
    router.replace(ONBOARDING_ROUTES.dashboard);
  }, [setAuthenticated]);

  const promptPasscode = React.useCallback(async () => {
    if (promptingRef.current) return;
    promptingRef.current = true;
    setBiometricBusy(true);
    setMessage(null);
    let success = false;
    let error: string | undefined;
    try {
      // disableDeviceFallback: false → the OS offers the phone's passcode / pattern.
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('biometricPrompt', { appName: i18n.t('ui.onboarding.appName') }),
        cancelLabel: i18n.t('ui.common.cancel'),
        disableDeviceFallback: false,
      });
      success = result.success;
      if (!result.success) error = result.error;
    } catch (e) {
      console.warn('Passcode unlock failed:', e);
    }
    promptingRef.current = false;
    setBiometricBusy(false);
    if (success) {
      unlock();
      return;
    }
    if (isBiometricCancel(error)) return;
    setMessage(t('passcodeFailed'));
  }, [unlock]);

  const switchToPasscode = React.useCallback(() => {
    passcodeRef.current = true;
    setBiometric(passcodeInfo());
    promptPasscode();
  }, [promptPasscode]);

  const promptBiometric = React.useCallback(
    async (info: BiometricInfo | null, pinStored: boolean) => {
      if (promptingRef.current) return;
      promptingRef.current = true;
      setBiometricBusy(true);
      setMessage(null);
      const result = await authenticate({
        promptMessage: t('biometricPrompt', { appName: i18n.t('ui.onboarding.appName') }),
        cancelLabel: i18n.t('ui.common.cancel'),
      });
      promptingRef.current = false;
      setBiometricBusy(false);

      if (result.success) {
        unlock();
        return;
      }
      const label = info?.label ?? i18n.t('ui.onboarding.biometric.generic');
      if (result.method === 'pin' || (result.error === 'user_fallback' && pinStored)) {
        // Biometrics unavailable, or the user asked for the fallback: use the stored PIN.
        if (pinStored) {
          setMode('pin');
          if (result.method === 'pin') setMessage(t('biometricUnavailable', { method: label }));
          return;
        }
      }
      if (!pinStored && result.method === undefined) {
        // No usable method (biometrics removed from the phone, no PIN): the phone's passcode.
        let supported = true;
        try {
          supported = await isDeviceSupportsBiometric();
        } catch {
          supported = false;
        }
        if (!supported) {
          switchToPasscode();
          return;
        }
      }
      if (isBiometricCancel(result.error) || result.error === 'user_fallback') return;
      if (result.error === 'lockout') {
        setMessage(t('biometricLockedOut', { method: label }));
        return;
      }
      setMessage(t('biometricFailed'));
    },
    [unlock, switchToPasscode]
  );

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const stored = await getAuthMethod();
      if (!alive) return;
      if (stored === 'none') {
        // No lock configured: go straight in (as before).
        unlock();
        return;
      }
      if (stored === 'pin') {
        setMethod('pin');
        setPinAvailable(true);
        setMode('pin');
        return;
      }
      let info: BiometricInfo = biometricInfo([]);
      let pinStored = false;
      let supported = true;
      try {
        const [types, has, ok] = await Promise.all([
          getBiometricType(),
          hasPIN(),
          isDeviceSupportsBiometric(),
        ]);
        info = biometricInfo(types);
        pinStored = has;
        supported = ok;
      } catch (error) {
        console.error('Failed to read biometric state:', error);
      }
      if (!alive) return;
      setMethod('biometric');
      setBiometric(info);
      setPinAvailable(pinStored);
      setMode('biometric');
      if (!supported && !pinStored) switchToPasscode();
      else promptBiometric(info, pinStored);
    })();
    return () => {
      alive = false;
    };
  }, [promptBiometric, switchToPasscode, unlock]);

  // ---------------------------------------------------------------------------
  // PIN
  // ---------------------------------------------------------------------------

  const submitPin = async (value: string) => {
    if (verifying || cooldownSeconds > 0 || value.length < 4) return;
    setVerifying(true);
    const ok = await verifyPIN(value);
    setVerifying(false);
    if (ok) {
      unlock();
      return;
    }
    const cooling = registerPinFailure();
    setPinError(true); // PinPad shakes + error haptic
    setMessage(cooling ? null : t('wrongPin'));
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setPin(''), 450);
  };

  const onPinChange = (raw: string) => {
    let value = raw;
    if (pinError) {
      // Typing again after a wrong PIN starts a fresh entry.
      if (clearTimer.current) clearTimeout(clearTimer.current);
      value = raw.length > pin.length ? raw.slice(-1) : '';
      setPinError(false);
    }
    setPin(value);
    if (message) setMessage(null);
    if (value.length === 6) submitPin(value);
  };

  const firstName = activeProfile?.name ?? null;

  return (
    <LockView
      mode={mode}
      name={firstName}
      biometric={biometric}
      biometricBusy={biometricBusy}
      onBiometric={
        method === 'biometric'
          ? () => {
              setMode('biometric');
              if (passcodeRef.current) promptPasscode();
              else promptBiometric(biometric, pinAvailable);
            }
          : undefined
      }
      onUsePin={
        mode === 'biometric' && pinAvailable
          ? () => {
              setMessage(null);
              setPin('');
              setPinError(false);
              setMode('pin');
            }
          : undefined
      }
      pin={pin}
      onPinChange={onPinChange}
      onPinSubmit={submitPin}
      pinError={pinError}
      verifying={verifying}
      message={message}
      cooldownSeconds={cooldownSeconds}
    />
  );
}
