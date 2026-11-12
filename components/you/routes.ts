/**
 * Pages reachable from the You tab. Cast in one place because the generated typed route list
 * (`.expo/types/router.d.ts`) can lag behind new files until the next `expo start`.
 */
import type { Href } from 'expo-router';

export const YOU_ROUTES = {
  language: '/settings/language' as Href,
  compartments: '/settings/compartments' as Href,
  reminders: '/settings/reminders' as Href,
  appLock: '/(onboarding)/auth-setup?reconfigure=true' as Href,
  export: '/export' as Href,
  goodToKnow: '/(onboarding)/disclaimer?viewOnly=true' as Href,
  privacy: '/settings/privacy' as Href,
  terms: '/settings/terms' as Href,
  licenses: '/settings/licenses' as Href,
  license: (id: string) => ({ pathname: '/settings/license/[id]', params: { id } }) as Href,
  support: '/settings/support' as Href,
  deleteAll: '/settings/delete-data' as Href,
  createProfile: '/profile/create' as Href,
  managePeople: '/profile/manage' as Href,
  editProfile: (id: string) => ({ pathname: '/profile/[id]', params: { id } }) as Href,
} as const;
