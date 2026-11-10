/**
 * Routes used by onboarding / lock. Cast in one place because the generated typed route list
 * (`.expo/types/router.d.ts`) can lag behind new files until the next `expo start`.
 */
import type { Href } from 'expo-router';

export const ONBOARDING_ROUTES = {
  welcome: '/(onboarding)/welcome' as Href,
  disclaimer: '/(onboarding)/disclaimer' as Href,
  disclaimerFullText: '/(onboarding)/disclaimer?viewOnly=true&fullText=true' as Href,
  authSetup: '/(onboarding)/auth-setup' as Href,
  createProfile: '/(onboarding)/create-profile' as Href,
  lock: '/(auth)/lock' as Href,
  dashboard: '/(tabs)/dashboard' as Href,
} as const;
