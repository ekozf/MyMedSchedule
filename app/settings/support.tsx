/**
 * Settings › About › Contact support: one sentence, the support address (large, selectable, so it
 * can be copied when there's no mail app), a privacy note, and the primary "Write an email",
 * which opens the mail app with the subject and app / phone details filled in. A "Website" link
 * only when WEBSITE_URL is set.
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { Button, Card, NavHeader, Screen, Text, useToast } from '@/components/ds';
import { languageName, toAppLocale } from '@/components/onboarding';
import { SUPPORT_EMAIL, WEBSITE_URL, isLinkSet } from '@/lib/legal/config';
import { openExternalLink, openSupportEmail } from '@/lib/legal/support';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.about.support.${key}`, opts);

export default function SupportRoute() {
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const [noMailApp, setNoMailApp] = React.useState(false);

  const write = async () => {
    if (busy) return;
    setBusy(true);
    const locale = getCurrentLocale();
    const opened = await openSupportEmail(`${languageName(toAppLocale(locale))} (${locale})`);
    setBusy(false);
    if (!opened) {
      setNoMailApp(true);
      toast.show({ title: t('noMailApp', { email: SUPPORT_EMAIL }) });
    }
  };

  return (
    <Screen
      header={<NavHeader />}
      footer={<Button label={t('write')} onPress={write} loading={busy} />}>
      <View style={{ gap: 8, paddingTop: 8, marginBottom: 24 }}>
        <Text variant="title1" accessibilityRole="header">
          {t('title')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('body')}
        </Text>
      </View>
      <View style={{ gap: 20 }}>
        <Card>
          <View style={{ gap: 6 }}>
            <Text variant="subhead" weight="700" tone="secondary">
              {t('emailLabel')}
            </Text>
            <Text variant="title3" selectable>
              {SUPPORT_EMAIL}
            </Text>
            {noMailApp ? (
              <Text variant="footnote" tone="secondary">
                {t('selectHint')}
              </Text>
            ) : null}
          </View>
        </Card>
        <Text variant="body">{t('privacyNote')}</Text>
        {isLinkSet(WEBSITE_URL) ? (
          <View style={{ alignItems: 'flex-start' }}>
            <Button
              label={t('website')}
              variant="link"
              onPress={async () => {
                if (!(await openExternalLink(WEBSITE_URL))) toast.show({ title: WEBSITE_URL });
              }}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
