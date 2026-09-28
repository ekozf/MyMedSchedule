/**
 * You (pushed from the avatar on every tab): active profile, switching profiles, preferences, app lock, export and about.
 */
import * as React from 'react';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Pencil, Repeat, Trash2, UserRound } from 'lucide-react-native';
import Constants from 'expo-constants';
import i18n, { getCurrentLocale, setLocale } from '@/lib/i18n';
import { useStore } from '@/store';
import { updateProfile } from '@/lib/db/operations';
import { formatTime } from '@/lib/ui/format';
import { EmptyState, NavHeader, Screen, haptics, useActionSheet, useToast } from '@/components/ds';
import { ModalScope } from '@/components/you/ModalScope';
import { YouView } from '@/components/you/YouView';
import {
  LanguageSheet,
  isAppLanguage,
  languageName,
  type AppLanguage,
} from '@/components/you/LanguageSheet';
import { getAppLockKind, type AppLockKind } from '@/components/you/app-lock';
import {
  firstName,
  removeProfile,
  switchToProfile,
  useConfirmDeleteProfile,
  type ProfileLite,
} from '@/components/you/profile-actions';
import { useToastRelayHost } from '@/components/you/toast-relay';

const EXAMPLE_TIME = new Date(2000, 0, 1, 20, 0);

export default function YouRoute() {
  return (
    <ModalScope>
      <YouScreen />
    </ModalScope>
  );
}

function YouScreen() {
  const toast = useToast();
  useToastRelayHost(toast);
  const showActionSheet = useActionSheet();
  const confirmDelete = useConfirmDeleteProfile();

  const activeProfile = useStore((s) => s.activeProfile);
  const profiles = useStore((s) => s.profiles);
  const loadProfiles = useStore((s) => s.loadProfiles);

  const [languageOpen, setLanguageOpen] = React.useState(false);
  const pendingLanguage = React.useRef<AppLanguage | null>(null);
  const [pending24h, setPending24h] = React.useState<boolean | null>(null);
  const [lock, setLock] = React.useState<AppLockKind | null>(null);
  const switching = React.useRef(false);

  // App lock can change on the auth-setup screen; refresh whenever we come back.
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      getAppLockKind()
        .then((kind) => alive && setLock(kind))
        .catch(() => alive && setLock('off'));
      return () => {
        alive = false;
      };
    }, [])
  );

  if (!activeProfile) {
    return (
      <Screen header={<NavHeader />}>
        <EmptyState icon={UserRound} title={i18n.t('ui.you.export.noProfile')} />
      </Screen>
    );
  }

  const is24h = pending24h ?? activeProfile.settings?.use24HourTime ?? true;
  const locale = getCurrentLocale();

  const openProfile = (id: string) => router.push({ pathname: '/profile/[id]', params: { id } });

  const switchTo = async (lite: ProfileLite) => {
    const profile = profiles.find((p) => p.id === lite.id);
    if (!profile || profile.id === activeProfile.id || switching.current) return;
    switching.current = true;
    try {
      await switchToProfile(profile);
      haptics.success();
      toast.show({
        title: i18n.t('ui.you.profiles.switched', { name: firstName(profile.name) }),
        message: i18n.t('ui.you.profiles.switchedMessage', { name: firstName(profile.name) }),
        tone: 'success',
      });
    } catch (error) {
      console.error('Failed to switch profile:', error);
      haptics.error();
      toast.show({ title: i18n.t('ui.you.profiles.switchFailed'), tone: 'danger' });
    } finally {
      switching.current = false;
    }
  };

  const handleSelect = (lite: ProfileLite) => {
    if (lite.id === activeProfile.id) openProfile(lite.id);
    else switchTo(lite);
  };

  const handleOptions = async (lite: ProfileLite) => {
    const isActive = lite.id === activeProfile.id;
    const choice = await showActionSheet({
      title: lite.name,
      message: isActive ? i18n.t('ui.you.profiles.activeSheetMessage') : undefined,
      options: [
        ...(isActive
          ? []
          : [{ key: 'switch', label: i18n.t('ui.you.profiles.switch'), icon: Repeat }]),
        { key: 'edit', label: i18n.t('ui.you.profiles.edit'), icon: Pencil },
        ...(isActive
          ? []
          : [
              {
                key: 'delete',
                label: i18n.t('ui.you.profiles.delete'),
                icon: Trash2,
                destructive: true,
              },
            ]),
      ],
    });
    if (choice === 'switch') await switchTo(lite);
    else if (choice === 'edit') openProfile(lite.id);
    else if (choice === 'delete') {
      // The active profile can't be deleted (the option isn't offered for it).
      if (!(await confirmDelete(lite))) return;
      try {
        await removeProfile(lite.id);
        haptics.success();
        toast.show({
          title: i18n.t('ui.you.form.deleted', { name: firstName(lite.name) }),
          tone: 'success',
        });
      } catch (error) {
        console.error('Failed to delete profile:', error);
        toast.show({
          title: i18n.t('ui.you.form.deleteFailed'),
          message: i18n.t('ui.you.form.tryAgain'),
          tone: 'danger',
        });
      }
    }
  };

  const applyLanguage = async (language: AppLanguage) => {
    try {
      await updateProfile(activeProfile.id, {
        settings: { ...activeProfile.settings, language },
      });
      // Remounts the screens so every string re-renders in the new language.
      await setLocale(language);
      await loadProfiles();
    } catch (error) {
      console.error('Failed to update language:', error);
      toast.show({ title: i18n.t('ui.you.preferences.saveFailed'), tone: 'danger' });
    }
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
      toast.show({ title: i18n.t('ui.you.preferences.saveFailed'), tone: 'danger' });
    } finally {
      setPending24h(null);
    }
  };

  return (
    <Screen header={<NavHeader />}>
      <YouView
        profile={activeProfile}
        profiles={profiles}
        languageLabel={languageName(locale)}
        is24h={is24h}
        timeExample={formatTime(EXAMPLE_TIME, is24h)}
        lock={lock}
        version={Constants.expoConfig?.version ?? '1.0.0'}
        onEditProfile={() => openProfile(activeProfile.id)}
        onSelectProfile={handleSelect}
        onProfileOptions={handleOptions}
        onAddProfile={() => router.push('/profile/create')}
        onLanguage={() => setLanguageOpen(true)}
        onToggle24h={toggle24h}
        onAppLock={() => router.push('/(onboarding)/auth-setup?reconfigure=true')}
        // Cast: the generated typed routes (.expo/types) predate app/export/index.tsx.
        onExport={() => router.push('/export' as Href)}
        onDisclaimer={() => router.push('/(onboarding)/disclaimer?viewOnly=true')}
      />
      <LanguageSheet
        visible={languageOpen}
        value={locale}
        onSelect={(lang) => {
          pendingLanguage.current = lang === locale ? null : lang;
          setLanguageOpen(false);
        }}
        onClose={() => {
          pendingLanguage.current = null;
          setLanguageOpen(false);
        }}
        onDismissed={() => {
          const lang = pendingLanguage.current;
          pendingLanguage.current = null;
          if (lang && isAppLanguage(lang)) applyLanguage(lang);
        }}
      />
    </Screen>
  );
}
