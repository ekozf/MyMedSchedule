/**
 * Step 4 of 4 "Does this look right?" (docs/DESIGN.md §5.4): a compact summary first — header
 * card (photo or first letter, name + strength, "1 pill at 08:00 and 20:00, every day"), the
 * medicine's `MiniTray` (neutral "scheduled" tone), and groups Schedule / Medicine / Supply /
 * Notes and dose limits whose rows jump back to their step (supply and the notes / limits open as
 * their own pages with a Save). Row labels match the wizard questions ("Amount each time", "You
 * have now", "Times"). Under the header: "First reminder: today at 20:00", worked out from the
 * schedule (a new schedule starts when it's saved). The tray has the caption "Shown on Today as".
 * An unset pack size reads "Not set"; an untracked supply is one row "Supply · Not tracked". The
 * last group always has "Notes" and "Dose limits" ("Not set" or what is set; as-needed medicines
 * get "Maximum in one day, time between doses" under Dose limits), plus "Ring even on silent"
 * when it is on. The photo stays reachable from the Name row.
 *
 * @example
 * <ReviewSection form={form} onEdit={(step) => jumpTo(step)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import { useCompartmentBoundaries } from '@/lib/settings/compartments';
import { Card, ListGroup, ListRow, MedIcon, MiniTray, Text, useTheme } from '@/components/ds';
import { scheduleLine, scheduleTimes, traySlots } from '@/components/medicines/schedule-summary';
import { medicineDisplayName } from '@/components/medicines/medicine-info';
import { tracksSupply, type MedicineForm, type StepId, type StepIssue } from './form-model';
import {
  describeSchedule,
  describeStart,
  limitsSummary,
  reviewTimesValue,
  scheduleTypeTitle,
} from './describe';
import { firstDoseAfter, firstReminderText } from './first-reminder';
import { IssueHint } from './parts';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.review.${key}`, opts);

/**
 * Header card: photo or pill, "Metformin 500 mg", "1 pill at 08:00 and 20:00, every day" (other
 * schedules: "1 pill, every 2 days at 08:00").
 */
export function ReviewHeader({ form }: { form: MedicineForm }) {
  const { colors } = useTheme();
  const { formatTimeString } = useTimeFormat();
  const { boundaries } = useCompartmentBoundaries();
  const name = medicineDisplayName({ name: form.name.trim(), strength: form.strength });
  const line = scheduleLine(form, boundaries, formatTimeString);
  return (
    <Card accessible accessibilityLabel={`${name}, ${line}`}>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <MedIcon
          name={form.name}
          uri={form.imageUri}
          size="lg"
          initial
          style={{ backgroundColor: colors.bg }}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title3">{name || '—'}</Text>
          <Text variant="body" tone="secondary">
            {line}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export function ReviewSection({
  form,
  onEdit,
  issue,
}: {
  form: MedicineForm;
  onEdit: (step: StepId) => void;
  issue?: StepIssue | null;
}) {
  const { formatTimeString } = useTimeFormat();
  const { boundaries } = useCompartmentBoundaries();
  const unit = form.dosageUnit;
  const isPrn = form.scheduleType === 'prn';
  const refillValue = form.refillReminderValue ?? 0;
  const times = scheduleTimes(form.scheduleType, form.scheduleConfig);
  const start = describeStart(form.scheduleType, form.scheduleConfig);
  const notes = form.notes.trim();
  const limits = limitsSummary(form);
  const tracked = tracksSupply(form);
  const strength = form.strength.trim();
  const timesValue = reviewTimesValue(form.scheduleType, form.scheduleConfig, formatTimeString);
  const firstLine = React.useMemo(() => {
    const now = new Date();
    const first = firstDoseAfter(form, now);
    return first ? firstReminderText(first, now, formatTimeString) : null;
    // Only the schedule and the amount (tapering) change the answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.scheduleType, form.scheduleConfig, form.dosageAmount, formatTimeString]);

  const refill =
    form.refillReminderType === 'none'
      ? t('off')
      : form.refillReminderType === 'days'
        ? t('refillDaysLeft', { count: refillValue })
        : t('refillDosesLeft', { count: refillValue });

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 10 }}>
        <ReviewHeader form={form} />
        {firstLine ? (
          <Text variant="callout" weight="600" style={{ paddingHorizontal: 4 }}>
            {firstLine}
          </Text>
        ) : null}
      </View>
      {!isPrn && times.length ? (
        <View style={{ gap: 8 }}>
          <Text variant="subhead" weight="700" tone="secondary" style={{ paddingHorizontal: 4 }}>
            {t('trayCaption')}
          </Text>
          <MiniTray tone="scheduled" slots={traySlots(times, boundaries, formatTimeString)} />
        </View>
      ) : null}
      <IssueHint issue={issue} />

      <ListGroup header={t('schedule')}>
        <ListRow
          title={t('often')}
          value={scheduleTypeTitle(form.scheduleType)}
          onPress={() => onEdit('schedule')}
        />
        {!isPrn ? (
          timesValue ? (
            <ListRow title={t('when')} value={timesValue} onPress={() => onEdit('schedule')} />
          ) : (
            <ListRow
              title={t('when')}
              subtitle={[
                describeSchedule(form.scheduleType, form.scheduleConfig, formatTimeString, unit),
                start,
              ]
                .filter(Boolean)
                .join('. ')}
              onPress={() => onEdit('schedule')}
            />
          )
        ) : null}
      </ListGroup>

      <ListGroup header={t('medicine')}>
        <ListRow title={t('name')} value={form.name.trim()} onPress={() => onEdit('name')} />
        {strength ? (
          <ListRow title={t('strength')} value={strength} onPress={() => onEdit('name')} />
        ) : null}
        <ListRow
          title={t('each')}
          value={formatDose(form.dosageAmount, unit)}
          onPress={() => onEdit('dose')}
        />
        {form.imageUri ? (
          <ListRow title={t('photo')} value={t('photoAdded')} onPress={() => onEdit('name')} />
        ) : null}
      </ListGroup>

      {tracked ? (
        <ListGroup header={t('supply')}>
          <ListRow
            title={t('inStock')}
            value={formatDose(form.inventoryCount, unit)}
            onPress={() => onEdit('supply')}
          />
          <ListRow
            title={t('packageSize')}
            value={form.packageSize !== null ? formatDose(form.packageSize, unit) : t('notSet')}
            onPress={() => onEdit('supply')}
          />
          <ListRow title={t('refill')} value={refill} onPress={() => onEdit('supply')} />
        </ListGroup>
      ) : (
        <ListGroup>
          <ListRow title={t('supply')} value={t('notTracked')} onPress={() => onEdit('supply')} />
        </ListGroup>
      )}

      {/* Notes and dose limits: always both rows, "Not set" until filled in. */}
      <ListGroup header={t('extrasGroup')}>
        <ListRow
          title={t('notes')}
          subtitle={notes || undefined}
          value={notes ? undefined : t('notSet')}
          onPress={() => onEdit('extras')}
        />
        <ListRow
          title={t('doseLimits')}
          subtitle={limits ?? (isPrn ? t('doseLimitsPrnHint') : undefined)}
          value={limits ? undefined : t('notSet')}
          onPress={() => onEdit('extras')}
        />
        {form.bypassDnd ? (
          <ListRow title={t('dnd')} value={t('on')} onPress={() => onEdit('extras')} />
        ) : null}
      </ListGroup>
    </View>
  );
}
