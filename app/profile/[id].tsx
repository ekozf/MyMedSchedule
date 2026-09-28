/**
 * Edit profile (modal): photo + name, and "Delete profile" for profiles that aren't in use.
 */
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Trash2, UserRoundX } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import { getProfileById, updateProfile } from '@/lib/db/operations';
import {
  Button,
  EmptyState,
  ListGroup,
  ListRow,
  NavHeader,
  Screen,
  Text,
  haptics,
  useTheme,
  useToast,
  type ToastApi,
} from '@/components/ds';
import type { Profile } from '@/types';
import { ModalScope, MODAL_SAFE_TOP } from '@/components/you/ModalScope';
import { ProfileForm } from '@/components/you/ProfileForm';
import {
  firstName,
  removeProfile,
  useConfirmDeleteProfile,
} from '@/components/you/profile-actions';
import { relayToast } from '@/components/you/toast-relay';
import { useDiscardGuard } from '@/components/you/use-discard-guard';

export default function EditProfileRoute() {
  const rootToast = useToast();
  return (
    <ModalScope>
      <EditProfileScreen rootToast={rootToast} />
    </ModalScope>
  );
}

function EditProfileScreen({ rootToast }: { rootToast: ToastApi }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const confirmDelete = useConfirmDeleteProfile();
  const activeProfileId = useStore((s) => s.activeProfile?.id);
  const loadProfiles = useStore((s) => s.loadProfiles);

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'missing'>('loading');
  const [name, setName] = React.useState('');
  const [avatarUri, setAvatarUri] = React.useState<string | undefined>();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    if (!id) {
      setStatus('missing');
      return;
    }
    getProfileById(id)
      .then((loaded) => {
        if (!alive) return;
        if (!loaded) {
          setStatus('missing');
          return;
        }
        setProfile(loaded);
        setName(loaded.name);
        setAvatarUri(loaded.avatarUri);
        setStatus('ready');
      })
      .catch((e) => {
        console.error('Failed to load profile:', e);
        if (alive) setStatus('missing');
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const dirty =
    !!profile && (name.trim() !== profile.name || (avatarUri ?? '') !== (profile.avatarUri ?? ''));
  const { allowLeave } = useDiscardGuard(dirty && !busy);
  const isActive = !!profile && profile.id === activeProfileId;

  const handleSave = async () => {
    if (!id || !profile) return;
    const trimmed = name.trim();
    if (!trimmed) {
      haptics.warning();
      setError(i18n.t('ui.you.form.nameRequired'));
      return;
    }
    if (!dirty) {
      router.back();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await updateProfile(id, {
        name: trimmed,
        // '' clears a removed photo (undefined would leave the stored one untouched).
        avatarUri: avatarUri ?? '',
      });
      await loadProfiles();
      haptics.success();
      allowLeave();
      relayToast({ title: i18n.t('ui.you.form.saved'), tone: 'success' }, rootToast);
      router.back();
    } catch (e) {
      console.error('Failed to update profile:', e);
      setBusy(false);
      toast.show({
        title: i18n.t('ui.you.form.saveFailed'),
        message: i18n.t('ui.you.form.tryAgain'),
        tone: 'danger',
      });
    }
  };

  const handleDelete = async () => {
    if (!profile || isActive) return;
    if (!(await confirmDelete(profile))) return;
    setBusy(true);
    try {
      await removeProfile(profile.id);
      haptics.success();
      allowLeave();
      relayToast(
        {
          title: i18n.t('ui.you.form.deleted', { name: firstName(profile.name) }),
          tone: 'success',
        },
        rootToast
      );
      router.back();
    } catch (e) {
      console.error('Failed to delete profile:', e);
      setBusy(false);
      toast.show({
        title: i18n.t('ui.you.form.deleteFailed'),
        message: i18n.t('ui.you.form.tryAgain'),
        tone: 'danger',
      });
    }
  };

  const header = <NavHeader backIcon="close" title={i18n.t('ui.you.form.editTitle')} />;

  if (status === 'loading') {
    return (
      <Screen safeTop={MODAL_SAFE_TOP} scroll={false} header={header}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}
          accessible
          accessibilityLabel={i18n.t('ui.common.loading')}>
          <ActivityIndicator color={colors.accent} />
          <Text tone="secondary">{i18n.t('ui.common.loading')}</Text>
        </View>
      </Screen>
    );
  }

  if (status === 'missing' || !profile) {
    return (
      <Screen safeTop={MODAL_SAFE_TOP} header={header}>
        <EmptyState
          icon={UserRoundX}
          title={i18n.t('ui.you.form.notFound')}
          action={{ label: i18n.t('ui.common.close'), onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      safeTop={MODAL_SAFE_TOP}
      keyboardAware
      header={header}
      footer={
        <Button
          label={i18n.t('ui.you.form.save')}
          size="lg"
          fullWidth
          loading={busy}
          onPress={handleSave}
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
        onSubmit={handleSave}
        disabled={busy}>
        {isActive ? (
          <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 16 }}>
            {i18n.t('ui.you.form.activeCaption')}
          </Text>
        ) : (
          <ListGroup>
            <ListRow
              icon={Trash2}
              title={i18n.t('ui.you.profiles.delete')}
              destructive
              accessory="none"
              disabled={busy}
              onPress={handleDelete}
            />
          </ListGroup>
        )}
      </ProfileForm>
    </Screen>
  );
}
