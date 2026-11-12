/**
 * Settings › About › Terms of use: short plain-language terms under Belgian law, with links to
 * "Your data and privacy" and "Open-source licences".
 * NOT LEGAL ADVICE — the texts (lib/i18n/locales/ui/legal.ts) need a lawyer's review before launch.
 */
import * as React from 'react';
import { router } from 'expo-router';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { ListGroup, ListRow, useToast } from '@/components/ds';
import { LegalDocument } from '@/components/legal/LegalDocument';
import {
  PUBLISHER_NAME,
  SUPPORT_EMAIL,
  TERMS_EFFECTIVE_DATE,
  TERMS_URL,
  TERMS_VERSION,
  isLinkSet,
} from '@/lib/legal/config';
import { formatLegalDate } from '@/lib/legal/legal-text';
import { openExternalLink } from '@/lib/legal/support';
import { YOU_ROUTES } from '@/components/you/routes';

const SECTIONS = [
  'provider',
  'whatItIs',
  'reminders',
  'free',
  'asIs',
  'liability',
  'data',
  'openSource',
  'changes',
  'law',
] as const;

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.legal.${key}`, opts);

export default function TermsRoute() {
  const toast = useToast();
  const vars = { publisher: PUBLISHER_NAME, email: SUPPORT_EMAIL };
  const sections = SECTIONS.map((key) => ({
    key,
    title: t(`terms.sections.${key}.title`),
    body: t(`terms.sections.${key}.body`, vars),
  }));
  const openTerms = async () => {
    if (!(await openExternalLink(TERMS_URL))) toast.show({ title: TERMS_URL });
  };
  return (
    <LegalDocument
      title={t('terms.title')}
      subtitle={t('terms.subtitle')}
      sections={sections}
      updated={t('updated', {
        date: formatLegalDate(TERMS_EFFECTIVE_DATE, getCurrentLocale()),
        version: TERMS_VERSION,
      })}
      links={
        <ListGroup>
          <ListRow title={t('terms.readPrivacy')} onPress={() => router.push(YOU_ROUTES.privacy)} />
          <ListRow
            title={t('terms.readLicenses')}
            onPress={() => router.push(YOU_ROUTES.licenses)}
          />
          {isLinkSet(TERMS_URL) ? (
            <ListRow title={t('terms.fullTerms')} onPress={openTerms} />
          ) : null}
        </ListGroup>
      }
    />
  );
}
