/**
 * Onboarding step 3 — "Keep it private" (also the App lock settings screen when `reconfigure`).
 * Presentational: the route owns the auth calls and passes the current `stage`.
 *
 * Stages: `choose` (three cards) · `pin-create` / `pin-confirm` (PinPad) · `verify-pin` /
 * `verify-biometric` (reconfigure only: prove it's you before changing the lock) · `loading`.
 *
 * @example
 * <ProtectView stage="choose" biometric={{ label: 'Face ID', icon: ScanFace }} … />
 */
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  CircleAlert,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Timer,
  Check,
} from 'lucide-react-native';
import type { AuthMethod } from '@/lib/auth';
import i18n from '@/lib/i18n';
import { Button, Icon, NavHeader, PinPad, Screen, Text, useTheme } from '@/components/ds';
import type { BiometricInfo } from './biometric';
import { ChoiceCard } from './ChoiceCard';
import { OnboardingHeader } from './OnboardingHeader';
import { StatusLine } from './StatusLine';
import { useEnter } from './motion';

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
  /** Reconfigure: the method currently in use. */
  current?: AuthMethod | null;
  busy?: ProtectBusy;
  /** Friendly error on the choose / verify stages. */
  message?: string | null;
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
  /** pin-confirm: length of the first entry (auto-submits there). */
  confirmLength?: number;
  cooldownSeconds?: number;
  // verify-biometric
  onVerifyBiometric?: () => void;
  /** verify-biometric: offer the stored PIN instead. */
  onUsePin?: () => void;
}

