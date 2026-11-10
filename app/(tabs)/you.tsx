/**
 * Settings tab (spec §5.6, route `you`): title, the person in use, reminders and app lock,
 * preferences (language, appearance, 24-hour time, parts of the day), people in this app (switch
 * with confirm + Undo toast; "Manage people" edits and removes), export and about.
 */
import * as React from 'react';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { useStore } from '@/store';
import { updateProfile } from '@/lib/db/operations';
import { formatTime, formatTimeString } from '@/lib/ui/format';
import { normaliseAppearance, saveAppearance } from '@/lib/settings/appearance';
import { useNotificationPermission } from '@/lib/notifications/use-permission';
import { AppearanceSheet, appearanceLabel } from '@/components/you/AppearanceSheet';
import { useCompartmentBoundaries } from '@/lib/settings/compartments';
import { EmptyState, Screen, useToast } from '@/components/ds';
import { YouView } from '@/components/you/YouView';
import { languageName, toAppLocale } from '@/components/onboarding';
import { appLockLabel, getAppLockKind } from '@/components/you/app-lock';
import { partsOfDayValue } from '@/components/you/compartment-times';
import { YOU_ROUTES } from '@/components/you/routes';
import { useSwitchPerson, type ProfileLite } from '@/components/you/profile-actions';

const EXAMPLE_TIME = new Date(2000, 0, 1, 20, 0);
const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.you.${key}`, opts);

export default function YouRoute() {
  const toast = useToast();
  const { boundaries } = useCompartmentBoundaries();
  const permission = useNotificationPermission();
  const [appearanceOpen, setAppearanceOpen] = React.useState(false);

  const activeProfile = useStore((s) => s.activeProfile);
  const profiles = useStore((s) => s.profiles);
  const loadProfiles = useStore((s) => s.loadProfiles);

  const [pending24h, setPending24h] = React.useState<boolean | null>(null);
  const [lockLabel, setLockLabel] = React.useState<string | null>(null);
  const askToSwitch = useSwitchPerson();

  // The lock can change on the App lock page; refresh whenever we come back.
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      getAppLockKind()
        .then((kind) => alive && setLockLabel(appLockLabel(kind)))
        .catch(() => alive && setLockLabel(appLockLabel('off')));
      return () => {
        alive = false;
      };
    }, [])
  );

  if (!activeProfile) {
    return (
      <Screen bottomInset="tabBar">
        <EmptyState title={t('export.noProfile')} message={t('export.noProfileMessage')} />
      </Screen>
    );
  }

  const is24h = pending24h ?? activeProfile.settings?.use24HourTime ?? true;
  const appearance = normaliseAppearance(activeProfile.settings?.appearance);

  const changeAppearance = async (value: typeof appearance) => {
    try {
      await saveAppearance(activeProfile, value);
    } catch (error) {
      console.error('Failed to save appearance:', error);
      toast.show({ title: t('preferences.saveFailed') });
    }
  };

  const handleSelect = async (lite: ProfileLite) => {
    if (lite.id === activeProfile.id) {
      router.push(YOU_ROUTES.editProfile(lite.id));
      return;
    }
    await askToSwitch(lite);
  };

  const toggle24h = async (value: boolean) => {
    setPending24h(value);
    try {
      await updateProfile(activeProfile.id, {
        settings: { ...activeProfile.settings, use24HourTime: value },
      });
      await loadProfiles();
    } catch (error) {
      console.error('Failed to update time format:', error);
      toast.show({ title: t('preferences.saveFailed') });
    } finally {
      setPending24h(null);
    }
  };

  return (
    <Screen bottomInset="tabBar">
      <YouView
        profile={activeProfile}
        profiles={profiles}
        languageLabel={languageName(toAppLocale(getCurrentLocale()))}
        is24h={is24h}
        timeExample={formatTime(EXAMPLE_TIME, is24h)}
        partsOfDay={partsOfDayValue(boundaries, (hhmm) => formatTimeString(hhmm, is24h))}
        appearanceLabel={appearanceLabel(appearance)}
        reminders={permission.state}
        lockLabel={lockLabel}
        version={Constants.expoConfig?.version ?? '1.0.0'}
        onEditProfile={() => router.push(YOU_ROUTES.editProfile(activeProfile.id))}
        onSelectProfile={handleSelect}
        onAddProfile={() => router.push(YOU_ROUTES.createProfile)}
        onManagePeople={() => router.push(YOU_ROUTES.managePeople)}
        onLanguage={() => router.push(YOU_ROUTES.language)}
        onToggle24h={toggle24h}
        onCompartments={() => router.push(YOU_ROUTES.compartments)}
        onAppearance={() => setAppearanceOpen(true)}
        onReminders={() => router.push(YOU_ROUTES.reminders)}
        onAppLock={() => router.push(YOU_ROUTES.appLock)}
        onExport={() => router.push(YOU_ROUTES.export)}
        onGoodToKnow={() => router.push(YOU_ROUTES.goodToKnow)}
      />
      <AppearanceSheet
        visible={appearanceOpen}
        value={appearance}
        onChange={changeAppearance}
        onClose={() => setAppearanceOpen(false)}
      />
    </Screen>
  );
}
