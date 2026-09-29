/**
 * Onboarding step 4 — "What should we call you?": big avatar with a camera badge (opens the photo
 * action sheet in the route), a large name field and **Start**.
 *
 * @example
 * <AboutYouView name={name} onNameChange={setName} avatarUri={uri} onAvatarPress={pickPhoto}
 *   onStart={create} creating={saving} error={error} />
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Camera, CircleAlert, UserRound, Users } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import {
  Avatar,
  Button,
  Icon,
  PressableScale,
  Screen,
  Text,
  TextField,
  useTheme,
} from '@/components/ds';
import { OnboardingHeader } from './OnboardingHeader';
import { StatusLine } from './StatusLine';
import { useEnter } from './motion';

export interface AboutYouViewProps {
  name: string;
  onNameChange: (name: string) => void;
  avatarUri?: string;
  onAvatarPress: () => void;
  onStart: () => void;
  creating?: boolean;
  error?: string | null;
  /** Default true; the preview turns it off. */
  autoFocus?: boolean;
}

export function AboutYouView({
  name,
  onNameChange,
  avatarUri,
  onAvatarPress,
  onStart,
  creating = false,
  error,
  autoFocus = true,
}: AboutYouViewProps) {
  const enter = useEnter();
  const canStart = name.trim().length > 0;

  return (
    <Screen
      keyboardAware
      header={<OnboardingHeader step={3} />}
      footer={
        <Button
          label={i18n.t('ui.onboarding.profile.start')}
          size="lg"
          fullWidth
          disabled={!canStart}
          loading={creating}
          onPress={onStart}
        />
      }>
      <Animated.View entering={enter(0)} style={{ gap: 6, marginBottom: 24 }}>
        <Text variant="largeTitle">{i18n.t('ui.onboarding.profile.title')}</Text>
        <Text variant="body" tone="secondary">
          {i18n.t('ui.onboarding.profile.subtitle')}
        </Text>
      </Animated.View>

      <Animated.View entering={enter(1)} style={{ alignItems: 'center', marginBottom: 24 }}>
        <AvatarPicker name={name} uri={avatarUri} onPress={onAvatarPress} disabled={creating} />
      </Animated.View>

      <Animated.View entering={enter(2)} style={{ gap: 14 }}>
        <TextField
          size="lg"
          value={name}
          onChangeText={onNameChange}
          placeholder={i18n.t('ui.onboarding.profile.namePlaceholder')}
          accessibilityLabel={i18n.t('ui.onboarding.profile.nameLabel')}
          autoFocus={autoFocus}
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="done"
          onSubmitEditing={() => canStart && !creating && onStart()}
          maxLength={60}
          editable={!creating}
        />
        <View
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 4 }}>
          <Icon as={Users} size={18} tone="tertiary" style={{ marginTop: 1 }} />
          <Text variant="subhead" tone="secondary" style={{ flex: 1 }}>
            {i18n.t('ui.onboarding.profile.familyNote')}
          </Text>
        </View>
        <StatusLine text={error} icon={CircleAlert} tone="danger" />
      </Animated.View>
    </Screen>
  );
}

const AVATAR = 128;

/** Big avatar (or a soft placeholder) with a camera badge. */
export function AvatarPicker({
  name,
  uri,
  onPress,
  disabled,
}: {
  name: string;
  uri?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const empty = !uri && !name.trim();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={i18n.t(
        uri ? 'ui.onboarding.profile.photo.change' : 'ui.onboarding.profile.photo.add'
      )}
      style={{
        width: AVATAR + 8,
        height: AVATAR + 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {empty ? (
        <View
          style={{
            width: AVATAR,
            height: AVATAR,
            borderRadius: AVATAR / 2,
            backgroundColor: colors.accentSoft,
            borderWidth: 2,
            borderColor: colors.stroke,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon as={UserRound} size={56} tone="accent" strokeWidth={1.75} />
        </View>
      ) : (
        <Avatar name={name.trim() || '?'} uri={uri} size={AVATAR} />
      )}
      <View
        style={{
          position: 'absolute',
          right: 2,
          bottom: 2,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.accent,
          borderWidth: 3,
          borderColor: colors.surfaceSolid,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon as={Camera} size={20} color={colors.onAccent} />
      </View>
    </PressableScale>
  );
}
