/**
 * Onboarding step 3, "Keep it private" (choose an app lock, or "Not now"), and the App lock page
 * from You (`?reconfigure=true`, returns with router.back()).
 *
 * App lock first asks for the current PIN / biometrics ("First, confirm it's you"); "No lock"
 * asks "Turn off the lock?" and uses `disableAuth()` so the stored PIN is removed too.
 */
import * as React from 'react';
import { BackHandler } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  authenticate,
  disableAuth,
  getAuthMethod,
  getBiometricType,
  getPINLength,
  hasPIN,
  isDeviceSupportsBiometric,
  setAuthMethod,
  setupBiometricAuth,
  setupPINAuth,
  verifyPIN,
  type AuthMethod,
} from '@/lib/auth';
import i18n from '@/lib/i18n';
import { useConfirm, useToast } from '@/components/ds';
import {
  ONBOARDING_ROUTES,
  PIN_ERROR_FLASH_MS,
  ProtectView,
  biometricInfo,
  isBiometricCancel,
  registerPinFailure,
  registerPinSuccess,
  useCooldownSeconds,
  type BiometricInfo,
  type ProtectBusy,
  type ProtectStage,
} from '@/components/onboarding';

const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(`ui.onboarding.protect.${key}`, opts);

export default function AuthSetupScreen() {
  const params = useLocalSearchParams<{ reconfigure?: string }>();
  const reconfigure = params.reconfigure === 'true';
  const toast = useToast();
  const confirm = useConfirm();
  const cooldownSeconds = useCooldownSeconds();

  const [stage, setStage] = React.useState<ProtectStage>('loading');
  const [biometric, setBiometric] = React.useState<BiometricInfo | null>(null);
  const [current, setCurrent] = React.useState<AuthMethod | null>(null);
  const [pinStored, setPinStored] = React.useState(false);
  /** Length of the stored PIN ("First, confirm it's you" submits on its own); null = unknown. */
  const [storedPinLength, setStoredPinLength] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState<ProtectBusy>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const [pin, setPin] = React.useState('');
  const [firstPin, setFirstPin] = React.useState('');
  const [pinError, setPinError] = React.useState(false);
  const [pinMessage, setPinMessage] = React.useState<string | null>(null);
  const [createHint, setCreateHint] = React.useState<string | null>(null);
  /** "Repeat your PIN" didn't match: keep the first PIN and ask for it again. */
  const [pinMismatch, setPinMismatch] = React.useState(false);
  const clearTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const verifyingRef = React.useRef(false);

  React.useEffect(
    () => () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    },
    []
  );

  const resetPin = () => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setPin('');
    setPinError(false);
    setPinMessage(null);
  };

  /** Wrong entry: shake + red dots (PinPad) for 600 ms, then clear; the message stays. */
  const rejectPin = (msg: string | null) => {
    setPinError(true);
    setPinMessage(msg);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => {
      setPin('');
      setPinError(false);
    }, PIN_ERROR_FLASH_MS);
  };

  // ---------------------------------------------------------------------------
  // Load device + current state
  // ---------------------------------------------------------------------------

  const verifyBiometric = React.useCallback(async (pinAvailable: boolean) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setBusy('verify');
    setMessage(null);
    const result = await authenticate({
      promptMessage: t('verifyTitle'),
      cancelLabel: i18n.t('ui.common.cancel'),
    });
    verifyingRef.current = false;
    setBusy(null);
    if (result.success) {
      setStage('choose');
    } else if (result.method === 'pin') {
      // Biometrics no longer available on this device: fall back to the stored PIN.
      setStage(pinAvailable ? 'verify-pin' : 'choose');
    } else if (!result.method) {
      // No way to verify at all (no biometrics, no PIN): don't trap the user in settings.
      setStage('choose');
    } else if (!isBiometricCancel(result.error)) {
      setMessage(i18n.t('ui.onboarding.lock.biometricFailed'));
    }
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      let info: BiometricInfo | null = null;
      try {
        if (await isDeviceSupportsBiometric()) info = biometricInfo(await getBiometricType());
      } catch (error) {
        console.error('Failed to check biometrics:', error);
      }
      if (!alive) return;
      setBiometric(info);

      if (!reconfigure) {
        setStage('choose');
        return;
      }
      try {
        const [method, has, length] = await Promise.all([
          getAuthMethod(),
          hasPIN(),
          getPINLength().catch(() => null),
        ]);
        if (!alive) return;
        setCurrent(method);
        setPinStored(has);
        setStoredPinLength(has ? length : null);
        if (method === 'pin' && has) {
          setStage('verify-pin');
        } else if (method === 'biometric') {
          setStage('verify-biometric');
          verifyBiometric(has);
        } else {
          setStage('choose');
        }
      } catch (error) {
        console.error('Failed to load auth method:', error);
        if (alive) setStage('choose');
      }
    })();
    return () => {
      alive = false;
    };
  }, [reconfigure, verifyBiometric]);

  // ---------------------------------------------------------------------------
  // Finish
  // ---------------------------------------------------------------------------

  const finish = (method: AuthMethod) => {
    if (!reconfigure) {
      router.replace(ONBOARDING_ROUTES.createProfile);
      return;
    }
    router.back();
    toast.show({
      title:
        method === 'biometric'
          ? t('toast.biometric', { method: biometric?.label ?? '' })
          : method === 'pin'
            ? t('toast.pin')
            : t('toast.off'),
    });
  };

  // ---------------------------------------------------------------------------
  // Choices
  // ---------------------------------------------------------------------------

  const chooseBiometric = async () => {
    if (busy || !biometric) return;
    setBusy('biometric');
    setMessage(null);
    const result = await setupBiometricAuth();
    setBusy(null);
    if (result.success) {
      finish('biometric');
    } else if (!isBiometricCancel(result.error)) {
      setMessage(t('biometricFailed', { method: biometric.label }));
    }
  };

  const choosePin = () => {
    if (busy) return;
    setMessage(null);
    setFirstPin('');
    setCreateHint(null);
    setPinMismatch(false);
    resetPin();
    setStage('pin-create');
  };

  const chooseOff = async () => {
    if (busy) return;
    setMessage(null);
    if (reconfigure && current === 'none') {
      router.back();
      return;
    }
    // Onboarding "Not now" needs no confirmation; turning an existing lock off does.
    if (reconfigure) {
      const ok = await confirm({
        title: t('turnOffTitle'),
        message: t('turnOffMessage'),
        confirmLabel: t('turnOff'),
        tone: 'danger',
      });
      if (!ok) return;
    }
    setBusy('off');
    try {
      if (reconfigure) await disableAuth();
      else await setAuthMethod('none');
    } catch (error) {
      console.error('Failed to turn off app lock:', error);
      setBusy(null);
      setMessage(t('saveFailed'));
      return;
    }
    setBusy(null);
    finish('none');
  };

  // ---------------------------------------------------------------------------
  // PIN pad
  // ---------------------------------------------------------------------------

  const submitVerify = async (value: string) => {
    if (busy || cooldownSeconds > 0) return;
    setBusy('verify');
    const ok = await verifyPIN(value);
    setBusy(null);
    if (ok) {
      registerPinSuccess();
      resetPin();
      setStage('choose');
    } else {
      const cooling = registerPinFailure();
      rejectPin(cooling ? null : i18n.t('ui.onboarding.lock.wrongPin'));
    }
  };

  const onPinChange = (raw: string) => {
    let value = raw;
    if (pinError) {
      // Typing again after a rejected entry starts a fresh one (the old dots are still shown).
      if (clearTimer.current) clearTimeout(clearTimer.current);
      value = raw.length > pin.length ? raw.slice(-1) : '';
      setPinError(false);
    }
    setPin(value);
    if (pinMessage) setPinMessage(null);
    // Known length: the PinPad submits on its own. Unknown (older install): 6 digits submit.
    if (stage === 'verify-pin' && !storedPinLength && value.length === 6) submitVerify(value);
  };

  const onPinSubmit = async (value: string) => {
    if (stage === 'verify-pin') {
      submitVerify(value);
      return;
    }
    if (stage === 'pin-create') {
      // Same validation as before: 4–6 digits, digits only.
      if (value.length < 4 || value.length > 6 || !/^\d+$/.test(value)) {
        rejectPin(t('tooShort'));
        return;
      }
      setFirstPin(value);
      setCreateHint(null);
      setPinMismatch(false);
      resetPin();
      setStage('pin-confirm');
      return;
    }
    if (stage === 'pin-confirm') {
      if (value !== firstPin) {
        // Keep the first PIN: shake, clear, and ask for it again with a clear error line.
        setPinMismatch(true);
        rejectPin(null);
        return;
      }
      setPinMismatch(false);
      setBusy('pin');
      const result = await setupPINAuth(value);
      setBusy(null);
      if (result.success) {
        finish('pin');
      } else {
        console.error('Failed to set up PIN:', result.error);
        setFirstPin('');
        setStage('pin-create');
        rejectPin(t('pinFailed'));
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Back
  // ---------------------------------------------------------------------------

  const stepBack = React.useCallback((): boolean => {
    if (stage === 'pin-confirm') {
      resetPin();
      setFirstPin('');
      setPinMismatch(false);
      setStage('pin-create');
      return true;
    }
    if (stage === 'pin-create') {
      resetPin();
      setStage('choose');
      return true;
    }
    return false;
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', stepBack);
    return () => sub.remove();
  }, [stepBack]);

  const inPinFlow = stage === 'pin-create' || stage === 'pin-confirm';
  const onBack = inPinFlow ? () => stepBack() : reconfigure ? () => router.back() : undefined;

  return (
    <ProtectView
      reconfigure={reconfigure}
      stage={stage}
      biometric={biometric}
      current={current}
      busy={busy}
      message={message}
      onBack={onBack}
      onChooseBiometric={chooseBiometric}
      onChoosePin={choosePin}
      onChooseOff={chooseOff}
      pin={pin}
      onPinChange={onPinChange}
      onPinSubmit={onPinSubmit}
      pinError={pinError}
      pinMessage={pinMessage}
      createHint={createHint}
      pinMismatch={pinMismatch}
      onRestartPin={() => {
        resetPin();
        setFirstPin('');
        setPinMismatch(false);
        setStage('pin-create');
      }}
      confirmLength={firstPin.length || undefined}
      verifyLength={storedPinLength ?? undefined}
      cooldownSeconds={stage === 'verify-pin' ? cooldownSeconds : 0}
      onVerifyBiometric={() => verifyBiometric(pinStored)}
      onUsePin={
        stage === 'verify-biometric' && pinStored
          ? () => {
              setMessage(null);
              resetPin();
              setStage('verify-pin');
            }
          : undefined
      }
    />
  );
}
