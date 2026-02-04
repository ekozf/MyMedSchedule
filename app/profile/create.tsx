import { View, ScrollView, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { useState } from 'react';
import { router } from 'expo-router';
import { useStore } from '@/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createProfile } from '@/lib/db/operations';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import i18n from '@/lib/i18n';

export default function CreateProfileScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { loadProfiles } = useStore();

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
      Alert.alert(i18n.t('common.error'), i18n.t('profile.failedToPickImage'));
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
      Alert.alert(i18n.t('common.error'), i18n.t('profile.failedToTakePhoto'));
    }
  };

  const handleCreate = async () => {
    setError('');

    if (!name.trim()) {
      setError(i18n.t('profile.pleaseEnterName'));
      return;
    }

    setIsLoading(true);

    try {
      await createProfile({
        name: name.trim(),
        avatarUri,
        settings: {
          language: 'en',
          use24HourTime: true,
          authRequired: false,
        },
      });

      // Reload profiles
      await loadProfiles();

      // Navigate back
      router.back();
    } catch (error) {
      console.error('Failed to create profile:', error);
      setError(i18n.t('profile.failedToCreate'));
    } finally {
      setIsLoading(false);
    }
  };

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
          autoFocus
        />
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
          <Button onPress={handleCreate} disabled={isLoading || !name.trim()} className="flex-1">
            <Text className="font-semibold text-primary-foreground">
              {isLoading ? i18n.t('profile.creating') : i18n.t('profile.createProfile')}
            </Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
