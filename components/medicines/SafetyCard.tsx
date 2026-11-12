/**
 * Groups under the supply card on the medicine page (docs/DESIGN.md §5.3):
 * - `ExpiryRow`: "Expiry date" with the date and "Expires in 40 days" (or "Not set ›" to add one).
 * - `SafetyGroup`: "Dose limits" (most per day, time between doses), shown when set; otherwise an
 *   "Add dose limits ›" row when `onAdd` is given. Renders nothing when neither applies.
 * - `SoundGroup`: "Reminder sound · Ring even on silent · On", only when it is on.
 *
 * @example
 * <ExpiryRow medication={med} onEdit={openExpiry} />
 * <SafetyGroup medication={med} onAdd={openLimits} />
 */
import * as React from 'react';
import i18n from '@/lib/i18n';
import { formatDose, formatShortDate } from '@/lib/ui/format';
import { ListGroup, ListRow } from '@/components/ds';
import type { Medication } from '@/types';
import { getExpiryInfo, medicineHasLimits } from './medicine-info';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.medicines.page.${key}`, opts);

export function ExpiryRow({
  medication: med,
  onEdit,
  now,
}: {
  medication: Medication;
  onEdit?: () => void;
  now?: Date;
}) {
  const expiry = getExpiryInfo(med, now);
  if (!expiry && !onEdit) return null;
  return (
    <ListGroup>
      <ListRow
        title={t('expiry')}
        subtitle={expiry?.relative}
        value={
          expiry && med.expirationDate
            ? formatShortDate(new Date(med.expirationDate))
            : i18n.t('ui.editor.extras.notSet')
        }
        onPress={onEdit}
      />
    </ListGroup>
  );
}

export function SafetyGroup({
  medication: med,
  onAdd,
}: {
  medication: Medication;
  /** "Add dose limits" (open the limits editor) when none are set. */
  onAdd?: () => void;
}) {
  if (!medicineHasLimits(med)) {
    if (!onAdd) return null;
    return (
      <ListGroup header={t('safety')}>
        <ListRow title={i18n.t('ui.medicines.setup.limits')} onPress={onAdd} />
      </ListGroup>
    );
  }
  return (
    <ListGroup header={t('safety')}>
      {med.maxDailyDose ? (
        <ListRow title={t('maxPerDay')} value={formatDose(med.maxDailyDose, med.dosageUnit)} />
      ) : null}
      {med.minHoursBetweenDoses ? (
        <ListRow
          title={t('minHours')}
          value={i18n.t('ui.editor.count.hours', { count: med.minHoursBetweenDoses })}
        />
      ) : null}
    </ListGroup>
  );
}

export function SoundGroup({ medication: med }: { medication: Medication }) {
  if (!med.bypassDnd) return null;
  return (
    <ListGroup header={i18n.t('ui.editor.extras.sound')}>
      <ListRow title={t('ringOnSilent')} value={t('on')} />
    </ListGroup>
  );
}
