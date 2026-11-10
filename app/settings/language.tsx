/**
 * You → Language (spec §5.6): one option per language; picking one switches right away. The
 * locale change remounts the navigator, which rehydrates this same page in the new language.
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n, { getCurrentLocale, setLocale } from '@/lib/i18n';
import { useStore } from '@/store';
import { updateProfile } from '@/lib/db/operations';
import { NavHeader, Screen, Text, useToast } from '@/components/ds';
import { LanguageOptions, toAppLocale, type AppLocale } from '@/components/onboarding';

export default function LanguageRoute() {
  const toast = useToast();
  const activeProfile = useStore((s) => s.activeProfile);
  const loadProfiles = useStore((s) => s.loadProfiles);
  const current = toAppLocale(getCurrentLocale());
  const [busy, setBusy] = React.useState(false);

  const choose = async (language: AppLocale) => {
    if (busy || language === current) return;
    setBusy(true);
    try {
      if (activeProfile) {
        await updateProfile(activeProfile.id, {
          settings: { ...activeProfile.settings, language },
        });
      }
      await loadProfiles();
      // Remounts the screens so every string re-renders in the new language.
      await setLocale(language);
    } catch (error) {
      console.error('Failed to update language:', error);
      toast.show({ title: i18n.t('ui.you.preferences.saveFailed') });
      setBusy(false);
    }
  };

  return (
    <Screen header={<NavHeader />}>
      <View style={{ gap: 8, marginBottom: 24, paddingTop: 8 }}>
        <Text variant="title1">{i18n.t('ui.you.language.title')}</Text>
        <Text variant="body" tone="secondary">
          {i18n.t('ui.you.language.body')}
        </Text>
      </View>
      <LanguageOptions current={current} onSelect={choose} disabled={busy} />
    </Screen>
  );
}
