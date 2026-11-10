/**
 * Onboarding last step, "What should we call you?" (spec §5.1 step 5): title, 120 avatar with
 * camera badge, "Your name" field with hint, primary "Start".
 *
 * @example
 * <AboutYouView name={name} onNameChange={setName} avatarUri={uri} onAvatarChange={setUri}
 *   onStart={create} creating={busy} error={error} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { Button, NavHeader, Screen, Text } from '@/components/ds';
import { ProfileForm } from '@/components/you/ProfileForm';

export interface AboutYouViewProps {
  name: string;
  onNameChange: (name: string) => void;
  avatarUri?: string;
  onAvatarChange: (uri: string | undefined) => void;
  onStart: () => void;
  creating?: boolean;
  error?: string | null;
}

const t = (key: string) => i18n.t(`ui.onboarding.profile.${key}`);

export function AboutYouView({
  name,
  onNameChange,
  avatarUri,
  onAvatarChange,
  onStart,
  creating,
  error,
}: AboutYouViewProps) {
  return (
    <Screen
      keyboardAware
      header={<NavHeader hideBack />}
      footer={<Button label={t('start')} loading={creating} onPress={onStart} />}>
      <View style={{ gap: 12, paddingTop: 8 }}>
        <Text variant="title1">{t('title')}</Text>
        <ProfileForm
          name={name}
          onChangeName={onNameChange}
          label={t('nameLabel')}
          helper={t('hint')}
          nameError={error}
          avatarUri={avatarUri}
          onChangeAvatar={onAvatarChange}
          onSubmit={onStart}
          disabled={creating}
        />
      </View>
    </Screen>
  );
}
