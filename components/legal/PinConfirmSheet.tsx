/**
 * "Enter your PIN" sheet for re-confirming identity outside the lock screen (used after
 * `confirmIdentity()` returns 'needs-pin'). Shares the lock screen's attempt limiter: a wrong PIN
 * shakes the dots for 600 ms, five wrong PINs start the cool-down. `onConfirmed` (or `onCancelled`)
 * runs after the sheet has closed.
 *
 * @example
 * <PinConfirmSheet visible={askPin} title="Enter your PIN" subtitle="To delete everything"
 *   onClose={() => setAskPin(false)} onConfirmed={wipe} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { getPINLength, verifyPIN } from '@/lib/auth';
import { Button, PinPad, Sheet, Text } from '@/components/ds';
import {
  PIN_ERROR_FLASH_MS,
  registerPinFailure,
  registerPinSuccess,
  useCooldownSeconds,
} from '@/components/onboarding/pin-guard';

export interface PinConfirmSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Called once the right PIN was entered and the sheet finished closing. */
  onConfirmed: () => void;
  /** Called when the sheet finished closing without the right PIN. */
  onCancelled?: () => void;
}

const lockT = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(`ui.onboarding.lock.${key}`, opts);

export function PinConfirmSheet({
  visible,
  title,
  subtitle,
  onClose,
  onConfirmed,
  onCancelled,
}: PinConfirmSheetProps) {
  const cooldown = useCooldownSeconds();
  const [pin, setPin] = React.useState('');
  const [pinLength, setPinLength] = React.useState<number | null>(null);
  const [error, setError] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);
  const confirmedRef = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!visible) return;
    confirmedRef.current = false;
    setPin('');
    setError(false);
    setMessage(null);
    getPINLength()
      .then(setPinLength)
      .catch(() => setPinLength(null));
  }, [visible]);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const submit = async (value: string) => {
    if (verifying || cooldown > 0 || value.length < 4) return;
    setVerifying(true);
    let ok = false;
    try {
      ok = await verifyPIN(value);
    } catch (e) {
      console.warn('PIN check failed:', e);
    }
    setVerifying(false);
    if (ok) {
      registerPinSuccess();
      confirmedRef.current = true;
      onClose();
      return;
    }
    const cooling = registerPinFailure();
    setError(true);
    setMessage(cooling ? null : lockT('wrongPin'));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPin('');
      setError(false);
    }, PIN_ERROR_FLASH_MS);
  };

  const onChange = (raw: string) => {
    let value = raw;
    if (error) {
      if (timer.current) clearTimeout(timer.current);
      value = raw.length > pin.length ? raw.slice(-1) : '';
      setError(false);
    }
    setPin(value);
    if (message) setMessage(null);
    // Unknown length (older install): 6 digits submit.
    if (!pinLength && value.length === 6) submit(value);
  };

  const status = cooldown > 0 ? lockT('cooldown', { count: cooldown }) : message;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={() => {
        const confirmed = confirmedRef.current;
        confirmedRef.current = false;
        if (confirmed) onConfirmed();
        else onCancelled?.();
      }}
      title={title}
      subtitle={subtitle}
      scrollable={false}
      footer={
        // Older installs don't know the PIN length: confirm by hand from 4 digits.
        !pinLength ? (
          <Button
            label={i18n.t('ui.common.confirm')}
            onPress={() => submit(pin)}
            disabled={pin.length < 4 || cooldown > 0}
            loading={verifying}
          />
        ) : undefined
      }>
      <View style={{ paddingTop: 8 }}>
        <PinPad
          value={pin}
          onChange={onChange}
          autoSubmitAt={pinLength ?? undefined}
          minLength={pinLength ?? 4}
          maxLength={pinLength ?? 6}
          onSubmit={submit}
          error={error}
          disabled={verifying || cooldown > 0}
          status={
            status ? (
              <Text
                variant="callout"
                tone={cooldown > 0 || message ? 'danger' : 'secondary'}
                align="center"
                accessibilityLiveRegion="polite">
                {status}
              </Text>
            ) : null
          }
        />
      </View>
    </Sheet>
  );
}
