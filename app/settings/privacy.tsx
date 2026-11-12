/**
 * Settings › About › Your data and privacy: what the app keeps, how it's protected, the honest
 * limits, backups, permissions, your control and contact, in short sections. Every claim is
 * checked against the code (see the comment in lib/i18n/locales/ui/legal.ts).
 */
import * as React from 'react';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { ListGroup, ListRow, useToast } from '@/components/ds';
import { LegalDocument } from '@/components/legal/LegalDocument';
import {
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_POLICY_URL,
  PRIVACY_VERSION,
  SUPPORT_EMAIL,
  isLinkSet,
} from '@/lib/legal/config';
import { formatLegalDate } from '@/lib/legal/legal-text';
import { openExternalLink } from '@/lib/legal/support';

const SECTIONS = [
  'onPhone',
  'stored',
  'protected',
  'limits',
  'backups',
  'permissions',
  'control',
  'contact',
] as const;

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.legal.${key}`, opts);

export default function PrivacyRoute() {
  const toast = useToast();
  const sections = SECTIONS.map((key) => ({
    key,
    title: t(`privacy.sections.${key}.title`),
    body: t(`privacy.sections.${key}.body`, { email: SUPPORT_EMAIL }),
  }));
  const openPolicy = async () => {
    if (!(await openExternalLink(PRIVACY_POLICY_URL))) {
      toast.show({ title: PRIVACY_POLICY_URL });
    }
  };
  return (
    <LegalDocument
      title={t('privacy.title')}
      subtitle={t('privacy.subtitle')}
      sections={sections}
      updated={t('updated', {
        date: formatLegalDate(PRIVACY_EFFECTIVE_DATE, getCurrentLocale()),
        version: PRIVACY_VERSION,
      })}
      links={
        isLinkSet(PRIVACY_POLICY_URL) ? (
          <ListGroup>
            <ListRow title={t('privacy.fullPolicy')} onPress={openPolicy} />
          </ListGroup>
        ) : undefined
      }
    />
  );
}
