import { View, ScrollView, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { useState } from 'react';
import { router } from 'expo-router';
import { useStore } from '@/store';
import { createProfile } from '@/lib/db/operations';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';

export default function CreateProfileScreen() {
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { loadProfiles } = useStore();

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
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
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your camera');
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
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleCreate = async () => {
    setError('');
    
    if (!name.trim()) {
      setError('Please enter a name');
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
      setError('Failed to create profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6 pt-6">
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
              <Text>Camera</Text>
            </Button>
            <Button
              variant="outline"
              onPress={handlePickImage}
              className="flex-row items-center gap-2"
            >
              <ImageIcon size={18} className="text-foreground" />
              <Text>Gallery</Text>
            </Button>
            {avatarUri && (
              <Button
                variant="ghost"
                onPress={() => setAvatarUri(undefined)}
              >
                <X size={18} className="text-muted-foreground" />
              </Button>
            )}
          </View>
        </View>
        
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Enter profile name"
          error={error}
          autoFocus
        />
      </ScrollView>
      
      <View className="px-6 pb-6 pt-4 border-t border-border bg-background">
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            onPress={() => router.back()}
            disabled={isLoading}
            className="flex-1"
          >
            <Text>Cancel</Text>
          </Button>
          <Button
            onPress={handleCreate}
            disabled={isLoading || !name.trim()}
            className="flex-1"
          >
            <Text className="text-primary-foreground font-semibold">
              {isLoading ? 'Creating...' : 'Create Profile'}
            </Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
