/**
 * Profile form body: 120 avatar with camera badge (photo picker) and a large name field with a
 * hint. Used by onboarding "What should we call you?" and the New / Edit profile pages. Extra
 * content (e.g. "Remove this person") goes in `children`.
 *
 * @example
 * <ProfileForm name={name} onChangeName={setName} avatarUri={uri} onChangeAvatar={setUri}
 *   label="Name" helper="Shown on your Today screen." nameError={error} onSubmit={save} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { TextField } from '@/components/ds';
import { AvatarPicker } from './AvatarPicker';

export interface ProfileFormProps {
  name: string;
  onChangeName: (name: string) => void;
  label: string;
  helper: string;
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
  label,
  helper,
  nameError,
  avatarUri,
  onChangeAvatar,
  onSubmit,
  autoFocus,
  disabled,
  children,
}: ProfileFormProps) {
  return (
    <View style={{ gap: 28, paddingTop: 8 }}>
      <View style={{ alignItems: 'center' }}>
        <AvatarPicker name={name} uri={avatarUri} onChange={onChangeAvatar} disabled={disabled} />
      </View>
      <TextField
        label={label}
        value={name}
        onChangeText={onChangeName}
        error={nameError}
        helper={nameError ? undefined : helper}
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
    </View>
  );
}
