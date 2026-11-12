/**
 * Settings tab body (spec §5.6, route `you`): the title "Settings", the person in use as one row
 * (avatar 48, name, "Edit name or photo", chevron), then Reminders and privacy (reminders, app
 * lock), Preferences (language, appearance, 24-hour time, parts of the day), People in this app
 * (tap to switch; "Manage people" edits and removes), Your data (export, delete everything) and
 * About (privacy, terms, good to know, licences, support, website when set, version, "Made by").
 * Presentational: the route passes data and callbacks.
 *
 * @example
 * <YouView profile={active} profiles={profiles} languageLabel="English" is24h … />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { Avatar, ListGroup, ListRow, SectionHeader, TabHeader, Text } from '@/components/ds';
import { PUBLISHER_NAME } from '@/lib/legal/config';
import type { Profile } from '@/types';
import { PeopleRow } from './PeopleRow';
import type { ProfileLite } from './profile-actions';

export interface YouViewProps {
  profile: Profile;
  profiles: ProfileLite[];
  languageLabel: string;
  is24h: boolean;
  /** "20:00" or "8:00 PM", for "Times look like …". */
  timeExample: string;
  /** Parts of the day: "Midday 11:00 · Evening 16:00 · Night 21:00". */
  partsOfDay: string;
  /** "System" / "Light" / "Dark". */
  appearanceLabel: string;
  /** Reminder permission: null while loading. */
  reminders: 'granted' | 'undetermined' | 'denied' | null;
  /** "PIN", "Fingerprint", "Off"; null while loading. */
  lockLabel: string | null;
  version: string;
  onEditProfile: () => void;
  onSelectProfile: (p: ProfileLite) => void;
  onAddProfile: () => void;
  onManagePeople: () => void;
  onLanguage: () => void;
  onToggle24h: (value: boolean) => void;
  onCompartments: () => void;
  onAppearance: () => void;
  onReminders: () => void;
  onAppLock: () => void;
  onExport: () => void;
  onDeleteAll: () => void;
  onGoodToKnow: () => void;
  onPrivacy: () => void;
  onTerms: () => void;
  onLicenses: () => void;
  onSupport: () => void;
  /** Only passed when a website URL is set; the row is hidden otherwise. */
  onWebsite?: () => void;
}

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.you.${key}`, opts);
const a = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.about.rows.${key}`, opts);

export function YouView({
  profile,
  profiles,
  languageLabel,
  is24h,
  timeExample,
  partsOfDay,
  appearanceLabel,
  reminders,
  lockLabel,
  version,
  onEditProfile,
  onSelectProfile,
  onAddProfile,
  onManagePeople,
  onLanguage,
  onToggle24h,
  onCompartments,
  onAppearance,
  onReminders,
  onAppLock,
  onExport,
  onDeleteAll,
  onGoodToKnow,
  onPrivacy,
  onTerms,
  onLicenses,
  onSupport,
  onWebsite,
}: YouViewProps) {
  // The store's profile list can still be empty on the first render; the active profile is
  // always known, so the People row shows the same single person from the start.
  const people: ProfileLite[] = profiles.length > 0 ? profiles : [profile];
  const many = people.length > 1;
  const remindersValue =
    reminders === null
      ? undefined
      : t(
          reminders === 'granted'
            ? 'reminders.statusOn'
            : reminders === 'denied'
              ? 'reminders.statusBlocked'
              : 'reminders.statusAsk'
        );
  return (
    <View style={{ gap: 28 }}>
      <View style={{ gap: 12 }}>
        <TabHeader title={t('title')} />
        <ListGroup>
          <ListRow
            leading={<Avatar name={profile.name} uri={profile.avatarUri} size={48} />}
            title={profile.name}
            subtitle={t('editLink')}
            onPress={onEditProfile}
          />
        </ListGroup>
      </View>

      <ListGroup header={t('remindersPrivacy.header')}>
        <ListRow title={t('preferences.reminders')} value={remindersValue} onPress={onReminders} />
        <ListRow title={t('privacy.appLock')} value={lockLabel ?? undefined} onPress={onAppLock} />
      </ListGroup>

      <ListGroup header={t('preferences.header')}>
        <ListRow title={t('preferences.language')} value={languageLabel} onPress={onLanguage} />
        <ListRow
          title={t('preferences.appearance')}
          value={appearanceLabel}
          onPress={onAppearance}
        />
        <ListRow
          title={t('preferences.time24')}
          subtitle={t('preferences.time24Example', { example: timeExample })}
          switchValue={is24h}
          onSwitchChange={onToggle24h}
        />
        <ListRow
          title={t('preferences.compartments')}
          subtitle={partsOfDay}
          onPress={onCompartments}
        />
      </ListGroup>

      <View style={{ gap: 8 }}>
        <SectionHeader title={t('people.header')} />
        <PeopleRow
          profiles={people}
          activeId={profile.id}
          onPress={onSelectProfile}
          onAdd={onAddProfile}
        />
        {many ? (
          <ListGroup>
            <ListRow
              title={t('people.manage')}
              subtitle={t('people.manageSubtitle')}
              onPress={onManagePeople}
            />
          </ListGroup>
        ) : null}
      </View>

      <ListGroup header={t('data.header')}>
        <ListRow title={t('data.export')} subtitle={t('data.exportSubtitle')} onPress={onExport} />
        <ListRow
          title={a('deleteAll')}
          subtitle={a('deleteAllSubtitle')}
          destructive
          onPress={onDeleteAll}
        />
      </ListGroup>

      <View style={{ gap: 12 }}>
        <ListGroup header={t('about.header')}>
          <ListRow title={a('privacy')} onPress={onPrivacy} />
          <ListRow title={a('terms')} onPress={onTerms} />
          <ListRow
            title={t('about.goodToKnow')}
            subtitle={t('about.goodToKnowSubtitle')}
            onPress={onGoodToKnow}
          />
          <ListRow title={a('licenses')} onPress={onLicenses} />
          <ListRow title={a('support')} onPress={onSupport} />
          {onWebsite ? <ListRow title={a('website')} onPress={onWebsite} /> : null}
          <ListRow title={t('about.version')} value={version} />
        </ListGroup>
        <Text variant="footnote" tone="secondary" align="center">
          {a('madeBy', { name: PUBLISHER_NAME })}
        </Text>
      </View>
    </View>
  );
}
