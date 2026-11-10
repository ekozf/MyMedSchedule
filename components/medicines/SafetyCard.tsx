/**
 * "Safety" group on the medicine page (docs/DESIGN.md §5.3): expiry date, most per day, time
 * between doses and "Ring even on silent", shown only when set. Renders nothing otherwise.
 *
 * @example
 * <SafetyGroup medication={med} />
 */
import * as React from 'react';
import i18n from '@/lib/i18n';
import { formatDose, formatShortDate } from '@/lib/ui/format';
import { ListGroup, ListRow } from '@/components/ds';
import type { Medication } from '@/types';
import { getExpiryInfo } from './medicine-info';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.medicines.page.${key}`, opts);

export function hasSafetyInfo(med: Medication): boolean {
  return !!(med.expirationDate || med.maxDailyDose || med.minHoursBetweenDoses || med.bypassDnd);
}

export function SafetyGroup({ medication: med, now }: { medication: Medication; now?: Date }) {
  if (!hasSafetyInfo(med)) return null;
  const expiry = getExpiryInfo(med, now);
  return (
    <ListGroup header={t('safety')}>
      {expiry && med.expirationDate ? (
        <ListRow
          title={t('expiry')}
          subtitle={expiry.relative}
          value={formatShortDate(new Date(med.expirationDate))}
        />
      ) : null}
      {med.maxDailyDose ? (
        <ListRow title={t('maxPerDay')} value={formatDose(med.maxDailyDose, med.dosageUnit)} />
      ) : null}
      {med.minHoursBetweenDoses ? (
        <ListRow
          title={t('minHours')}
          value={i18n.t('ui.editor.count.hours', { count: med.minHoursBetweenDoses })}
        />
      ) : null}
      {med.bypassDnd ? <ListRow title={t('ringOnSilent')} value={t('on')} /> : null}
    </ListGroup>
  );
}
