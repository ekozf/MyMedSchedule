import { View, ScrollView, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { router } from 'expo-router';
import { useStore } from '@/store';
import { useState, useEffect } from 'react';
import {
  User,
  Globe,
  Lock,
  Info,
  ChevronRight,
  Plus,
  LogOut,
} from 'lucide-react-native';
import i18n, { setLocale } from '@/lib/i18n';
import { getAuthMethod } from '@/lib/auth';
import { updateProfile, deleteProfile, setActiveProfile as setActiveProfileDB, getAllProfiles } from '@/lib/db/operations';
import Constants from 'expo-constants';

const getLanguageOptions = () => [
  { label: i18n.t('settings.languages.en'), value: 'en' },
  { label: i18n.t('settings.languages.tr'), value: 'tr' },
  { label: i18n.t('settings.languages.nl'), value: 'nl' },
];

export default function SettingsScreen() {
  const { activeProfile, profiles, setActiveProfile, loadProfiles } = useStore();
  const [authMethod, setAuthMethodState] = useState<string>('none');
  const [language, setLanguage] = useState('en');
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    loadAuthMethod();
    loadAllProfiles();
    
    if (activeProfile) {
      setLanguage(activeProfile.settings.language);
    }
  }, [activeProfile]);
  
  const loadAuthMethod = async () => {
    const method = await getAuthMethod();
    setAuthMethodState(method);
  };
  
  const loadAllProfiles = async () => {
    const allProfiles = await getAllProfiles();
    // Update store if needed
  };
  
  const handleLanguageChange = async (newLanguage: string) => {
    if (!activeProfile) return;
    
    try {
      await updateProfile(activeProfile.id, {
        settings: {
          ...activeProfile.settings,
          language: newLanguage as 'en' | 'tr' | 'nl',
        },
      });
      
      setLanguage(newLanguage);
      setLocale(newLanguage as 'en' | 'tr' | 'nl');
      
      // Force re-render of this component
      forceUpdate({});
      
      // Reload profile
      await loadProfiles();
    } catch (error) {
      console.error('Failed to update language:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    }
  };
  
  const handleManageProfiles = () => {
    router.push('/profile/create');
  };
  
  const handleEditProfile = (profileId: string) => {
    router.push(`/profile/${profileId}`);
  };
  
  const handleDeleteProfile = async (profileId: string) => {
    if (activeProfile?.id === profileId) {
      Alert.alert('Error', 'Cannot delete the active profile');
      return;
    }
    
    Alert.alert(
      'Delete Profile',
      'Are you sure? This will delete all medications for this profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProfile(profileId);
              await loadProfiles();
            } catch (error) {
              console.error('Failed to delete profile:', error);
              Alert.alert('Error', 'Failed to delete profile');
            }
          },
        },
      ]
    );
  };
  
  const handleSwitchProfile = async (profileId: string) => {
    try {
      await setActiveProfileDB(profileId);
      await loadProfiles();
    } catch (error) {
      console.error('Failed to switch profile:', error);
      Alert.alert('Error', 'Failed to switch profile');
    }
  };
  
  const handleConfigureAuth = () => {
    router.push('/(onboarding)/auth-setup?reconfigure=true');
  };
  
  const handleViewDisclaimer = () => {
    router.push('/(onboarding)/disclaimer?viewOnly=true');
  };
  
  const getAuthMethodLabel = () => {
    switch (authMethod) {
      case 'biometric':
        return i18n.t('settings.authMethods.biometric');
      case 'pin':
        return i18n.t('settings.authMethods.pin');
      case 'none':
        return i18n.t('settings.authMethods.none');
      default:
        return i18n.t('settings.authMethods.none');
    }
  };
  
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4">
        <Text className="text-2xl font-bold mb-6 text-foreground">
          {i18n.t('settings.title')}
        </Text>
        
        {/* Profile Management */}
        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row items-center gap-2">
              <User size={20} className="text-primary" />
              <CardTitle>{i18n.t('settings.profiles')}</CardTitle>
            </View>
          </CardHeader>
          <CardContent className="gap-3">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                isActive={profile.id === activeProfile?.id}
                onPress={() => profile.id !== activeProfile?.id && handleSwitchProfile(profile.id)}
                onEdit={() => handleEditProfile(profile.id)}
                onDelete={() => handleDeleteProfile(profile.id)}
              />
            ))}
            
            <Button
              variant="outline"
              onPress={handleManageProfiles}
              className="flex-row items-center justify-center gap-2 mt-2"
            >
              <Plus size={20} className="text-foreground" />
              <Text>{i18n.t('settings.addNewProfile')}</Text>
            </Button>
          </CardContent>
        </Card>
        
        {/* Language */}
        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row items-center gap-2">
              <Globe size={20} className="text-primary" />
              <CardTitle>{i18n.t('settings.language')}</CardTitle>
            </View>
          </CardHeader>
          <CardContent>
            <Select
              options={getLanguageOptions()}
              value={language}
              onValueChange={handleLanguageChange}
              placeholder={i18n.t('settings.selectLanguage')}
            />
          </CardContent>
        </Card>
        
        {/* Authentication */}
        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row items-center gap-2">
              <Lock size={20} className="text-primary" />
              <CardTitle>{i18n.t('settings.authentication')}</CardTitle>
            </View>
          </CardHeader>
          <CardContent className="gap-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-medium text-foreground">
                  {i18n.t('settings.currentMethod')}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {getAuthMethodLabel()}
                </Text>
              </View>
            </View>
            
            <Button
              variant="outline"
              onPress={handleConfigureAuth}
              className="flex-row items-center justify-center gap-2"
            >
              <Text>{i18n.t('settings.configureAuth')}</Text>
              <ChevronRight size={16} className="text-foreground" />
            </Button>
          </CardContent>
        </Card>
        
        {/* About */}
        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row items-center gap-2">
              <Info size={20} className="text-primary" />
              <CardTitle>{i18n.t('settings.about')}</CardTitle>
            </View>
          </CardHeader>
          <CardContent className="gap-3">
            <Pressable
              onPress={handleViewDisclaimer}
              className="flex-row items-center justify-between py-2"
            >
              <Text className="text-base text-foreground">{i18n.t('settings.viewDisclaimer')}</Text>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Pressable>
            
            <View className="pt-2 border-t border-border">
              <Text className="text-sm text-muted-foreground">
                {i18n.t('settings.version', { version: Constants.expoConfig?.version || '1.0.0' })}
              </Text>
              <Text className="text-xs text-muted-foreground mt-1">
                {i18n.t('settings.appDescription')}
              </Text>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
