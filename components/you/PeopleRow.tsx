/**
 * "People in this app" (spec §5.6): a row of 60 avatars with names on a `field` card, the person
 * in use with an accent ring (one person: avatar and name on one line), then "+ Add another
 * person" as its own row below. Tap = `onPress` (switch). Editing and removing live on the
 * "Manage people" page.
 *
 * @example
 * <PeopleRow profiles={profiles} activeId={active.id} onPress={askToSwitch}
 *   onAdd={() => router.push('/profile/create')} />
 */
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Avatar, Card, Icon, PressableScale, Text, useTheme } from '@/components/ds';
import { firstName, type ProfileLite } from './profile-actions';

export interface PeopleRowProps {
  profiles: ProfileLite[];
  activeId: string | null;
  onPress: (profile: ProfileLite) => void;
  onAdd: () => void;
}

const ITEM_WIDTH = 92;
const AVATAR = 60;

export function PeopleRow({ profiles, activeId, onPress, onAdd }: PeopleRowProps) {
  const { colors } = useTheme();
  const only = profiles.length === 1 ? profiles[0] : null;
  return (
    <Card padded={false}>
      {only ? (
        // One person: their avatar and name on one line.
        <PressableScale
          onPress={() => onPress(only)}
          accessibilityRole="button"
          accessibilityLabel={i18n.t('ui.you.people.activeA11y', { name: firstName(only.name) })}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}>
          <Avatar name={only.name} uri={only.avatarUri} size={AVATAR} ring />
          <Text variant="headline" style={{ flexShrink: 1 }}>
            {firstName(only.name)}
          </Text>
        </PressableScale>
      ) : profiles.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 14, gap: 4 }}>
          {profiles.map((p) => (
            <Person key={p.id} profile={p} active={p.id === activeId} onPress={() => onPress(p)} />
          ))}
        </ScrollView>
      ) : null}
      {/* "+ Add another person" is always its own row under the avatars. */}
      <PressableScale
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={i18n.t('ui.you.people.addA11y')}
        style={{
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          borderTopWidth: profiles.length > 0 ? StyleSheet.hairlineWidth : 0,
          borderTopColor: colors.line2,
        }}>
        <Icon as={Plus} size={24} tone="accent" />
        <Text variant="headline" tone="accent" style={{ flexShrink: 1 }}>
          {i18n.t('ui.you.people.addAnother')}
        </Text>
      </PressableScale>
    </Card>
  );
}

function Person({
  profile,
  active,
  onPress,
}: {
  profile: ProfileLite;
  active: boolean;
  onPress: () => void;
}) {
  const name = firstName(profile.name);
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={active ? i18n.t('ui.you.people.activeA11y', { name }) : name}
      accessibilityHint={active ? undefined : i18n.t('ui.you.people.switchHint', { name })}
      accessibilityState={{ selected: active }}
      style={{ width: ITEM_WIDTH, alignItems: 'center', gap: 8, paddingVertical: 4 }}>
      {/* Same outer size for every avatar so names line up whether or not it has the ring. */}
      <View
        style={{
          width: AVATAR + 12,
          height: AVATAR + 12,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Avatar name={profile.name} uri={profile.avatarUri} size={AVATAR} ring={active} />
      </View>
      <Text
        variant="callout"
        weight={active ? '700' : '500'}
        tone={active ? 'accent' : 'primary'}
        align="center">
        {name}
      </Text>
    </PressableScale>
  );
}
