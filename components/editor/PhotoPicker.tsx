/**
 * Medicine photo row (docs/DESIGN.md §5.4 step 1): an 88 px dashed square (or the photo), "Add a
 * photo" and "Optional. Helps you recognise the box." Tapping opens the take / choose / remove
 * action sheet, asking for camera or library permission first and explaining when it is denied.
 *
 * @example
 * <PhotoRow uri={form.imageUri} onChange={(imageUri) => update.set({ imageUri })} />
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
  radii,
  useActionSheet,
  useTheme,
  useToast,
} from '@/components/ds';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

const t = (k: string) => i18n.t(`ui.editor.photo.${k}`);
const SIZE = 88;

/** Returns `open()`: shows the photo action sheet and calls `onChange` with the result. */
export function usePhotoPicker(uri: string | null, onChange: (uri: string | null) => void) {
  const showActionSheet = useActionSheet();
  const toast = useToast();

  const pick = React.useCallback(
    async (source: 'camera' | 'library') => {
      try {
        const perm =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          toast.show({
            title: t(source === 'camera' ? 'cameraDeniedTitle' : 'libraryDeniedTitle'),
            message: t(source === 'camera' ? 'cameraDeniedMessage' : 'libraryDeniedMessage'),
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
        toast.show({ title: t('error') });
      }
    },
    [onChange, toast]
  );

  return React.useCallback(async () => {
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
  }, [showActionSheet, uri, pick, onChange]);
}

export function PhotoRow({
  uri,
  onChange,
}: {
  uri: string | null;
  onChange: (uri: string | null) => void;
}) {
  const { colors } = useTheme();
  const open = usePhotoPicker(uri, onChange);
  return (
    <PressableScale
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={i18n.t(
        uri ? 'ui.editor.screens.photoRowFilledA11y' : 'ui.editor.screens.photoRowA11y'
      )}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: SIZE }}>
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityIgnoresInvertColors
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: radii.group,
            backgroundColor: colors.field,
          }}
        />
      ) : (
        <View
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: radii.group,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: colors.line2,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon as={ImagePlus} size={30} tone="secondary" />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="headline" color={colors.accent}>
          {t(uri ? 'change' : 'add')}
        </Text>
        {!uri ? (
          <Text variant="footnote" tone="secondary">
            {t('helper')}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}
