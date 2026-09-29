/**
 * Header for the three tab screens: active-profile avatar (→ /you), optional right action,
 * optional overline (caption, optionally tappable) and the large title.
 *
 * @example
 * <TabHeader
 *   overline={formatLongDate(day)}
 *   onOverlinePress={openCalendar}
 *   title={formatDayLabel(day)}
 *   right={<IconButton icon={CalendarDays} accessibilityLabel="Pick a day" onPress={…} />}
 * />
 */
import * as React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import { PressableScale } from './PressableScale';
import { Avatar } from './Avatar';
import { Text } from './Text';
import { Icon } from './Icon';

export interface TabHeaderProps {
  title: string;
  overline?: string;
  onOverlinePress?: () => void;
  /** Accessibility hint/label for the overline button. */
  overlineAccessibilityLabel?: string;
  right?: React.ReactNode;
}

export function ProfileAvatarButton() {
  const profile = useStore((s) => s.activeProfile);
  return (
    <PressableScale
      onPress={() => router.push('/you')}
      accessibilityRole="button"
      accessibilityLabel={i18n.t('ui.shell.a11y.openProfile')}
      hitSlop={4}
      style={{ borderRadius: 24 }}>
      <Avatar name={profile?.name ?? '?'} uri={profile?.avatarUri} size="md" />
    </PressableScale>
  );
}

export function TabHeader({
  title,
  overline,
  onOverlinePress,
  overlineAccessibilityLabel,
  right,
}: TabHeaderProps) {
  return (
    <View style={{ paddingTop: 4, paddingBottom: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 48,
        }}>
        <ProfileAvatarButton />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{right}</View>
      </View>
      <View style={{ marginTop: 12 }}>
        {overline ? (
          onOverlinePress ? (
            <PressableScale
              haptic="tap"
              onPress={onOverlinePress}
              accessibilityRole="button"
              accessibilityLabel={overlineAccessibilityLabel ?? overline}
              hitSlop={{ top: 12, bottom: 8 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
                gap: 4,
              }}>
              <Text variant="caption" tone="accent">
                {overline}
              </Text>
              <Icon as={ChevronDown} size={14} tone="accent" />
            </PressableScale>
          ) : (
            <Text variant="caption" tone="secondary">
              {overline}
            </Text>
          )
        ) : null}
        <Text variant="largeTitle" style={{ marginTop: overline ? 2 : 0 }}>
          {title}
        </Text>
      </View>
    </View>
  );
}
