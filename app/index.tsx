import { Redirect } from 'expo-router';
import { useStore } from '@/store';

export default function Index() {
  const { hasCompletedOnboarding, isAuthenticated, activeProfile } = useStore();

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
