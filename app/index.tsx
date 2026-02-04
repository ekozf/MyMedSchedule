import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useStore } from '@/store';

export default function Index() {
  const { hasCompletedOnboarding, isAuthenticated, activeProfile, isLoadingAppState } = useStore();

  // Wait for app state to load before making routing decisions
  // This prevents race condition where we redirect to onboarding before checking SecureStore
  if (isLoadingAppState) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // First time user - start onboarding flow (disclaimer -> auth -> profile)
  // This only happens ONCE after installation
  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/disclaimer" />;
  }

  // Onboarding completed, but no auth or profile - go to lock screen for re-authentication
  if (!isAuthenticated || !activeProfile) {
    return <Redirect href="/(auth)/lock" />;
  }

  // User has completed onboarding and is authenticated - show main app
  return <Redirect href="/(tabs)/dashboard" />;
}
