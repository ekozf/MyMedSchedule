/**
 * Lock screen (spec §5.1 step 6): avatar, "Welcome back, {name}", the PIN pad with "Use
 * fingerprint" as the quiet left key when biometrics are set up. With a known `pinLength` the PIN
 * submits itself once complete and there is no "Open" button; PINs set by older versions (length
 * unknown) keep the "Open" button (6 digits still submit on their own). Biometric mode shows one big button instead
 * of the pad. A quiet "Forgot your PIN?" under the pad opens a sheet that explains honestly what
 * can be done (there is no reset: the PIN never leaves the phone; reinstalling is the only way
 * back). Presentational: the route owns the auth calls.
 *
 * @example
 * <LockView mode="pin" name="Margaret" pin={pin} onPinChange={setPin} onPinSubmit={verify} … />
 */
import * as React from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import i18n from '@/lib/i18n';
import { Avatar, Button, Screen, Sheet, Text, useTheme } from '@/components/ds';
import type { BiometricInfo } from './biometric';
import { PinScreen } from './PinScreen';
import { StatusLine } from './StatusLine';

export interface LockViewProps {
  mode: 'loading' | 'pin' | 'biometric';
  name: string | null;
  avatarUri?: string | null;
  biometric: BiometricInfo | null;
  biometricBusy?: boolean;
  /** Offer biometrics (quiet key in PIN mode, the button in biometric mode). */
  onBiometric?: () => void;
  /** Biometric mode: switch to the PIN pad. */
  onUsePin?: () => void;
  pin: string;
  /** Stored PIN length (auto-submit, no "Open" button); null when unknown. */
  pinLength?: number | null;
  onPinChange: (value: string) => void;
  onPinSubmit: (value: string) => void;
  pinError?: boolean;
  verifying?: boolean;
  message?: string | null;
  cooldownSeconds?: number;
}

const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(`ui.onboarding.lock.${key}`, opts);

export function LockView({
  mode,
  name,
  avatarUri,
  biometric,
  biometricBusy,
  onBiometric,
  onUsePin,
  pin,
  pinLength = null,
  onPinChange,
  onPinSubmit,
  pinError,
  verifying,
  message,
  cooldownSeconds = 0,
}: LockViewProps) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const [forgotOpen, setForgotOpen] = React.useState(false);
  const title = name ? t('welcomeBackName', { name }) : t('welcomeBack');
  const avatar = name ? { name, uri: avatarUri } : undefined;

  if (mode === 'loading') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.ink2} accessibilityLabel={i18n.t('ui.common.loading')} />
        </View>
      </Screen>
    );
  }

  const method = biometric?.label ?? i18n.t('ui.onboarding.biometric.generic');

  if (mode === 'biometric') {
    return (
      <Screen
        contentContainerStyle={{ justifyContent: 'center' }}
        footer={
          <>
            {onBiometric ? (
              <Button
                label={t('unlockWith', { method })}
                loading={biometricBusy}
                onPress={onBiometric}
              />
            ) : null}
            {onUsePin ? <Button variant="quiet" label={t('usePin')} onPress={onUsePin} /> : null}
          </>
        }>
        <View style={{ alignItems: 'center', gap: 8 }}>
          {avatar ? (
            <Avatar
              name={avatar.name}
              uri={avatar.uri}
              size={height < 740 ? 72 : 120}
              style={{ marginBottom: 8 }}
            />
          ) : null}
          <Text variant="title2" align="center">
            {title}
          </Text>
          <Text variant="body" tone="secondary" align="center">
            {t('biometricHint', { method })}
          </Text>
          <StatusLine text={message} />
        </View>
      </Screen>
    );
  }

  const cooling = cooldownSeconds > 0;
  return (
    <>
      <PinScreen
        avatar={avatar}
        title={title}
        hint={t('pinHint')}
        pin={pin}
        onPinChange={onPinChange}
        autoSubmitAt={pinLength ?? undefined}
        onSubmit={pinLength ? onPinSubmit : undefined}
        error={pinError}
        disabled={verifying || cooling}
        leftKey={
          onBiometric && biometric ? { label: biometric.useLabel, onPress: onBiometric } : undefined
        }
        message={cooling ? t('cooldown', { count: cooldownSeconds }) : message}
        footer={
          <>
            {pinLength ? null : (
              <Button
                label={t('open')}
                disabled={pin.length < 4 || cooling || !!pinError}
                loading={verifying}
                onPress={() => onPinSubmit(pin)}
              />
            )}
            <Button variant="quiet" label={t('forgot')} onPress={() => setForgotOpen(true)} />
          </>
        }
      />
      <Sheet
        visible={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title={t('forgotTitle')}
        footer={<Button label={t('forgotClose')} onPress={() => setForgotOpen(false)} />}>
        {/* One sentence on what it means, one on what to do; then the button. */}
        <View style={{ gap: 12 }}>
          <Text variant="body" weight="700">
            {t('forgotConsequence')}
          </Text>
          <Text variant="body" tone="secondary">
            {t('forgotWhatToDo')}
          </Text>
        </View>
      </Sheet>
    </>
  );
}
