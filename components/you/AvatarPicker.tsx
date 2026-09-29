/**
 * Big profile avatar with a camera badge. Tap → action sheet (Take photo / Choose from library /
 * Remove photo) with camera / library permission requests and friendly "allow access" prompts.
 *
 * @example
 * <AvatarPicker name={name} uri={avatarUri} onChange={setAvatarUri} />
 */
import * as React from 'react';
import { Linking, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Images, Trash2, UserRound } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import {
  AVATAR_SIZES,
  Avatar,
  Icon,
  PressableScale,
  useActionSheet,
  useConfirm,
  useTheme,
  useToast,
} from '@/components/ds';

export interface AvatarPickerProps {
  name: string;
  uri?: string;
  onChange: (uri: string | undefined) => void;
  disabled?: boolean;
}

const PICKER_OPTIONS = { allowsEditing: true, aspect: [1, 1] as [number, number], quality: 0.8 };

export function AvatarPicker({ name, uri, onChange, disabled }: AvatarPickerProps) {
  const { colors } = useTheme();
  const showActionSheet = useActionSheet();
  const confirm = useConfirm();
  const toast = useToast();
  const size = AVATAR_SIZES.xl;

  const askForAccess = async (kind: 'camera' | 'library') => {
    const ok = await confirm({
      title: i18n.t(
        kind === 'camera'
          ? 'ui.you.form.photo.cameraDeniedTitle'
          : 'ui.you.form.photo.libraryDeniedTitle'
      ),
      message: i18n.t(
        kind === 'camera' ? 'ui.you.form.photo.cameraDenied' : 'ui.you.form.photo.libraryDenied'
      ),
      confirmLabel: i18n.t('ui.you.form.photo.openSettings'),
      cancelLabel: i18n.t('ui.common.notNow'),
      icon: kind === 'camera' ? Camera : Images,
    });
    if (ok) Linking.openSettings().catch(() => {});
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        await askForAccess('camera');
        return;
      }
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      if (!result.canceled && result.assets[0]) onChange(result.assets[0].uri);
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.show({ title: i18n.t('ui.you.form.photo.failed'), tone: 'danger' });
    }
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        await askForAccess('library');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        ...PICKER_OPTIONS,
      });
      if (!result.canceled && result.assets[0]) onChange(result.assets[0].uri);
    } catch (error) {
      console.error('Error picking image:', error);
      toast.show({ title: i18n.t('ui.you.form.photo.failed'), tone: 'danger' });
    }
  };

  const open = async () => {
    const choice = await showActionSheet({
      title: i18n.t('ui.you.form.photo.title'),
      options: [
        { key: 'camera', label: i18n.t('ui.you.form.photo.take'), icon: Camera },
        { key: 'library', label: i18n.t('ui.you.form.photo.choose'), icon: Images },
        ...(uri
          ? [
              {
                key: 'remove',
                label: i18n.t('ui.you.form.photo.remove'),
                icon: Trash2,
                destructive: true,
              },
            ]
          : []),
      ],
    });
    if (choice === 'camera') await takePhoto();
    else if (choice === 'library') await pickImage();
    else if (choice === 'remove') onChange(undefined);
  };

  const hasName = name.trim().length > 0;

  return (
    <PressableScale
      onPress={open}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={i18n.t(
        uri ? 'ui.you.form.photo.changeA11y' : 'ui.you.form.photo.addA11y'
      )}
      style={{
        width: size + 12,
        height: size + 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {uri || hasName ? (
        <Avatar name={name} uri={uri} size="xl" />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon as={UserRound} size={48} tone="accent" />
        </View>
      )}
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 2,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.accent,
          borderWidth: 3,
          borderColor: colors.surfaceSolid,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon as={Camera} size={18} color={colors.onAccent} />
      </View>
    </PressableScale>
  );
}
