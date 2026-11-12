import { Redirect } from 'expo-router';
import { useStore } from '@/store';
import { BrandedLoading, hrefForLaunchRoute, launchRoute } from '@/components/onboarding';

export default function Index() {
  const {
    hasCompletedOnboarding,
    isAuthenticated,
    activeProfile,
    disclaimerUpToDate,
    isLoadingAppState,
  } = useStore();

  // Wait for app state to load before making routing decisions
  // This prevents race condition where we redirect to onboarding before checking SecureStore
  if (isLoadingAppState) {
    return <BrandedLoading />;
  }

  // First start: onboarding (welcome → disclaimer → lock → profile, once). Locked: the lock screen,
  // which unlocks to the updated "Good to know" when it changed, else Today. See launch-route.ts.
  const route = launchRoute({
    hasCompletedOnboarding,
    isAuthenticated,
    hasProfile: !!activeProfile,
    disclaimerUpToDate,
  });
  return <Redirect href={hrefForLaunchRoute(route)} />;
}
