/**
 * "Keep it private" (spec §5.1 step 3–4) and the App lock page from You (§5.6, `reconfigure`).
 * Presentational: the route owns the auth calls and passes the current `stage`.
 *
 * Stages: `choose` (onboarding: a primary "Use a PIN code", a secondary "Use fingerprint or face"
 * when available, quiet "Don't lock the app"; the no-recovery footnote sits right under the PIN
 * button; App lock: option cards) · `pin-create` / `pin-confirm` (Choose a PIN / Repeat your
 * PIN) · `verify-pin` / `verify-biometric` (App lock only: "First, confirm it's you") · `loading`.
 *
 * @example
 * <ProtectView stage="choose" biometric={{ label: 'Fingerprint', useLabel: 'Use fingerprint' }} … />
 */
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { AuthMethod } from '@/lib/auth';
import i18n from '@/lib/i18n';
import { Button, NavHeader, OptionRow, Screen, Text, useTheme } from '@/components/ds';
import type { BiometricInfo } from './biometric';
import { PinScreen } from './PinScreen';
import { StatusLine } from './StatusLine';

export type ProtectStage =
  | 'loading'
  | 'choose'
  | 'pin-create'
  | 'pin-confirm'
  | 'verify-pin'
  | 'verify-biometric';

export type ProtectBusy = 'biometric' | 'pin' | 'off' | 'verify' | null;

export interface ProtectViewProps {
  reconfigure?: boolean;
  stage: ProtectStage;
  /** Device biometrics (null when unsupported / not enrolled). */
  biometric: BiometricInfo | null;
  /** App lock: the method in use. */
  current?: AuthMethod | null;
  busy?: ProtectBusy;
  /** Message on the choose / verify stages. */
  message?: string | null;
  /** Back button; hidden when omitted. */
  onBack?: () => void;
  onChooseBiometric: () => void;
  onChoosePin: () => void;
  onChooseOff: () => void;
  // PIN stages
  pin: string;
  onPinChange: (value: string) => void;
  onPinSubmit: (value: string) => void;
  pinError?: boolean;
  pinMessage?: string | null;
  /** pin-create: replaces "4 to 6 digits.". */
  createHint?: string | null;
  /**
   * pin-confirm after a mismatch: the first PIN is kept; show "They didn't match. Type the first
   * PIN again." as a strong error and a quiet "Choose a different PIN" that restarts.
   */
  pinMismatch?: boolean;
  onRestartPin?: () => void;
  /** pin-confirm: length of the first entry (auto-submits there). */
  confirmLength?: number;
  /** verify-pin: length of the stored PIN (auto-submits, no "Next"); omitted when unknown. */
  verifyLength?: number;
  cooldownSeconds?: number;
  // verify-biometric
  onVerifyBiometric?: () => void;
  /** verify-biometric: offer the stored PIN instead. */
  onUsePin?: () => void;
}

const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(`ui.onboarding.protect.${key}`, opts);

export function ProtectView(props: ProtectViewProps) {
  const { stage, onBack } = props;
  const { colors } = useTheme();
  const header = <NavHeader hideBack={!onBack} onBack={onBack} />;

  if (stage === 'loading') {
    return (
      <Screen header={header} scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          accessible
          accessibilityLabel={i18n.t('ui.common.loading')}>
          <ActivityIndicator color={colors.ink2} />
        </View>
      </Screen>
    );
  }
  if (stage === 'choose') return <ChooseStage {...props} header={header} />;
  if (stage === 'verify-biometric') return <VerifyBiometricStage {...props} header={header} />;
  return <PinStage {...props} header={header} />;
}

type StageProps = ProtectViewProps & { header: React.ReactNode };

