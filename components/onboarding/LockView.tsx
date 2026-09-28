/**
 * Lock screen (presentational): app mark, "Welcome back, Emma", then either the PinPad or the
 * biometric unlock button with a "Use PIN instead" fallback. During a cool-down the keypad is
 * disabled and a countdown is shown.
 *
 * @example
 * <LockView mode="pin" name="Emma" pin={pin} onPinChange={…} onPinSubmit={verify} pinError={wrong} message="That's not right." />
 * <LockView mode="biometric" biometric={{ label: 'Face ID', icon: ScanFace }} onBiometric={prompt} onUsePin={toPin} />
 */
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { CircleAlert, Timer } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Button, IconButton, PinPad, Screen, Text, useTheme } from '@/components/ds';
import { AppMark } from './AppMark';
import type { BiometricInfo } from './biometric';
import { StatusLine } from './StatusLine';
import { useEnter } from './motion';

export interface LockViewProps {
  mode: 'loading' | 'pin' | 'biometric';
  /** Active profile first name. */
  name?: string | null;
  biometric?: BiometricInfo | null;
  /** Biometric prompt in progress. */
  biometricBusy?: boolean;
  onBiometric?: () => void;
  /** Biometric mode: switch to the PIN pad (only when a PIN exists). */
  onUsePin?: () => void;
  pin?: string;
  onPinChange?: (value: string) => void;
  onPinSubmit?: (value: string) => void;
  pinError?: boolean;
  /** Checking a PIN. */
  verifying?: boolean;
  /** Error / info line. */
  message?: string | null;
  cooldownSeconds?: number;
}

export function LockView({
  mode,
  name,
  biometric,
  biometricBusy = false,
  onBiometric,
  onUsePin,
  pin = '',
  onPinChange,
  onPinSubmit,
  pinError = false,
  verifying = false,
  message,
  cooldownSeconds = 0,
}: LockViewProps) {
  const { colors } = useTheme();
  const enter = useEnter();
  const coolingDown = cooldownSeconds > 0;
  const firstName = name?.trim().split(/\s+/)[0];

  const statusText = coolingDown
    ? i18n.t('ui.onboarding.lock.cooldown', { count: cooldownSeconds })
    : message;

  return (
    <Screen contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View entering={enter(0)} style={{ alignItems: 'center' }}>
        <AppMark size={mode === 'pin' ? 76 : 104} breathing={mode === 'biometric'} />
      </Animated.View>
      <Animated.View
        entering={enter(1)}
        style={{ alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 20, maxWidth: 360 }}>
        <Text variant="title1" align="center">
          {firstName
            ? i18n.t('ui.onboarding.lock.welcomeBackName', { name: firstName })
            : i18n.t('ui.onboarding.lock.welcomeBack')}
        </Text>
        {mode !== 'loading' ? (
          <Text variant="body" tone="secondary" align="center">
            {mode === 'pin'
              ? i18n.t('ui.onboarding.lock.pinHint')
              : i18n.t('ui.onboarding.lock.biometricHint')}
          </Text>
        ) : null}
      </Animated.View>

      {mode === 'loading' ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
      ) : mode === 'pin' ? (
        <Animated.View entering={enter(2)} style={{ alignItems: 'center', gap: 16 }}>
          <StatusLine
            text={statusText}
            icon={coolingDown ? Timer : CircleAlert}
            tone={coolingDown ? 'warning' : 'danger'}
            reserve
          />
          <PinPad
            value={pin}
            onChange={(v) => onPinChange?.(v)}
            onSubmit={(v) => onPinSubmit?.(v)}
            error={pinError}
            disabled={coolingDown || verifying}
            minLength={4}
            maxLength={6}
            showSubmitKey
            submitLabel={i18n.t('ui.onboarding.lock.unlock')}
            leftKey={
              biometric && onBiometric ? (
                <IconButton
                  icon={biometric.icon}
                  variant="plain"
                  size="lg"
                  accessibilityLabel={i18n.t('ui.onboarding.lock.useBiometric', {
                    method: biometric.label,
                  })}
                  disabled={coolingDown}
                  onPress={onBiometric}
                />
              ) : undefined
            }
          />
        </Animated.View>
      ) : (
        <Animated.View entering={enter(2)} style={{ alignSelf: 'stretch', gap: 12 }}>
          <StatusLine text={message} icon={CircleAlert} tone="danger" reserve />
          <Button
            label={i18n.t('ui.onboarding.lock.unlockWith', { method: biometric?.label ?? '' })}
            icon={biometric?.icon}
            size="lg"
            fullWidth
            loading={biometricBusy}
            onPress={onBiometric}
          />
          {onUsePin ? (
            <Button
              label={i18n.t('ui.onboarding.lock.usePin')}
              variant="plain"
              size="lg"
              fullWidth
              disabled={biometricBusy}
              onPress={onUsePin}
            />
          ) : null}
        </Animated.View>
      )}
    </Screen>
  );
}
