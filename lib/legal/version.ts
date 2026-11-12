/**
 * The app version as people (and support e-mails) see it: "1.0.1 (1000001)" from the installed
 * native build, falling back to app.json's version (Expo Go / web / tests).
 *
 * @example
 * getAppVersion() // "1.0.1 (1000001)"
 */
import * as Application from 'expo-application';
import Constants from 'expo-constants';

/** Pure formatter, exported for tests. */
export function formatAppVersion(
  nativeVersion: string | null | undefined,
  buildVersion: string | null | undefined,
  fallback: string | null | undefined
): string {
  const version = nativeVersion?.trim() || fallback?.trim() || '1.0.0';
  const build = nativeVersion?.trim() ? buildVersion?.trim() : '';
  return build ? `${version} (${build})` : version;
}

export function getAppVersion(): string {
  let nativeVersion: string | null = null;
  let buildVersion: string | null = null;
  try {
    nativeVersion = Application.nativeApplicationVersion;
    buildVersion = Application.nativeBuildVersion;
  } catch {
    // Native module missing (web / tests): use app.json.
  }
  return formatAppVersion(nativeVersion, buildVersion, Constants.expoConfig?.version);
}
