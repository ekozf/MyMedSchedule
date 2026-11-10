/**
 * Settings → Manage people: every person in the app with Edit and Remove buttons (the only place
 * to edit or remove people). The person in use can be removed when exactly one other person
 * exists: the confirm says "Switch to {other} and remove {name}" and does both. With more people
 * the card explains to switch first. Reuses the profile actions.
 */
import * as React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import {
  Avatar,
  Button,
  Card,
  NavHeader,
  Screen,
  StatusPill,
  Text,
  useConfirm,
  useToast,
} from '@/components/ds';
import { YOU_ROUTES } from '@/components/you/routes';
import {
  firstName,
  removeProfile,
  switchToProfile,
  useConfirmDeleteProfile,
  type ProfileLite,
} from '@/components/you/profile-actions';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.you.${key}`, opts);

export default function ManagePeopleRoute() {
  const toast = useToast();
  const confirm = useConfirm();
  const confirmRemove = useConfirmDeleteProfile();
  const profiles = useStore((s) => s.profiles);
  const activeId = useStore((s) => s.activeProfile?.id ?? null);
  const [busy, setBusy] = React.useState<string | null>(null);
  // The person in use can be removed by switching to the only other person first.
  const onlyOther = profiles.length === 2 ? profiles.find((p) => p.id !== activeId) : undefined;

  const remove = async (p: ProfileLite) => {
    if (busy) return;
    const active = p.id === activeId;
    if (active && !onlyOther) return;
    if (active && onlyOther) {
      const name = firstName(p.name);
      const other = firstName(onlyOther.name);
      const ok = await confirm({
        title: t('form.removeTitle', { name }),
        message: t('manage.switchAndRemoveMessage', { name, other }),
        confirmLabel: t('manage.switchAndRemove', { name, other }),
        tone: 'danger',
      });
      if (!ok) return;
    } else if (!(await confirmRemove(p))) {
      return;
    }
    setBusy(p.id);
    try {
      if (active && onlyOther) {
        const target = useStore.getState().profiles.find((x) => x.id === onlyOther.id);
        if (!target) throw new Error('Other profile not found');
        await switchToProfile(target);
      }
      await removeProfile(p.id);
      toast.show({ title: t('form.removed', { name: firstName(p.name) }) });
    } catch (error) {
      console.error('Failed to remove profile:', error);
      toast.show({ title: t('form.removeFailed') });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen header={<NavHeader title={t('manage.title')} />}>
      <View style={{ gap: 12, paddingTop: 8, paddingBottom: 24 }}>
        {profiles.map((p) => {
          const active = p.id === activeId;
          const name = firstName(p.name);
          const removable = !active || !!onlyOther;
          return (
            <Card key={p.id}>
              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Avatar name={p.name} uri={p.avatarUri} size="md" ring={active} />
                  <View style={{ flex: 1, gap: 4, alignItems: 'flex-start' }}>
                    <Text variant="title3">{p.name}</Text>
                    {active ? <StatusPill label={t('manage.inUse')} tone="accent" /> : null}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <Button
                    label={t('people.edit')}
                    accessibilityLabel={t('manage.editA11y', { name })}
                    variant="secondary"
                    size="sm"
                    disabled={busy !== null}
                    onPress={() => router.push(YOU_ROUTES.editProfile(p.id))}
                    style={{ flexGrow: 1, flexBasis: 120 }}
                  />
                  <Button
                    label={t('people.remove')}
                    accessibilityLabel={t('manage.removeA11y', { name })}
                    variant="danger"
                    size="sm"
                    loading={busy === p.id}
                    disabled={!removable || (busy !== null && busy !== p.id)}
                    onPress={() => remove(p)}
                    style={{ flexGrow: 1, flexBasis: 120 }}
                  />
                </View>
                {active && !removable ? (
                  <Text variant="footnote" tone="secondary">
                    {t('manage.activeExplain', { name })}
                  </Text>
                ) : null}
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
