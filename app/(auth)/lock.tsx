/**
 * Lock screen. PIN: PinPad that submits itself once the stored PIN length is reached (older
 * installs without a stored length: "Open" button from 4, auto-submit at 6), 30 s cool-down after 5
 * wrong tries. A wrong PIN shakes the dots, shows them in red for 600 ms, then clears them. Biometric: auto-prompt on mount with a "Use PIN instead" fallback when a PIN is
 * stored. Biometric lock but the phone no longer has biometrics and there is no PIN: unlock with
 * the phone's own passcode instead (retry button stays). No lock: straight to Today (as before).
 * Unlocking opens Today, or first the updated "Good to know" when its version changed.
 */
import * as React from 'react';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useStore } from '@/store';
import {
  authenticate,
  getAuthMethod,
  getBiometricType,
  getPINLength,
  hasPIN,
  isDeviceSupportsBiometric,
  verifyPIN,
} from '@/lib/auth';
import i18n from '@/lib/i18n';
import {
  LockView,
  PIN_ERROR_FLASH_MS,
  ONBOARDING_ROUTES,
  biometricInfo,
  isBiometricCancel,
  passcodeInfo,
  registerPinFailure,
  registerPinSuccess,
  useCooldownSeconds,
  type BiometricInfo,
} from '@/components/onboarding';

const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(`ui.onboarding.lock.${key}`, opts);

type Mode = 'loading' | 'pin' | 'biometric';

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
  const [pinLength, setPinLength] = React.useState<number | null>(null);
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
    // Today, or first the updated "Good to know" when it changed since the last agreement.
    const { disclaimerUpToDate } = useStore.getState();
    router.replace(
      disclaimerUpToDate ? ONBOARDING_ROUTES.dashboard : ONBOARDING_ROUTES.disclaimerUpdated
    );
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
        let length: number | null = null;
        try {
          length = await getPINLength();
        } catch (error) {
          console.warn('Failed to read PIN length:', error);
        }
        if (!alive) return;
        setPinLength(length);
        setMethod('pin');
        setPinAvailable(true);
        setMode('pin');
        return;
      }
      let info: BiometricInfo = biometricInfo([]);
      let pinStored = false;
      let supported = true;
      try {
        const [types, has, ok, length] = await Promise.all([
          getBiometricType(),
          hasPIN(),
          isDeviceSupportsBiometric(),
          getPINLength().catch(() => null),
        ]);
        info = biometricInfo(types);
        pinStored = has;
        supported = ok;
        if (alive) setPinLength(has ? length : null);
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
    setPinError(true); // PinPad shakes the dots (not under Reduce Motion), red, error haptic
    setMessage(cooling ? null : t('wrongPin'));
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => {
      setPin('');
      setPinError(false); // the message stays until the next key
    }, PIN_ERROR_FLASH_MS);
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
    // Known length: the PinPad submits on its own. Unknown (older install): 6 digits submit.
    if (!pinLength && value.length === 6) submitPin(value);
  };

  const firstName = activeProfile?.name ?? null;

  return (
    <LockView
      mode={mode}
      name={firstName}
      avatarUri={activeProfile?.avatarUri}
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
      pinLength={pinLength}
      onPinChange={onPinChange}
      onPinSubmit={submitPin}
      pinError={pinError}
      verifying={verifying}
      message={message}
      cooldownSeconds={cooldownSeconds}
    />
  );
}
