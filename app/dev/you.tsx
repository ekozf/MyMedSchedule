/**
 * DEV ONLY — preview of the You area with mock data (no DB, no store writes): You screen with
 * 1 or 3 profiles, language sheet, profile form (create / edit / active) and export states.
 * Open /dev/you.
 */
import * as React from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Moon, Pencil, Repeat, Sun, Trash2 } from 'lucide-react-native';
import i18n, { getCurrentLocale, setLocale } from '@/lib/i18n';
import { formatTime } from '@/lib/ui/format';
import {
  Button,
  Card,
  IconButton,
  ListGroup,
  ListRow,
  NavHeader,
  SectionHeader,
  SegmentedControl,
  Text,
  Screen,
  useActionSheet,
  useToast,
} from '@/components/ds';
import { YouView } from '@/components/you/YouView';
import { LanguageSheet, languageName, isAppLanguage } from '@/components/you/LanguageSheet';
import { ProfileForm } from '@/components/you/ProfileForm';
import { ExportActions, ExportBody, type ExportBusy } from '@/components/you/ExportView';
import type { AppLockKind } from '@/components/you/app-lock';
import { firstName, type ProfileLite } from '@/components/you/profile-actions';

const MOCK_PROFILES: ProfileLite[] = [
  { id: 'p1', name: 'Emma de Vries' },
  { id: 'p2', name: 'Anna Jansen' },
  { id: 'p3', name: 'Ali Yılmaz' },
];

const EXAMPLE_TIME = new Date(2000, 0, 1, 20, 0);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <SectionHeader title={title} />
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );
}

