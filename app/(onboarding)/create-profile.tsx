import { View, ScrollView, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { useState } from 'react';
import { router } from 'expo-router';
import { useStore } from '@/store';
import { createProfile, setActiveProfile } from '@/lib/db/operations';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import i18n from '@/lib/i18n';

export default function CreateProfileScreen() {
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setActiveProfile: setStoreActiveProfile, setAuthenticated, setOnboardingCompleted } = useStore();

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(i18n.t('onboarding.permissionRequired'), i18n.t('onboarding.photoLibraryPermission'));
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
      Alert.alert(i18n.t('common.error'), i18n.t('onboarding.photoPickError'));
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(i18n.t('onboarding.permissionRequired'), i18n.t('onboarding.cameraPermission'));
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
      Alert.alert(i18n.t('common.error'), i18n.t('onboarding.photoTakeError'));
    }
  };

  const handleImageAction = () => {
    Alert.alert(
      i18n.t('onboarding.profilePicture'),
      i18n.t('onboarding.chooseOption'),
      [
        { text: i18n.t('onboarding.takePhoto'), onPress: handleTakePhoto },
        { text: i18n.t('onboarding.chooseFromLibrary'), onPress: handlePickImage },
        { text: i18n.t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleCreate = async () => {
    setError('');
    
    if (!name.trim()) {
      setError(i18n.t('onboarding.enterNameError'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create profile
      const profile = await createProfile({
        name: name.trim(),
        avatarUri,
        settings: {
          language: 'en',
          use24HourTime: true,
          authRequired: false,
        },
      });
      
      // Set as active profile
      await setActiveProfile(profile.id);
      
      // Update store
      setStoreActiveProfile(profile);
      setAuthenticated(true);
      
      // Mark onboarding as completed - this ensures it only runs once
      await setOnboardingCompleted(true);
      
      // Navigate to main app
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.error('Failed to create profile:', error);
      setError(i18n.t('onboarding.createProfileError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background pt-12">
      <ScrollView className="flex-1 px-6 pt-4">
        <Text className="text-3xl font-bold mb-2 text-foreground">
          {i18n.t('onboarding.createProfileTitle')}
        </Text>
        
        <Text className="text-base text-muted-foreground mb-8">
          {i18n.t('onboarding.createProfileDescription')}
        </Text>
        
        {/* Avatar Selection */}
        <View className="items-center mb-8">
          <Avatar
            uri={avatarUri}
            fallback={name}
            size="xl"
            className="mb-4"
          />
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              onPress={handleTakePhoto}
              className="flex-row items-center gap-2"
            >
              <Camera size={18} className="text-foreground" />
              <Text>{i18n.t('onboarding.camera')}</Text>
            </Button>
            <Button
              variant="outline"
              onPress={handlePickImage}
              className="flex-row items-center gap-2"
            >
              <ImageIcon size={18} className="text-foreground" />
              <Text>{i18n.t('onboarding.gallery')}</Text>
            </Button>
          </View>
        </View>
        
        {/* Name Input */}
        <Input
          label={i18n.t('onboarding.profileNameLabel')}
          value={name}
          onChangeText={setName}
          placeholder={i18n.t('onboarding.profileNamePlaceholder')}
          error={error}
          autoFocus
        />
        
        <Text className="text-sm text-muted-foreground mt-4 mb-8">
          {i18n.t('onboarding.additionalProfilesNote')}
        </Text>
      </ScrollView>
      
      <View className="px-6 pb-8 pt-4 border-t border-border bg-background">
        <Button
          onPress={handleCreate}
          disabled={isLoading || !name.trim()}
        >
          <Text className="text-primary-foreground font-semibold">
            {isLoading ? i18n.t('onboarding.creatingProfile') : i18n.t('onboarding.createProfile')}
          </Text>
        </Button>
      </View>
    </View>
  );
}
