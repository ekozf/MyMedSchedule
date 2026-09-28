/**
 * Profile form body shared by /profile/create and /profile/[id]: big avatar with camera badge +
 * large name field. Extra content (e.g. the delete row) goes in `children`.
 *
 * @example
 * <ProfileForm name={name} onChangeName={setName} avatarUri={uri} onChangeAvatar={setUri}
 *   nameError={error} onSubmit={save} autoFocus />
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion, FadeIn } from 'react-native-reanimated';
import i18n from '@/lib/i18n';
import { TextField } from '@/components/ds';
import { AvatarPicker } from './AvatarPicker';

export interface ProfileFormProps {
  name: string;
  onChangeName: (name: string) => void;
  nameError?: string | null;
  avatarUri?: string;
  onChangeAvatar: (uri: string | undefined) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function ProfileForm({
  name,
  onChangeName,
  nameError,
  avatarUri,
  onChangeAvatar,
  onSubmit,
  autoFocus,
  disabled,
  children,
}: ProfileFormProps) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reduceMotion ? FadeIn : FadeInDown.duration(260)}
      style={{ gap: 28, paddingTop: 8 }}>
      <View style={{ alignItems: 'center' }}>
        <AvatarPicker name={name} uri={avatarUri} onChange={onChangeAvatar} disabled={disabled} />
      </View>
      <TextField
        size="lg"
        label={i18n.t('ui.you.form.nameLabel')}
        placeholder={i18n.t('ui.you.form.namePlaceholder')}
        value={name}
        onChangeText={onChangeName}
        error={nameError}
        helper={nameError ? undefined : i18n.t('ui.you.form.nameHelper')}
        autoFocus={autoFocus}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="name"
        textContentType="name"
        returnKeyType="done"
        maxLength={60}
        editable={!disabled}
        onSubmitEditing={onSubmit}
      />
      {children}
    </Animated.View>
  );
}