export function ProtectView(props: ProtectViewProps) {
  const { reconfigure = false, stage, onBack } = props;
  const header = reconfigure ? (
    <NavHeader onBack={onBack} />
  ) : (
    <OnboardingHeader step={2} onBack={onBack} />
  );

  if (stage === 'loading') {
    return (
      <Screen header={header} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }
  if (stage === 'choose') return <ChooseStage {...props} header={header} />;
  return <PinOrVerifyStage {...props} header={header} />;
}

function ChooseStage({
  reconfigure = false,
  biometric,
  current,
  busy,
  message,
  onChooseBiometric,
  onChoosePin,
  onChooseOff,
  header,
}: ProtectViewProps & { header: React.ReactNode }) {
  const enter = useEnter();
  const currentBadge = {
    label: i18n.t('ui.onboarding.protect.current'),
    tone: 'accent' as const,
    icon: Check,
  };
  const badgesFor = (method: AuthMethod, recommended = false) => {
    const out: { label: string; tone: 'accent' | 'success'; icon?: typeof Check }[] = [];
    if (reconfigure && current === method) out.push(currentBadge);
    if (recommended && !(reconfigure && current === method)) {
      out.push({
        label: i18n.t('ui.onboarding.protect.recommended'),
        tone: 'success',
        icon: Sparkles,
      });
    }
    return out;
  };
  const anyBusy = !!busy;
  const offIsCurrent = reconfigure && current === 'none';

  return (
    <Screen header={header}>
      <Animated.View entering={enter(0)} style={{ marginBottom: 20, gap: 6 }}>
        <Text variant="largeTitle">
          {i18n.t(
            reconfigure ? 'ui.onboarding.protect.reconfigureTitle' : 'ui.onboarding.protect.title'
          )}
        </Text>
        <Text variant="body" tone="secondary">
          {i18n.t(
            reconfigure
              ? 'ui.onboarding.protect.reconfigureSubtitle'
              : 'ui.onboarding.protect.subtitle'
          )}
        </Text>
      </Animated.View>

      <View style={{ gap: 10 }}>
        {biometric ? (
          <Animated.View entering={enter(1)}>
            <ChoiceCard
              icon={biometric.icon}
              title={biometric.label}
              description={i18n.t('ui.onboarding.protect.biometricDescription')}
              badges={badgesFor('biometric', true)}
              busy={busy === 'biometric'}
              disabled={anyBusy && busy !== 'biometric'}
              onPress={onChooseBiometric}
            />
          </Animated.View>
        ) : null}
        <Animated.View entering={enter(2)}>
          <ChoiceCard
            icon={KeyRound}
            title={i18n.t('ui.onboarding.protect.pinTitle')}
            description={i18n.t('ui.onboarding.protect.pinDescription')}
            badges={badgesFor('pin', !biometric)}
            disabled={anyBusy}
            onPress={onChoosePin}
          />
        </Animated.View>
        <Animated.View entering={enter(3)} style={{ marginTop: 6 }}>
          <ChoiceCard
            plain
            icon={ShieldOff}
            title={i18n.t(
              !reconfigure
                ? 'ui.onboarding.protect.notNowTitle'
                : offIsCurrent
                  ? 'ui.onboarding.protect.noLockTitle'
                  : 'ui.onboarding.protect.offTitle'
            )}
            description={i18n.t(
              reconfigure
                ? 'ui.onboarding.protect.offDescription'
                : 'ui.onboarding.protect.notNowDescription'
            )}
            badges={offIsCurrent ? [currentBadge] : undefined}
            busy={busy === 'off'}
            disabled={anyBusy && busy !== 'off'}
            onPress={onChooseOff}
          />
        </Animated.View>
      </View>

      <View style={{ marginTop: 16 }}>
        <StatusLine text={message} icon={CircleAlert} tone="danger" />
      </View>
    </Screen>
  );
}

function PinOrVerifyStage({
  stage,
  biometric,
  busy,
  message,
  pin,
  onPinChange,
  onPinSubmit,
  pinError = false,
  pinMessage,
  confirmLength,
  cooldownSeconds = 0,
  onVerifyBiometric,
  onUsePin,
  header,
}: ProtectViewProps & { header: React.ReactNode }) {
  const { colors } = useTheme();
  const enter = useEnter();
  const coolingDown = cooldownSeconds > 0;

  let title = '';
  let hint = '';
  if (stage === 'pin-create') {
    title = i18n.t('ui.onboarding.protect.choosePin');
    hint = i18n.t('ui.onboarding.protect.choosePinHint');
  } else if (stage === 'pin-confirm') {
    title = i18n.t('ui.onboarding.protect.confirmPin');
    hint = i18n.t('ui.onboarding.protect.confirmPinHint');
  } else {
    title = i18n.t('ui.onboarding.protect.verifyTitle');
    hint =
      stage === 'verify-pin'
        ? i18n.t('ui.onboarding.protect.verifyPinHint')
        : i18n.t('ui.onboarding.protect.verifyBiometricHint', { method: biometric?.label ?? '' });
  }

  const heroIcon =
    stage === 'verify-biometric' && biometric
      ? biometric.icon
      : stage === 'pin-confirm'
        ? ShieldCheck
        : LockKeyhole;

  const statusText = coolingDown
    ? i18n.t('ui.onboarding.lock.cooldown', { count: cooldownSeconds })
    : (pinMessage ?? message);

  return (
    <Screen header={header} contentContainerStyle={{ alignItems: 'center' }}>
      <Animated.View
        key={stage}
        entering={enter(0)}
        style={{ alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 20, maxWidth: 360 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}>
          <Icon as={heroIcon} size={30} tone="accent" />
        </View>
        <Text variant="title1" align="center">
          {title}
        </Text>
        <Text variant="body" tone="secondary" align="center">
          {hint}
        </Text>
      </Animated.View>

      {stage === 'verify-biometric' ? (
        <View style={{ alignSelf: 'stretch', gap: 12, marginTop: 8 }}>
          <StatusLine text={message} icon={CircleAlert} tone="danger" reserve />
          <Button
            label={i18n.t('ui.onboarding.protect.verifyWith', { method: biometric?.label ?? '' })}
            icon={biometric?.icon}
            size="lg"
            fullWidth
            loading={busy === 'verify'}
            onPress={onVerifyBiometric}
          />
          {onUsePin ? (
            <Button
              label={i18n.t('ui.onboarding.lock.usePin')}
              variant="plain"
              size="lg"
              fullWidth
              onPress={onUsePin}
            />
          ) : null}
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <StatusLine
            text={statusText}
            icon={coolingDown ? Timer : CircleAlert}
            tone={coolingDown ? 'warning' : 'danger'}
            reserve
          />
          <PinPad
            value={pin}
            onChange={onPinChange}
            onSubmit={onPinSubmit}
            error={pinError}
            disabled={coolingDown || !!busy}
            minLength={4}
            maxLength={6}
            autoSubmitAt={stage === 'pin-confirm' ? confirmLength : undefined}
            showSubmitKey={stage !== 'pin-confirm'}
            submitLabel={
              stage === 'pin-create' ? i18n.t('ui.common.next') : i18n.t('ui.common.continue')
            }
          />
        </View>
      )}
    </Screen>
  );
}
