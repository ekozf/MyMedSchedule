/**
 * Horizontal row of profile avatars + an "Add" circle. The active profile has an accent ring and
 * a check badge. Tap = switch (or open, for the active one); touch and hold = more options.
 *
 * @example
 * <ProfilesRow profiles={profiles} activeId={active.id} onPress={switchTo}
 *   onLongPress={showOptions} onAdd={() => router.push('/profile/create')} />
 */
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { Check, Plus } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Avatar, Card, Icon, PressableScale, Text, haptics, useTheme } from '@/components/ds';
import { firstName, type ProfileLite } from './profile-actions';

export interface ProfilesRowProps {
  profiles: ProfileLite[];
  activeId: string | null;
  onPress: (profile: ProfileLite) => void;
  onLongPress: (profile: ProfileLite) => void;
  onAdd: () => void;
}

const ITEM_WIDTH = 84;
const AVATAR_BOX = 76; // lg avatar (64) + ring

export function ProfilesRow({ profiles, activeId, onPress, onLongPress, onAdd }: ProfilesRowProps) {
  const reduceMotion = useReducedMotion();
  return (
    <Card padded={false}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 14, gap: 4 }}>
        {profiles.map((p) => (
          <Animated.View
            key={p.id}
            entering={reduceMotion ? undefined : FadeIn.duration(200)}
            layout={reduceMotion ? undefined : LinearTransition.springify().damping(18)}>
            <ProfileBubble
              profile={p}
              active={p.id === activeId}
              onPress={() => onPress(p)}
              onLongPress={() => onLongPress(p)}
            />
          </Animated.View>
        ))}
        <Animated.View layout={reduceMotion ? undefined : LinearTransition.springify().damping(18)}>
          <AddBubble onPress={onAdd} />
        </Animated.View>
      </ScrollView>
    </Card>
  );
}

function ProfileBubble({
  profile,
  active,
  onPress,
  onLongPress,
}: {
  profile: ProfileLite;
  active: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  const name = firstName(profile.name);
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={() => {
        haptics.medium();
        onLongPress();
      }}
      delayLongPress={350}
      haptic={active ? 'tap' : 'light'}
      accessibilityRole="button"
      accessibilityLabel={
        active ? i18n.t('ui.you.profiles.activeA11y', { name: profile.name }) : profile.name
      }
      accessibilityHint={i18n.t(active ? 'ui.you.profiles.editHint' : 'ui.you.profiles.switchHint')}
      accessibilityState={{ selected: active }}
      accessibilityActions={[{ name: 'longpress', label: i18n.t('ui.you.profiles.moreOptions') }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'longpress') onLongPress();
      }}
      style={{ width: ITEM_WIDTH, alignItems: 'center', gap: 6, paddingVertical: 2 }}>
      <View
        style={{
          width: AVATAR_BOX,
          height: AVATAR_BOX,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden>
        <Avatar name={profile.name} uri={profile.avatarUri} size="lg" ring={active} />
        {active ? (
          <View
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: colors.accent,
              borderWidth: 2.5,
              borderColor: colors.surfaceSolid,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon as={Check} size={14} strokeWidth={3} color={colors.onAccent} />
          </View>
        ) : null}
      </View>
      <Text
        variant="subhead"
        weight={active ? '600' : '400'}
        tone={active ? 'primary' : 'secondary'}
        align="center"
        numberOfLines={1}
        style={{ width: ITEM_WIDTH - 4 }}>
        {name}
      </Text>
    </PressableScale>
  );
}

function AddBubble({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={i18n.t('ui.you.profiles.addA11y')}
      style={{ width: ITEM_WIDTH, alignItems: 'center', gap: 6, paddingVertical: 2 }}>
      <View
        style={{
          width: AVATAR_BOX,
          height: AVATAR_BOX,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.accentSoft,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon as={Plus} size={28} tone="accent" />
        </View>
      </View>
      <Text variant="subhead" weight="600" tone="accent" align="center" numberOfLines={1}>
        {i18n.t('ui.you.profiles.add')}
      </Text>
    </PressableScale>
  );
}
