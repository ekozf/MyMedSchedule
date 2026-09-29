/**
 * Round medicine photo with a camera badge. Tap → action sheet (take / choose / remove), asking
 * for camera / library permission first and explaining gently when it is denied.
 *
 * @example
 * <PhotoPicker uri={form.imageUri} name={form.name} onChange={(imageUri) => update.set({ imageUri })} />
 */
import * as React from 'react';
import { Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, Images, Trash2 } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import {
  Icon,
  PressableScale,
  Text,
  getMedTint,
  useActionSheet,
  useTheme,
  useToast,
  withAlpha,
} from '@/components/ds';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

export interface PhotoPickerProps {
  uri: string | null;
  /** Medicine name, used for the placeholder tint. */
  name: string;
  onChange: (uri: string | null) => void;
  /** Diameter. Default 112. */
  size?: number;
  /** Show the "Add a photo" caption under the circle. Default true. */
  showCaption?: boolean;
}

export function PhotoPicker({
  uri,
  name,
  onChange,
  size = 112,
  showCaption = true,
}: PhotoPickerProps) {
  const { colors, isDark } = useTheme();
  const showActionSheet = useActionSheet();
  const toast = useToast();
  const tint = getMedTint(name);
  const t = (k: string) => i18n.t(`ui.editor.photo.${k}`);

  const pick = async (source: 'camera' | 'library') => {
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.show({
          title: t(source === 'camera' ? 'cameraDeniedTitle' : 'libraryDeniedTitle'),
          message: t(source === 'camera' ? 'cameraDeniedMessage' : 'libraryDeniedMessage'),
          tone: 'warning',
        });
        return;
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
          : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      if (!result.canceled && result.assets[0]) onChange(result.assets[0].uri);
    } catch (error) {
      console.error('Error picking medicine photo:', error);
      toast.show({ title: t('error'), tone: 'danger' });
    }
  };

  const open = async () => {
    const choice = await showActionSheet({
      title: t('sheetTitle'),
      options: [
        { key: 'camera', label: t('take'), icon: Camera },
        { key: 'library', label: t('choose'), icon: Images },
        ...(uri ? [{ key: 'remove', label: t('remove'), icon: Trash2, destructive: true }] : []),
      ],
    });
    if (choice === 'camera' || choice === 'library') await pick(choice);
    if (choice === 'remove') onChange(null);
  };

  const badge = Math.round(size * 0.34);

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <PressableScale
        onPress={open}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={t(uri ? 'a11yFilled' : 'a11yEmpty')}
        style={{ width: size, height: size }}>
        {uri ? (
          <Image
            source={{ uri }}
            accessibilityIgnoresInvertColors
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.surfaceSunken,
            }}
          />
        ) : (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: withAlpha(tint, isDark ? 0.22 : 0.14),
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: withAlpha(tint, 0.45),
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon as={ImagePlus} size={Math.round(size * 0.34)} color={tint} />
          </View>
        )}
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            backgroundColor: colors.accent,
            borderWidth: 3,
            borderColor: colors.surfaceSolid,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon as={Camera} size={Math.round(badge * 0.5)} color={colors.onAccent} />
        </View>
      </PressableScale>
      {showCaption ? (
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text
            variant="headline"
            tone="accent"
            onPress={open}
            accessibilityElementsHidden
            importantForAccessibility="no">
            {t(uri ? 'change' : 'add')}
          </Text>
          {!uri ? (
            <Text variant="footnote" tone="tertiary" align="center">
              {t('helper')}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
