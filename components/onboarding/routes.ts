/**
 * Routes used by onboarding / lock. Cast in one place because the generated typed route list
 * (`.expo/types/router.d.ts`) can lag behind new files until the next `expo start`.
 */
import type { Href } from 'expo-router';
import type { LaunchRoute } from './launch-route';

export const ONBOARDING_ROUTES = {
  welcome: '/(onboarding)/welcome' as Href,
  disclaimer: '/(onboarding)/disclaimer' as Href,
  disclaimerFullText: '/(onboarding)/disclaimer?viewOnly=true&fullText=true' as Href,
  /** "We updated this": agree again to a newer DISCLAIMER_VERSION (existing users). */
  disclaimerUpdated: '/(onboarding)/disclaimer?mode=updated' as Href,
  authSetup: '/(onboarding)/auth-setup' as Href,
  createProfile: '/(onboarding)/create-profile' as Href,
  lock: '/(auth)/lock' as Href,
  dashboard: '/(tabs)/dashboard' as Href,
} as const;

/** The screen for a `launchRoute()` decision. */
export function hrefForLaunchRoute(route: LaunchRoute): Href {
  return ONBOARDING_ROUTES[route];
}
