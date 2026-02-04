import { View, ScrollView, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProfileById, updateProfile, deleteProfile } from '@/lib/db/operations';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X, Trash2 } from 'lucide-react-native';
import type { Profile } from '@/types';
import i18n from '@/lib/i18n';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { loadProfiles, activeProfile } = useStore();

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    if (!id) return;

    try {
      const loadedProfile = await getProfileById(id);
      if (loadedProfile) {
        setProfile(loadedProfile);
        setName(loadedProfile.name);
        setAvatarUri(loadedProfile.avatarUri);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(i18n.t('profile.permissionRequired'), i18n.t('profile.photoLibraryPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(i18n.t('profile.permissionRequired'), i18n.t('profile.cameraPermission'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    setError('');

    if (!name.trim()) {
      setError(i18n.t('profile.pleaseEnterName'));
      return;
    }

    setIsLoading(true);

    try {
      await updateProfile(id, {
        name: name.trim(),
        avatarUri,
      });

      await loadProfiles();
      router.back();
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError(i18n.t('profile.failedToUpdate'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;

    // Prevent deleting active profile
    if (activeProfile?.id === id) {
      Alert.alert(i18n.t('profile.cannotDelete'), i18n.t('profile.cannotDeleteActiveMessage'));
      return;
    }

    Alert.alert(i18n.t('profile.deleteProfile'), i18n.t('profile.deleteConfirmMessageFull'), [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoading(true);
            await deleteProfile(id);
            await loadProfiles();
            router.back();
          } catch (error) {
            console.error('Failed to delete profile:', error);
            Alert.alert(i18n.t('common.error'), i18n.t('profile.failedToDelete'));
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  if (!profile) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-muted-foreground">{i18n.t('profile.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6" style={{ paddingTop: insets.top + 24 }}>
        <View className="mb-8 items-center">
          <Avatar uri={avatarUri} fallback={name} size="xl" className="mb-4" />
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              onPress={handleTakePhoto}
              className="flex-row items-center gap-2">
              <Camera size={18} className="text-foreground" />
              <Text>{i18n.t('profile.camera')}</Text>
            </Button>
            <Button
              variant="outline"
              onPress={handlePickImage}
              className="flex-row items-center gap-2">
              <ImageIcon size={18} className="text-foreground" />
              <Text>{i18n.t('profile.gallery')}</Text>
            </Button>
            {avatarUri && (
              <Button variant="ghost" onPress={() => setAvatarUri(undefined)}>
                <X size={18} className="text-muted-foreground" />
              </Button>
            )}
          </View>
        </View>

        <Input
          label={i18n.t('profile.name')}
          value={name}
          onChangeText={setName}
          placeholder={i18n.t('profile.enterName')}
          error={error}
        />

        {activeProfile?.id !== id && (
          <Button
            variant="ghost"
            onPress={handleDelete}
            disabled={isLoading}
            className="mt-8 flex-row items-center justify-center gap-2">
            <Trash2 size={18} className="text-destructive" />
            <Text className="font-medium text-destructive">{i18n.t('profile.deleteProfile')}</Text>
          </Button>
        )}
      </ScrollView>

      <View className="border-t border-border bg-background px-6 pb-6 pt-4">
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            onPress={() => router.back()}
            disabled={isLoading}
            className="flex-1">
            <Text>{i18n.t('common.cancel')}</Text>
          </Button>
          <Button onPress={handleSave} disabled={isLoading || !name.trim()} className="flex-1">
            <Text className="font-semibold text-primary-foreground">
              {isLoading ? i18n.t('profile.saving') : i18n.t('profile.saveChanges')}
            </Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
