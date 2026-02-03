import { View, Pressable, Modal, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, Check } from 'lucide-react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useStore } from '@/store';
import { setActiveProfile as setActiveProfileDB } from '@/lib/db/operations';
import type { Profile } from '@/types';

export function ProfileSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { activeProfile, profiles, setActiveProfile, loadMedications } = useStore();
  
  const handleSelectProfile = async (profile: Profile) => {
    try {
      // Set active profile in database
      await setActiveProfileDB(profile.id);
      
      // Update store
      setActiveProfile(profile);
      
      // Load medications for new profile
      await loadMedications(profile.id);
      
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch profile:', error);
    }
  };
  
  const handleCreateProfile = () => {
    setIsOpen(false);
    router.push('/profile/create');
  };
  
  if (!activeProfile) return null;
  
  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        className="flex-row items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50"
      >
        <Avatar
          uri={activeProfile.avatarUri}
          fallback={activeProfile.name}
          size="sm"
        />
        <Text className="text-sm font-medium text-foreground flex-1">
          {activeProfile.name}
        </Text>
        <ChevronDown size={16} className="text-muted-foreground" />
      </Pressable>
      
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center p-4"
          onPress={() => setIsOpen(false)}
        >
          <Pressable
            className="bg-background rounded-xl w-full max-w-sm max-h-96 overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="p-4 border-b border-border">
              <Text className="text-lg font-semibold text-foreground">
                Switch Profile
              </Text>
            </View>
            
            <ScrollView className="max-h-80">
              {profiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  onPress={() => handleSelectProfile(profile)}
                  className="flex-row items-center gap-3 p-4 border-b border-border"
                >
                  <Avatar
                    uri={profile.avatarUri}
                    fallback={profile.name}
                    size="md"
                  />
                  <Text
                    className={`text-base flex-1 ${
                      profile.id === activeProfile.id
                        ? 'font-semibold text-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {profile.name}
                  </Text>
                  {profile.id === activeProfile.id && (
                    <Check size={20} className="text-primary" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            
            <View className="p-4 border-t border-border gap-2">
              <Button
                variant="outline"
                onPress={handleCreateProfile}
                className="flex-row items-center justify-center gap-2"
              >
                <Plus size={20} className="text-foreground" />
                <Text className="font-medium">Create New Profile</Text>
              </Button>
              
              <Button
                variant="ghost"
                onPress={() => setIsOpen(false)}
              >
                <Text className="text-muted-foreground">Cancel</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
