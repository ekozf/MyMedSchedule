/**
 * Body of the You screen (presentational; data and actions via props so it can be previewed):
 * hero (avatar, name, "Edit profile"), profiles row, and the grouped settings lists.
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Clock, FileText, Info, Languages, Pencil, ShieldCheck } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import {
  Avatar,
  Button,
  ListGroup,
  ListRow,
  PressableScale,
  Text,
  useTheme,
} from '@/components/ds';
import { ProfilesRow } from './ProfilesRow';
import { appLockIcon, appLockLabel, type AppLockKind } from './app-lock';
import type { ProfileLite } from './profile-actions';

export interface YouViewProps {
  profile: ProfileLite;
  profiles: ProfileLite[];
  languageLabel: string;
  is24h: boolean;
  /** Example time in the current format, e.g. "20:00" / "8:00 PM". */
  timeExample: string;
  /** null while loading. */
  lock: AppLockKind | null;
  version: string;
  onEditProfile: () => void;
  onSelectProfile: (profile: ProfileLite) => void;
  onProfileOptions: (profile: ProfileLite) => void;
  onAddProfile: () => void;
  onLanguage: () => void;
  onToggle24h: (value: boolean) => void;
  onAppLock: () => void;
  onExport: () => void;
  onDisclaimer: () => void;
}

export function YouView(props: YouViewProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const enter = (i: number) =>
    reduceMotion ? FadeIn.duration(200) : FadeInDown.duration(280).delay(i * 40);
  const { profile, profiles } = props;
  const lockKind = props.lock ?? 'off';

  return (
    <View style={{ gap: 28 }}>
      {/* Hero */}
      <Animated.View entering={enter(0)} style={{ alignItems: 'center', gap: 8, paddingTop: 4 }}>
        <PressableScale
          onPress={props.onEditProfile}
          accessibilityRole="button"
          accessibilityLabel={`${i18n.t('ui.you.editProfile')}, ${profile.name}`}
          style={{ borderRadius: 999 }}>
          <Avatar name={profile.name} uri={profile.avatarUri} size="xl" ring />
        </PressableScale>
        <Text variant="title1" align="center" accessibilityRole="header" style={{ marginTop: 4 }}>
          {profile.name}
        </Text>
        <Button
          label={i18n.t('ui.you.editProfile')}
          variant="plain"
          size="sm"
          icon={Pencil}
          onPress={props.onEditProfile}
          style={{ alignSelf: 'center' }}
        />
      </Animated.View>

      {/* Profiles */}
      <Animated.View entering={enter(1)} style={{ gap: 8 }}>
        <Text
          variant="caption"
          tone="secondary"
          style={{ paddingHorizontal: 16 }}
          accessibilityRole="header">
          {i18n.t('ui.you.profiles.header')}
        </Text>
        <ProfilesRow
          profiles={profiles}
          activeId={profile.id}
          onPress={props.onSelectProfile}
          onLongPress={props.onProfileOptions}
          onAdd={props.onAddProfile}
        />
        <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 16 }}>
          {i18n.t(profiles.length > 1 ? 'ui.you.profiles.footerMany' : 'ui.you.profiles.footerOne')}
        </Text>
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <ListGroup header={i18n.t('ui.you.preferences.header')}>
          <ListRow
            icon={Languages}
            title={i18n.t('ui.you.preferences.language')}
            value={props.languageLabel}
            onPress={props.onLanguage}
          />
          <ListRow
            icon={Clock}
            iconTint={colors.success}
            title={i18n.t('ui.you.preferences.time24')}
            subtitle={i18n.t('ui.you.preferences.time24Example', { example: props.timeExample })}
            switchValue={props.is24h}
            onSwitchChange={props.onToggle24h}
          />
        </ListGroup>
      </Animated.View>

      <Animated.View entering={enter(3)}>
        <ListGroup
          header={i18n.t('ui.you.security.header')}
          footer={i18n.t('ui.you.security.footer')}>
          <ListRow
            icon={appLockIcon(lockKind)}
            iconTint={colors.warning}
            title={i18n.t('ui.you.security.appLock')}
            value={props.lock ? appLockLabel(props.lock) : ' '}
            onPress={props.onAppLock}
          />
        </ListGroup>
      </Animated.View>

      <Animated.View entering={enter(4)}>
        <ListGroup header={i18n.t('ui.you.data.header')} footer={i18n.t('ui.you.data.footer')}>
          <ListRow
            icon={FileText}
            title={i18n.t('ui.you.data.export')}
            subtitle={i18n.t('ui.you.data.exportSubtitle')}
            onPress={props.onExport}
          />
        </ListGroup>
      </Animated.View>

      <Animated.View entering={enter(5)}>
        <ListGroup
          header={i18n.t('ui.you.about.header')}
          footer={i18n.t('settings.appDescription')}>
          <ListRow
            icon={ShieldCheck}
            iconTint={colors.success}
            title={i18n.t('ui.you.about.disclaimer')}
            onPress={props.onDisclaimer}
          />
          <ListRow
            icon={Info}
            iconTint={colors.inkSecondary}
            title={i18n.t('ui.you.about.version')}
            value={props.version}
          />
        </ListGroup>
      </Animated.View>
    </View>
  );
}