export default function YouPreview() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const toast = useToast();
  const showActionSheet = useActionSheet();

  // You screen
  const [count, setCount] = React.useState<'1' | '3'>('3');
  const profiles = count === '1' ? MOCK_PROFILES.slice(0, 1) : MOCK_PROFILES;
  const [activeId, setActiveId] = React.useState('p1');
  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];
  const [is24h, setIs24h] = React.useState(true);
  const [lock, setLock] = React.useState<AppLockKind>('face');
  const [languageOpen, setLanguageOpen] = React.useState(false);

  // Profile form
  const [formMode, setFormMode] = React.useState<'create' | 'edit' | 'active'>('create');
  const [name, setName] = React.useState('');
  const [avatarUri, setAvatarUri] = React.useState<string | undefined>();
  const [nameError, setNameError] = React.useState<string | null>(null);

  // Export
  const [exportState, setExportState] = React.useState<'idle' | 'ack' | 'save' | 'share'>('idle');
  const acknowledged = exportState !== 'idle';
  const busy: ExportBusy =
    exportState === 'save' ? 'save' : exportState === 'share' ? 'share' : null;

  const note = (title: string) => toast.show({ title });

  return (
    <Screen
      header={
        <NavHeader
          title="You — preview"
          right={
            <IconButton
              icon={isDark ? Sun : Moon}
              accessibilityLabel="Toggle colour scheme"
              onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
            />
          }
        />
      }>
      <Section title="You screen">
        <SegmentedControl
          value={count}
          onChange={(v) => {
            setCount(v);
            setActiveId('p1');
          }}
          options={[
            { value: '1', label: '1 profile' },
            { value: '3', label: '3 profiles' },
          ]}
        />
        <SegmentedControl
          value={lock}
          onChange={setLock}
          options={[
            { value: 'face', label: 'Face' },
            { value: 'fingerprint', label: 'Finger' },
            { value: 'pin', label: 'PIN' },
            { value: 'off', label: 'Off' },
          ]}
        />
        <YouView
          profile={active}
          profiles={profiles}
          languageLabel={languageName(getCurrentLocale())}
          is24h={is24h}
          timeExample={formatTime(EXAMPLE_TIME, is24h)}
          lock={lock}
          version="1.0.0"
          onEditProfile={() => note('→ /profile/[id]')}
          onSelectProfile={(p) => {
            if (p.id === active.id) return note('→ /profile/[id]');
            setActiveId(p.id);
            toast.show({
              title: i18n.t('ui.you.profiles.switched', { name: firstName(p.name) }),
              message: i18n.t('ui.you.profiles.switchedMessage', { name: firstName(p.name) }),
              tone: 'success',
            });
          }}
          onProfileOptions={async (p) => {
            const isActive = p.id === active.id;
            const choice = await showActionSheet({
              title: p.name,
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
            if (choice) note(`action: ${choice}`);
          }}
          onAddProfile={() => note('→ /profile/create')}
          onLanguage={() => setLanguageOpen(true)}
          onToggle24h={setIs24h}
          onAppLock={() => note('→ /(onboarding)/auth-setup?reconfigure=true')}
          onExport={() => note('→ /export')}
          onDisclaimer={() => note('→ /(onboarding)/disclaimer?viewOnly=true')}
        />
        <Button
          label="Open language sheet"
          variant="secondary"
          onPress={() => setLanguageOpen(true)}
        />
      </Section>

      <Section title="Profile form">
        <SegmentedControl
          value={formMode}
          onChange={(v) => {
            setFormMode(v);
            setNameError(null);
            setName(v === 'create' ? '' : v === 'edit' ? 'Anna Jansen' : 'Emma de Vries');
            setAvatarUri(undefined);
          }}
          options={[
            { value: 'create', label: 'Create' },
            { value: 'edit', label: 'Edit' },
            { value: 'active', label: 'Edit (active)' },
          ]}
        />
        <Card>
          <NavHeader
            backIcon="close"
            onBack={() => note('close (discard confirm when dirty)')}
            title={i18n.t(
              formMode === 'create' ? 'ui.you.form.createTitle' : 'ui.you.form.editTitle'
            )}
          />
          <ProfileForm
            name={name}
            onChangeName={(v) => {
              setName(v);
              setNameError(null);
            }}
            nameError={nameError}
            avatarUri={avatarUri}
            onChangeAvatar={setAvatarUri}>
            {formMode === 'edit' ? (
              <ListGroup>
                <ListRow
                  icon={Trash2}
                  title={i18n.t('ui.you.profiles.delete')}
                  destructive
                  accessory="none"
                  onPress={() => note('danger confirm → delete')}
                />
              </ListGroup>
            ) : formMode === 'active' ? (
              <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 16 }}>
                {i18n.t('ui.you.form.activeCaption')}
              </Text>
            ) : null}
          </ProfileForm>
          <View style={{ marginTop: 20 }}>
            <Button
              label={i18n.t(formMode === 'create' ? 'ui.you.form.create' : 'ui.you.form.save')}
              size="lg"
              fullWidth
              onPress={() => {
                if (!name.trim()) setNameError(i18n.t('ui.you.form.nameRequired'));
                else note('saved');
              }}
            />
          </View>
        </Card>
      </Section>

      <Section title="Export">
        <SegmentedControl
          value={exportState}
          onChange={setExportState}
          options={[
            { value: 'idle', label: 'Start' },
            { value: 'ack', label: 'Ready' },
            { value: 'save', label: 'Saving' },
            { value: 'share', label: 'Sharing' },
          ]}
        />
        <ExportBody
          profileName="Emma"
          acknowledged={acknowledged}
          onAcknowledgedChange={(v) => setExportState(v ? 'ack' : 'idle')}
          disabled={busy !== null}
        />
        <ExportActions
          acknowledged={acknowledged}
          busy={busy}
          onSave={() => setExportState('save')}
          onShare={() => setExportState('share')}
        />
      </Section>

      <LanguageSheet
        visible={languageOpen}
        value={getCurrentLocale()}
        onSelect={(lang) => {
          setLanguageOpen(false);
          if (isAppLanguage(lang) && lang !== getCurrentLocale()) setLocale(lang);
        }}
        onClose={() => setLanguageOpen(false)}
      />
    </Screen>
  );
}