function ChooseStage({
  reconfigure = false,
  biometric,
  current,
  busy,
  message,
  header,
  onChooseBiometric,
  onChoosePin,
  onChooseOff,
}: StageProps) {
  const isCurrent = (m: AuthMethod) => reconfigure && current === m;
  if (!reconfigure) {
    return (
      <Screen
        header={header}
        footer={
          <View style={{ gap: 10 }}>
            <Button
              label={t('usePinCode')}
              disabled={!!busy}
              loading={busy === 'pin'}
              onPress={onChoosePin}
            />
            <Text
              variant="footnote"
              tone="secondary"
              style={{ paddingHorizontal: 4, marginBottom: 4 }}>
              {t('pinNoRecovery')}
            </Text>
            {biometric ? (
              <Button
                variant="secondary"
                label={t('useBiometric')}
                disabled={!!busy}
                loading={busy === 'biometric'}
                onPress={onChooseBiometric}
              />
            ) : null}
            <Button
              variant="quiet"
              label={t('dontLock')}
              disabled={!!busy}
              loading={busy === 'off'}
              onPress={onChooseOff}
            />
          </View>
        }>
        <View style={{ gap: 8, paddingTop: 8 }}>
          <Text variant="title1">{t('title')}</Text>
          <Text variant="body" tone="secondary">
            {t('body')}
          </Text>
          <StatusLine text={message} align="left" />
        </View>
      </Screen>
    );
  }
  return (
    <Screen header={header}>
      <View style={{ gap: 8, marginBottom: 24, paddingTop: 8 }}>
        <Text variant="title1">{t(reconfigure ? 'reconfigureTitle' : 'title')}</Text>
        <Text variant="body" tone="secondary">
          {t(reconfigure ? 'reconfigureBody' : 'body')}
        </Text>
      </View>
      <View style={{ gap: 12 }} accessibilityRole={reconfigure ? 'radiogroup' : undefined}>
        <OptionRow
          title={t('pinTitle')}
          description={isCurrent('pin') ? t('pinChangeDescription') : t('pinDescription')}
          badge={isCurrent('pin') ? t('current') : undefined}
          selected={isCurrent('pin')}
          disabled={!!busy}
          onPress={onChoosePin}
        />
        <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 4, marginBottom: 4 }}>
          {t('pinNoRecovery')}
        </Text>
        {biometric ? (
          <OptionRow
            title={t('biometricTitle')}
            description={t('biometricDescription')}
            badge={isCurrent('biometric') ? t('current') : undefined}
            selected={isCurrent('biometric')}
            disabled={!!busy}
            onPress={onChooseBiometric}
          />
        ) : null}
        {reconfigure ? (
          <OptionRow
            title={t('noLockTitle')}
            description={t('noLockDescription')}
            badge={isCurrent('none') ? t('current') : undefined}
            selected={isCurrent('none')}
            disabled={!!busy}
            onPress={onChooseOff}
          />
        ) : null}
        <StatusLine text={message} align="left" />
      </View>
    </Screen>
  );
}

function VerifyBiometricStage({
  biometric,
  busy,
  message,
  header,
  onVerifyBiometric,
  onUsePin,
}: StageProps) {
  const method = biometric?.label ?? i18n.t('ui.onboarding.biometric.generic');
  return (
    <Screen
      header={header}
      contentContainerStyle={{ justifyContent: 'center' }}
      footer={
        <>
          <Button
            label={t('verifyWith', { method })}
            loading={busy === 'verify'}
            onPress={() => onVerifyBiometric?.()}
          />
          {onUsePin ? <Button variant="quiet" label={t('usePin')} onPress={onUsePin} /> : null}
        </>
      }>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <Text variant="title2" align="center">
          {t('verifyTitle')}
        </Text>
        <Text variant="body" tone="secondary" align="center">
          {t('verifyBiometricHint', { method })}
        </Text>
        <StatusLine text={message} />
      </View>
    </Screen>
  );
}

function PinStage({
  stage,
  busy,
  header,
  pin,
  onPinChange,
  onPinSubmit,
  pinError,
  pinMessage,
  createHint,
  pinMismatch = false,
  onRestartPin,
  confirmLength,
  verifyLength,
  cooldownSeconds = 0,
}: StageProps) {
  const cooling = stage === 'verify-pin' && cooldownSeconds > 0;
  const title =
    stage === 'pin-create'
      ? t('choosePin')
      : stage === 'pin-confirm'
        ? t('repeatPin')
        : t('verifyTitle');
  const hint =
    stage === 'pin-create'
      ? (createHint ?? t('choosePinHint'))
      : stage === 'pin-confirm'
        ? t('repeatPinHint')
        : t('verifyPinHint');
  const mismatch = stage === 'pin-confirm' && pinMismatch;
  const message = cooling
    ? i18n.t('ui.onboarding.lock.cooldown', { count: cooldownSeconds })
    : mismatch
      ? t('mismatchAgain')
      : pinMessage;
  const busyNow = busy === 'pin' || busy === 'verify';
  const autoSubmitAt =
    stage === 'pin-confirm' ? confirmLength : stage === 'verify-pin' ? verifyLength : undefined;

  return (
    <PinScreen
      header={header}
      title={title}
      hint={hint}
      pin={pin}
      onPinChange={onPinChange}
      onSubmit={onPinSubmit}
      autoSubmitAt={autoSubmitAt}
      error={pinError}
      disabled={busyNow || cooling}
      message={message}
      messageStrong={mismatch}
      footer={
        stage === 'verify-pin' && verifyLength ? undefined : (
          <View style={{ gap: 4 }}>
            <Button
              label={t('next')}
              disabled={pin.length < 4 || cooling || !!pinError}
              loading={busyNow}
              onPress={() => onPinSubmit(pin)}
            />
            {mismatch && onRestartPin ? (
              <Button
                variant="quiet"
                label={t('chooseDifferent')}
                disabled={busyNow}
                onPress={onRestartPin}
              />
            ) : null}
          </View>
        )
      }
    />
  );
}
