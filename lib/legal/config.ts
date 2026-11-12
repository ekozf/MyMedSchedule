/**
 * Publisher, contact and legal-document constants shown in Settings › About.
 *
 * Empty URLs mean "not published yet": rows and links that point to an empty URL are not shown.
 * Bump PRIVACY_VERSION / TERMS_VERSION (and the dates) when the in-app texts change materially.
 */
export const PUBLISHER_NAME = 'Emir Kaan Özver';
export const SUPPORT_EMAIL = 'support@emirkaan.be';

export const WEBSITE_URL = '';
export const PRIVACY_POLICY_URL = '';
export const TERMS_URL = '';

export const PRIVACY_VERSION = '1.0';
/** ISO date the current privacy text took effect. */
export const PRIVACY_EFFECTIVE_DATE = '2026-11-12';
export const TERMS_VERSION = '1.0';
/** ISO date the current terms took effect. */
export const TERMS_EFFECTIVE_DATE = '2026-11-12';

/** True for a non-empty http(s) URL (rows linking to anything else are hidden). */
export function isLinkSet(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^https?:\/\/\S+$/i.test(url.trim());
}
