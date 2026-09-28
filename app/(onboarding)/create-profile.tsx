/**
 * Onboarding step 4 — "What should we call you?": creates the first profile, marks onboarding
 * complete and opens Today.
 */
import * as React from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, Trash2 } from 'lucide-react-native';
import { useStore } from '@/store';
import { createProfile, setActiveProfile } from '@/lib/db/operations';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { useActionSheet, useToast } from '@/components/ds';
import { AboutYouView, ONBOARDING_ROUTES, toAppLocale } from '@/components/onboarding';

const t = (key: string) => i18n.t(`ui.onboarding.profile.${key}`);

export default function CreateProfileScreen() {
  const [name, setName] = React.useState('');
  const [avatarUri, setAvatarUri] = React.useState<string | undefined>();
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const setStoreActiveProfile = useStore((s) => s.setActiveProfile);
  const setAuthenticated = useStore((s) => s.setAuthenticated);
  const setOnboardingCompleted = useStore((s) => s.setOnboardingCompleted);
  const showActionSheet = useActionSheet();
  const toast = useToast();

  const permissionDenied = (message: string) =>
    toast.show({ title: t('permissionTitle'), message, tone: 'warning' });

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        permissionDenied(t('cameraPermission'));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
    } catch (e) {
      console.error('Error taking photo:', e);
      toast.show({ title: t('photoError'), tone: 'danger' });
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        permissionDenied(t('libraryPermission'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
    } catch (e) {
      console.error('Error picking image:', e);
      toast.show({ title: t('photoError'), tone: 'danger' });
    }
  };

  const handleAvatarPress = async () => {
    const choice = await showActionSheet({
      title: t('photo.title'),
      options: [
        { key: 'camera', label: t('photo.take'), icon: Camera },
        { key: 'library', label: t('photo.choose'), icon: ImageIcon },
        ...(avatarUri
          ? [{ key: 'remove' as const, label: t('photo.remove'), icon: Trash2, destructive: true }]
          : []),
      ],
    });
    if (choice === 'camera') await handleTakePhoto();
    else if (choice === 'library') await handlePickImage();
    else if (choice === 'remove') setAvatarUri(undefined);
  };

  const handleCreate = async () => {
    if (creating) return;
    setError(null);
    if (!name.trim()) {
      setError(i18n.t('onboarding.enterNameError'));
      return;
    }
    setCreating(true);
    try {
      const profile = await createProfile({
        name: name.trim(),
        avatarUri,
        settings: {
          // The language chosen during onboarding (the old screen hard-coded 'en').
          language: toAppLocale(getCurrentLocale()),
          use24HourTime: true,
          authRequired: false,
        },
      });
      await setActiveProfile(profile.id);
      setStoreActiveProfile(profile);
      setAuthenticated(true);
      // Mark onboarding as completed — this ensures it only runs once.
      await setOnboardingCompleted(true);
      router.replace(ONBOARDING_ROUTES.dashboard);
    } catch (e) {
      console.error('Failed to create profile:', e);
      setError(t('createError'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <AboutYouView
      name={name}
      onNameChange={(v) => {
        setName(v);
        if (error) setError(null);
      }}
      avatarUri={avatarUri}
      onAvatarPress={handleAvatarPress}
      onStart={handleCreate}
      creating={creating}
      error={error}
    />
  );
}
