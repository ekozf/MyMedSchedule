/**
 * Opens links that leave the app (mail app, browser) with auto-lock suspended, so a longer trip
 * doesn't lock the app behind the person's back.
 *
 * @example
 * const opened = await openSupportEmail('English (en)');
 * if (!opened) toast.show({ title: … });   // no mail app: show the address instead
 */
import { Linking, Platform } from 'react-native';
import * as Device from 'expo-device';
import i18n from '@/lib/i18n';
import { withAutoLockSuspended } from '@/lib/auth/auto-lock';
import { SUPPORT_EMAIL, isLinkSet } from './config';
import { getAppVersion } from './version';
import {
  buildSupportBody,
  buildSupportMailto,
  formatDevice,
  formatSystem,
  type SupportMailLabels,
} from './support-mail';

const m = (key: keyof SupportMailLabels | 'subject') => i18n.t(`ui.about.support.mail.${key}`);

/** Builds the prefilled support e-mail URL for this phone. */
export function supportMailtoUrl(language: string): string {
  const body = buildSupportBody(
    {
      appVersion: getAppVersion(),
      system: formatSystem(
        Device.osName ?? Platform.OS,
        Device.osVersion ?? String(Platform.Version)
      ),
      device: formatDevice(Device.brand, Device.modelName),
      language,
    },
    {
      greeting: m('greeting'),
      prompt: m('prompt'),
      noMedical: m('noMedical'),
      infoHeader: m('infoHeader'),
      appVersion: m('appVersion'),
      system: m('system'),
      device: m('device'),
      language: m('language'),
    }
  );
  return buildSupportMailto(SUPPORT_EMAIL, { subject: m('subject'), body });
}

/** Opens the mail app with the support e-mail. Resolves false when no app could open it. */
export async function openSupportEmail(language: string): Promise<boolean> {
  // No canOpenURL: Android 11+ would need a <queries> entry for mailto, and openURL rejects
  // anyway when nothing can handle the link.
  try {
    await withAutoLockSuspended(() => Linking.openURL(supportMailtoUrl(language)));
    return true;
  } catch (error) {
    console.warn('Could not open the mail app:', error);
    return false;
  }
}

/** Opens an https link in the browser. Resolves false for an empty URL or when it fails. */
export async function openExternalLink(url: string): Promise<boolean> {
  if (!isLinkSet(url)) return false;
  try {
    await withAutoLockSuspended(() => Linking.openURL(url.trim()));
    return true;
  } catch (error) {
    console.warn('Could not open link:', error);
    return false;
  }
}
