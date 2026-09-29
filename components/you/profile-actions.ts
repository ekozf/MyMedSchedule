/**
 * Profile business logic shared by the You screen and the profile pages.
 * Order of calls matches the previous ProfileSwitcher / settings / profile screens.
 */
import * as React from 'react';
import { Trash2 } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import {
  deleteProfile,
  getMedicationsByProfile,
  setActiveProfile as setActiveProfileDB,
} from '@/lib/db/operations';
import {
  cancelAllNotificationsForMedication,
  ensureNext3DoseNotificationsForAllActiveMedications,
} from '@/lib/notifications/scheduler';
import { useConfirm } from '@/components/ds';
import type { Profile } from '@/types';

export type ProfileLite = Pick<Profile, 'id' | 'name' | 'avatarUri'>;

/** "Anna de Vries" → "Anna". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Makes `profile` the active one (DB → store → medicines → profiles) and tops up its reminders. */
export async function switchToProfile(profile: Profile): Promise<void> {
  const store = useStore.getState();
  await setActiveProfileDB(profile.id);
  store.setActiveProfile(profile);
  await store.loadMedications(profile.id);
  await store.loadProfiles();
  // Best-effort: keeps the next reminders of the new profile scheduled.
  ensureNext3DoseNotificationsForAllActiveMedications().catch((error) =>
    console.error('Failed to top up reminders after switching profile:', error)
  );
}

/**
 * Deletes a (non-active) profile. Its medicines and logs are removed by the DB cascade; their
 * scheduled reminders are cancelled first so they don't keep firing for a deleted profile.
 */
export async function removeProfile(profileId: string): Promise<void> {
  try {
    const meds = await getMedicationsByProfile(profileId, false);
    for (const med of meds) await cancelAllNotificationsForMedication(med.id);
  } catch (error) {
    console.error('Failed to cancel reminders of deleted profile:', error);
  }
  await deleteProfile(profileId);
  await useStore.getState().loadProfiles();
}

/** Danger confirm for deleting a profile. Resolves true when the person confirmed. */
export function useConfirmDeleteProfile() {
  const confirm = useConfirm();
  return React.useCallback(
    (profile: ProfileLite) => {
      const name = firstName(profile.name);
      return confirm({
        title: i18n.t('ui.you.form.deleteTitle', { name }),
        message: i18n.t('ui.you.form.deleteMessage', { name }),
        confirmLabel: i18n.t('ui.you.form.deleteConfirm'),
        tone: 'danger',
        icon: Trash2,
      });
    },
    [confirm]
  );
}
