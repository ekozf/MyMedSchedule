import { Redirect } from 'expo-router';
import { useStore } from '@/store';
import { BrandedLoading, ONBOARDING_ROUTES } from '@/components/onboarding';

export default function Index() {
  const { hasCompletedOnboarding, isAuthenticated, activeProfile, isLoadingAppState } = useStore();

  // Wait for app state to load before making routing decisions
  // This prevents race condition where we redirect to onboarding before checking SecureStore
  if (isLoadingAppState) {
    return <BrandedLoading />;
  }

  // First time user - start onboarding flow (welcome -> disclaimer -> auth -> profile)
  // This only happens ONCE after installation
  if (!hasCompletedOnboarding) {
    return <Redirect href={ONBOARDING_ROUTES.welcome} />;
  }

  // Onboarding completed, but no auth or profile - go to lock screen for re-authentication
  if (!isAuthenticated || !activeProfile) {
    return <Redirect href={ONBOARDING_ROUTES.lock} />;
  }

  // User has completed onboarding and is authenticated - show main app
  return <Redirect href={ONBOARDING_ROUTES.dashboard} />;
}
