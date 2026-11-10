/**
 * Appearance setting (System / Light / Dark), stored in the profile settings JSON as `appearance`
 * and applied with NativeWind's colour scheme (the whole theme follows it). Default: System.
 *
 * @example
 * applyAppearance(profile.settings.appearance); // at start and after a change
 * await saveAppearance(profile, 'dark');
 */
import { colorScheme } from 'nativewind';
import { updateProfile } from '@/lib/db/operations';
import { useStore } from '@/store';
import type { Appearance, Profile } from '@/types';

export const APPEARANCES: Appearance[] = ['system', 'light', 'dark'];

export function normaliseAppearance(value: unknown): Appearance {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function applyAppearance(value: Appearance | undefined): void {
  try {
    colorScheme.set(normaliseAppearance(value));
  } catch (error) {
    console.warn('Could not apply the appearance:', error);
  }
}

/** Apply right away, then store it on the profile. */
export async function saveAppearance(profile: Profile, value: Appearance): Promise<void> {
  applyAppearance(value);
  await updateProfile(profile.id, { settings: { ...profile.settings, appearance: value } });
  await useStore.getState().loadProfiles();
}
