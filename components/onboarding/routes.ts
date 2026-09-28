/**
 * Routes used by onboarding / lock. `welcome` and `/dev/onboarding` are new files that the typed
 * route list (`.expo/types/router.d.ts`) only learns about on the next `expo start`, so they are
 * cast here, in one place.
 */
import type { Href } from 'expo-router';

export const ONBOARDING_ROUTES = {
  welcome: '/(onboarding)/welcome' as unknown as Href,
  disclaimer: '/(onboarding)/disclaimer' as Href,
  authSetup: '/(onboarding)/auth-setup' as Href,
  createProfile: '/(onboarding)/create-profile' as Href,
  lock: '/(auth)/lock' as Href,
  dashboard: '/(tabs)/dashboard' as Href,
} as const;
