/**
 * Safety card on the medicine detail: max per day, min hours between doses, expiry and
 * Do Not Disturb bypass. Renders nothing when none of these are set.
 *
 * @example
 * <SafetyCard medication={med} />
 */
import * as React from 'react';
import { View } from 'react-native';
import {
  BellRing,
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  Gauge,
  Hourglass,
  ShieldCheck,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Card } from '@/components/ds';
import type { Medication } from '@/types';
import { getExpiryInfo, maxPerDayLabel, minHoursLabel } from './medicine-info';
import { CardTitle, InfoLine } from './parts';

export function hasSafetyInfo(med: Medication): boolean {
  return !!(med.expirationDate || med.maxDailyDose || med.minHoursBetweenDoses || med.bypassDnd);
}

export function SafetyCard({ medication: med, now }: { medication: Medication; now?: Date }) {
  if (!hasSafetyInfo(med)) return null;
  const maxDay = maxPerDayLabel(med);
  const minHours = minHoursLabel(med);
  const expiry = getExpiryInfo(med, now);

  return (
    <Card>
      <CardTitle icon={ShieldCheck} title={i18n.t('ui.medicines.safety.title')} />
      <View style={{ gap: 12 }}>
        {maxDay ? <InfoLine icon={Gauge} text={maxDay} /> : null}
        {minHours ? <InfoLine icon={Hourglass} text={minHours} /> : null}
        {expiry ? (
          <InfoLine
            icon={expiry.expired ? CalendarX2 : expiry.soon ? CalendarClock : CalendarCheck}
            tone={expiry.expired ? 'danger' : expiry.soon ? 'warning' : 'success'}
            text={expiry.relative}
            detail={expiry.date}
          />
        ) : null}
        {med.bypassDnd ? (
          <InfoLine icon={BellRing} text={i18n.t('ui.medicines.safety.bypassDnd')} />
        ) : null}
      </View>
    </Card>
  );
}
