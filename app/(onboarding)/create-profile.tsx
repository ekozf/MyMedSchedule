/**
 * Onboarding last step, "What should we call you?": creates the first profile, marks onboarding
 * complete and opens Today.
 */
import * as React from 'react';
import { router } from 'expo-router';
import { useStore } from '@/store';
import { createProfile, setActiveProfile } from '@/lib/db/operations';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { AboutYouView, ONBOARDING_ROUTES, toAppLocale } from '@/components/onboarding';

const t = (key: string) => i18n.t(`ui.onboarding.profile.${key}`);

export default function CreateProfileScreen() {
  const [name, setName] = React.useState('');
  const [avatarUri, setAvatarUri] = React.useState<string | undefined>();
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const setStoreActiveProfile = useStore((s) => s.setActiveProfile);
  const setAuthenticated = useStore((s) => s.setAuthenticated);
  const setOnboardingCompleted = useStore((s) => s.setOnboardingCompleted);

  const handleCreate = async () => {
    if (creating) return;
    setError(null);
    if (!name.trim()) {
      setError(t('nameRequired'));
      return;
    }
    setCreating(true);
    try {
      const profile = await createProfile({
        name: name.trim(),
        avatarUri,
        settings: {
          // The language chosen during onboarding.
          language: toAppLocale(getCurrentLocale()),
          use24HourTime: true,
          authRequired: false,
        },
      });
      await setActiveProfile(profile.id);
      setStoreActiveProfile(profile);
      setAuthenticated(true);
      // Mark onboarding as completed, so it only runs once.
      await setOnboardingCompleted(true);
      router.replace(ONBOARDING_ROUTES.dashboard);
    } catch (e) {
      console.error('Failed to create profile:', e);
      setError(t('createError'));
      setCreating(false);
    }
  };

  return (
    <AboutYouView
      name={name}
      onNameChange={(v) => {
        setName(v);
        if (error) setError(null);
      }}
      avatarUri={avatarUri}
      onAvatarChange={setAvatarUri}
      onStart={handleCreate}
      creating={creating}
      error={error}
    />
  );
}
