/**
 * Carer context on the tab headers: when more than one person uses the app, a small avatar +
 * first name chip shows whose medicines are on screen. Tapping it opens a person picker sheet
 * (people with their avatar, the one in use checked, plus "Manage people"); picking someone asks
 * "Switch to Tom?" and shows a toast with Undo. Renders nothing with a single profile.
 *
 * @example
 * <TabHeader title="Medicines" right={<><ProfileChip /><HeaderTextAction … /></>} />
 */
import * as React from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Users } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import {
  Avatar,
  ListGroup,
  ListRow,
  PressableScale,
  Sheet,
  Text,
  radii,
  useTheme,
} from '@/components/ds';
import { firstName, useSwitchPerson } from '@/components/you/profile-actions';
import { YOU_ROUTES } from '@/components/you/routes';
import { useStore } from '@/store';

/** First name of the active profile when several people use the app, else null. */
export function useCarerName(): string | null {
  const name = useStore((s) => s.activeProfile?.name);
  const many = useStore((s) => s.profiles.length > 1);
  if (!many || !name?.trim()) return null;
  return name.trim().split(/\s+/)[0];
}

export function ProfileChip() {
  const { colors } = useTheme();
  const first = useCarerName();
  const profile = useStore((s) => s.activeProfile);
  const [open, setOpen] = React.useState(false);
  if (!first || !profile) return null;
  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={i18n.t('ui.shell.a11y.profileChip', { name: profile.name })}
        hitSlop={4}
        style={{
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 4,
          paddingRight: 14,
          borderRadius: radii.pill,
          backgroundColor: colors.field,
          maxWidth: 160,
        }}>
        <Avatar name={profile.name} uri={profile.avatarUri} size="sm" />
        <Text variant="callout" weight="700" style={{ flexShrink: 1 }}>
          {first}
        </Text>
      </PressableScale>
      <PersonPickerSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * Today's person chip under the greeting: Avatar 32 + "{name} ▾", opens the person picker sheet.
 * Renders nothing with a single profile.
 */
export function PersonChip() {
  const { colors } = useTheme();
  const first = useCarerName();
  const profile = useStore((s) => s.activeProfile);
  const [open, setOpen] = React.useState(false);
  if (!first || !profile) return null;
  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={i18n.t('ui.shell.a11y.profileChip', { name: profile.name })}
        style={{
          alignSelf: 'flex-start',
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 8,
          paddingRight: 16,
          borderRadius: radii.pill,
          backgroundColor: colors.field,
          maxWidth: '100%',
        }}>
        <Avatar name={profile.name} uri={profile.avatarUri} size={32} />
        <Text variant="callout" weight="700" style={{ flexShrink: 1 }} numberOfLines={1}>
          {`${first} ▾`}
        </Text>
      </PressableScale>
      <PersonPickerSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * "Whose medicines?" sheet: one row per person (Avatar 40, name, check on the one in use), then
 * "Manage people". Picking someone else closes the sheet, then asks to switch (confirm + Undo).
 */
export function PersonPickerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const profiles = useStore((s) => s.profiles);
  const activeId = useStore((s) => s.activeProfile?.id ?? null);
  const askToSwitch = useSwitchPerson();
  // What to do once the sheet has finished closing (so the confirm doesn't stack on it).
  const after = React.useRef<(() => void) | null>(null);

  const closeThen = (fn: () => void) => {
    after.current = fn;
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={() => {
        const fn = after.current;
        after.current = null;
        fn?.();
      }}
      title={i18n.t('ui.shell.people.title')}>
      <View style={{ gap: 16 }}>
        <ListGroup>
          {profiles.map((p) => {
            const active = p.id === activeId;
            const name = firstName(p.name);
            return (
              <ListRow
                key={p.id}
                title={p.name}
                leading={<Avatar name={p.name} uri={p.avatarUri} size="sm" />}
                accessory={active ? 'check' : 'none'}
                accessibilityLabel={
                  active ? i18n.t('ui.you.people.activeA11y', { name }) : undefined
                }
                accessibilityHint={
                  active ? undefined : i18n.t('ui.you.people.switchHint', { name })
                }
                onPress={() => (active ? onClose() : closeThen(() => void askToSwitch(p)))}
              />
            );
          })}
        </ListGroup>
        <ListGroup>
          <ListRow
            title={i18n.t('ui.you.people.manage')}
            icon={Users}
            onPress={() => closeThen(() => router.push(YOU_ROUTES.managePeople))}
          />
        </ListGroup>
      </View>
    </Sheet>
  );
}
