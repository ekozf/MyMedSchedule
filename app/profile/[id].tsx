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
    }
  };

  const handleSave = async () => {
    if (!id) return;
    
    setError('');
    
    if (!name.trim()) {
      setError('Please enter a name');
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
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    
    // Prevent deleting active profile
    if (activeProfile?.id === id) {
      Alert.alert(
        'Cannot Delete',
        'Cannot delete the active profile. Please switch to another profile first.'
      );
      return;
    }
    
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete this profile? This will also delete all medications associated with it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteProfile(id);
              await loadProfiles();
              router.back();
            } catch (error) {
              console.error('Failed to delete profile:', error);
              Alert.alert('Error', 'Failed to delete profile');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!profile) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6" style={{ paddingTop: insets.top + 24 }}>
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
        />
        
        {activeProfile?.id !== id && (
          <Button
            variant="ghost"
            onPress={handleDelete}
            disabled={isLoading}
            className="mt-8 flex-row items-center justify-center gap-2"
          >
            <Trash2 size={18} className="text-destructive" />
            <Text className="text-destructive font-medium">Delete Profile</Text>
          </Button>
        )}
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
            onPress={handleSave}
            disabled={isLoading || !name.trim()}
            className="flex-1"
          >
            <Text className="text-primary-foreground font-semibold">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
