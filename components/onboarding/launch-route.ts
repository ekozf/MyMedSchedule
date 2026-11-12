/**
 * Where the app goes on start, after unlocking and after agreeing to an updated "Good to know".
 * Pure (no imports) so it can be tested and used by the store.
 *
 * Order: onboarding → lock (when locked) → updated disclaimer (when the stored agreement is for an
 * older version) → Today. The lock comes first so the updated text shows after unlocking.
 *
 * @example
 * launchRoute({ hasCompletedOnboarding: true, isAuthenticated: true, hasProfile: true,
 *   disclaimerUpToDate: false }) // 'disclaimerUpdated'
 */

/** Version of the "Good to know" text. Bump it to ask everyone to read and agree again. */
export const DISCLAIMER_VERSION = '1.1.0';

export type LaunchRoute = 'welcome' | 'lock' | 'disclaimerUpdated' | 'dashboard';

export interface LaunchState {
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  hasProfile: boolean;
  /** The current DISCLAIMER_VERSION has been agreed to on this phone. */
  disclaimerUpToDate: boolean;
}

export function launchRoute(state: LaunchState): LaunchRoute {
  if (!state.hasCompletedOnboarding) return 'welcome';
  if (!state.isAuthenticated || !state.hasProfile) return 'lock';
  if (!state.disclaimerUpToDate) return 'disclaimerUpdated';
  return 'dashboard';
}
