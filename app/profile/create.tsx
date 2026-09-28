/**
 * New profile (modal): photo + name. After creating, asks whether to switch to it now.
 */
import * as React from 'react';
import { router } from 'expo-router';
import { Repeat } from 'lucide-react-native';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { useStore } from '@/store';
import { createProfile, setActiveProfile as setActiveProfileDB } from '@/lib/db/operations';
import { Button, NavHeader, Screen, haptics, useConfirm, useToast } from '@/components/ds';
import { ModalScope, MODAL_SAFE_TOP } from '@/components/you/ModalScope';
import { ProfileForm } from '@/components/you/ProfileForm';
import { isAppLanguage } from '@/components/you/LanguageSheet';
import { firstName, switchToProfile } from '@/components/you/profile-actions';
import { useDiscardGuard } from '@/components/you/use-discard-guard';

export default function CreateProfileRoute() {
  return (
    <ModalScope>
      <CreateProfileScreen />
    </ModalScope>
  );
}

function CreateProfileScreen() {
  const toast = useToast();
  const confirm = useConfirm();
  const [name, setName] = React.useState('');
  const [avatarUri, setAvatarUri] = React.useState<string | undefined>();
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const dirty = name.trim().length > 0 || !!avatarUri;
  const { allowLeave } = useDiscardGuard(dirty && !saving);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      haptics.warning();
      setError(i18n.t('ui.you.form.nameRequired'));
      return;
    }
    setError(null);
    setSaving(true);
    const previous = useStore.getState().activeProfile;
    const locale = getCurrentLocale();

    let created;
    try {
      created = await createProfile({
        name: trimmed,
        avatarUri,
        settings: {
          language: isAppLanguage(locale) ? locale : 'en',
          use24HourTime: true,
          authRequired: false,
        },
      });
      // createProfile stores the new row as active; keep the current profile active until the
      // person chooses to switch, so exactly one profile is active.
      if (previous) await setActiveProfileDB(previous.id);
      await useStore.getState().loadProfiles();
    } catch (e) {
      console.error('Failed to create profile:', e);
      setSaving(false);
      toast.show({
        title: i18n.t('ui.you.form.createFailed'),
        message: i18n.t('ui.you.form.tryAgain'),
        tone: 'danger',
      });
      return;
    }

    haptics.success();
    const short = firstName(created.name);
    const switchNow =
      !previous ||
      (await confirm({
        title: i18n.t('ui.you.form.switchTitle', { name: short }),
        message: i18n.t('ui.you.form.switchMessage', { name: short }),
        confirmLabel: i18n.t('ui.you.form.switchConfirm'),
        cancelLabel: i18n.t('ui.common.notNow'),
        icon: Repeat,
      }));

    let toastTitle = i18n.t('ui.you.form.created', { name: short });
    if (switchNow) {
      try {
        await switchToProfile(created);
        toastTitle = i18n.t('ui.you.profiles.switched', { name: short });
      } catch (e) {
        console.error('Failed to switch to new profile:', e);
      }
    }

    allowLeave();
    // Moves to the screen underneath once this modal closes.
    toast.show({ title: toastTitle, tone: 'success' });
    router.back();
  };

  return (
    <Screen
      safeTop={MODAL_SAFE_TOP}
      keyboardAware
      header={<NavHeader backIcon="close" title={i18n.t('ui.you.form.createTitle')} />}
      footer={
        <Button
          label={i18n.t('ui.you.form.create')}
          size="lg"
          fullWidth
          loading={saving}
          onPress={handleCreate}
        />
      }>
      <ProfileForm
        name={name}
        onChangeName={(v) => {
          setName(v);
          if (error) setError(null);
        }}
        nameError={error}
        avatarUri={avatarUri}
        onChangeAvatar={setAvatarUri}
        onSubmit={handleCreate}
        disabled={saving}
        autoFocus
      />
    </Screen>
  );
}
