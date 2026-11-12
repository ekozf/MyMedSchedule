/**
 * One open-source licence: name, version, licence, author, a "Project page" link (when known) and
 * the full licence text in a monospace font (selectable, so it can be copied).
 */
import * as React from 'react';
import { Platform, Text as RNText, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import i18n from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Button, Card, EmptyState, NavHeader, Screen, Text, useToast } from '@/components/ds';
import { findLicense, getLicenseData } from '@/lib/legal/licenses';
import { openExternalLink } from '@/lib/legal/support';
import { isLinkSet } from '@/lib/legal/config';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.about.licenses.${key}`, opts);
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export default function LicenseDetailRoute() {
  const { colors } = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entry = React.useMemo(
    () => (id ? findLicense(getLicenseData(), String(id)) : undefined),
    [id]
  );

  if (!entry) {
    return (
      <Screen header={<NavHeader />}>
        <EmptyState title={t('notFound')} />
      </Screen>
    );
  }

  const repo = entry.repository;
  const openRepo = async () => {
    if (repo && !(await openExternalLink(repo))) toast.show({ title: repo });
  };

  return (
    <Screen header={<NavHeader />}>
      <View style={{ gap: 6, paddingTop: 8, marginBottom: 20 }}>
        <Text variant="title2" accessibilityRole="header">
          {entry.name}
        </Text>
        <Text variant="body" tone="secondary">
          {[entry.version ? t('versionLabel', { version: entry.version }) : null, entry.license]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {entry.author ? (
          <Text variant="body" tone="secondary">
            {t('by', { author: entry.author })}
          </Text>
        ) : null}
      </View>
      {isLinkSet(repo) ? (
        <View style={{ marginBottom: 20, alignItems: 'flex-start' }}>
          <Button label={t('projectPage')} variant="link" onPress={openRepo} />
        </View>
      ) : null}
      <Card>
        {entry.licenseText ? (
          // Plain RN Text: the ds Text always applies the app font, this needs a monospace one.
          <RNText
            selectable
            style={{ fontFamily: MONO, fontSize: 15, lineHeight: 22, color: colors.ink }}>
            {entry.licenseText}
          </RNText>
        ) : (
          <Text variant="body">{t('noText', { license: entry.license })}</Text>
        )}
      </Card>
    </Screen>
  );
}
