/**
 * Review: a friendly summary card and grouped rows for every section; tapping a row jumps back to
 * that step.
 *
 * @example
 * <ReviewStep form={form} onEdit={(step) => jumpTo(step)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import {
  BellRing,
  CalendarClock,
  CalendarX,
  Hourglass,
  ImagePlus,
  Package,
  Pill,
  RefreshCw,
  ShieldAlert,
  StickyNote,
  Type,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { formatDose, formatShortDate, useTimeFormat } from '@/lib/ui/format';
import { Card, ListGroup, ListRow, MedTile, Text, useTheme } from '@/components/ds';
import type { MedicineForm, StepId, StepIssue } from './form-model';
import { describeSchedule, describeStart, scheduleTypeTitle } from './describe';
import { IssueHint, StepHeader } from './parts';
import { SCHEDULE_TYPE_ICONS } from './ScheduleTypeCards';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.review.${key}`, opts);

/** Hero summary: tile + name + dose + schedule sentence. Also used on the edit page. */
export function MedicineSummaryCard({ form }: { form: MedicineForm }) {
  const { formatTimeString } = useTimeFormat();
  const schedule = describeSchedule(
    form.scheduleType,
    form.scheduleConfig,
    formatTimeString,
    form.dosageUnit
  );
  const start = describeStart(form.scheduleType, form.scheduleConfig);
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <MedTile name={form.name} imageUri={form.imageUri} size="lg" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title2" numberOfLines={2}>
            {form.name.trim() || '—'}
          </Text>
          <Text variant="body" tone="secondary">
            {formatDose(form.dosageAmount, form.dosageUnit)}
          </Text>
        </View>
      </View>
      <View style={{ marginTop: 14, gap: 2 }}>
        <Text variant="headline" tone="accent">
          {schedule}
        </Text>
        {start ? (
          <Text variant="subhead" tone="secondary">
            {start}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

export function ReviewStep({
  form,
  onEdit,
  issue,
}: {
  form: MedicineForm;
  onEdit: (step: StepId) => void;
  issue?: StepIssue | null;
}) {
  const { colors } = useTheme();
  const { formatTimeString } = useTimeFormat();
  const unit = form.dosageUnit;
  const isPrn = form.scheduleType === 'prn';
  const refillValue = form.refillReminderValue ?? 0;

  const refill =
    form.refillReminderType === 'none'
      ? t('off')
      : t(form.refillReminderType === 'days' ? 'refillDaysLeft' : 'refillDosesLeft', {
          count: refillValue,
        });

  return (
    <View style={{ gap: 16 }}>
      <StepHeader title={t('title')} helper={t('helper')} />
      <MedicineSummaryCard form={form} />
      <IssueHint issue={issue} />

      <ListGroup header={t('medicine')}>
        <ListRow
          icon={Type}
          title={t('name')}
          value={form.name.trim()}
          onPress={() => onEdit('name')}
        />
        <ListRow
          icon={ImagePlus}
          title={t('photo')}
          value={form.imageUri ? t('photoAdded') : t('none')}
          onPress={() => onEdit('name')}
        />
        <ListRow
          icon={Pill}
          title={t('each')}
          value={formatDose(form.dosageAmount, unit)}
          onPress={() => onEdit('dose')}
        />
      </ListGroup>

      <ListGroup header={t('schedule')}>
        <ListRow
          icon={SCHEDULE_TYPE_ICONS[form.scheduleType]}
          title={t('often')}
          subtitle={scheduleTypeTitle(form.scheduleType)}
          onPress={() => onEdit('type')}
        />
        {!isPrn ? (
          <ListRow
            icon={CalendarClock}
            title={t('when')}
            subtitle={describeSchedule(
              form.scheduleType,
              form.scheduleConfig,
              formatTimeString,
              unit
            )}
            onPress={() => onEdit('when')}
          />
        ) : null}
      </ListGroup>

      <ListGroup header={t('supply')}>
        <ListRow
          icon={Package}
          title={t('inStock')}
          value={formatDose(form.inventoryCount, unit)}
          onPress={() => onEdit('supply')}
        />
        <ListRow
          icon={Package}
          title={t('packageSize')}
          value={form.packageSize !== null ? formatDose(form.packageSize, unit) : t('none')}
          onPress={() => onEdit('supply')}
        />
        <ListRow
          icon={RefreshCw}
          title={t('refill')}
          subtitle={refill}
          onPress={() => onEdit('supply')}
        />
      </ListGroup>

      <ListGroup header={t('extras')}>
        <ListRow
          icon={StickyNote}
          title={t('notes')}
          subtitle={form.notes.trim() || t('none')}
          onPress={() => onEdit('extras')}
        />
        <ListRow
          icon={CalendarX}
          iconTint={colors.warning}
          title={t('expiry')}
          value={form.expirationDate ? formatShortDate(form.expirationDate) : t('none')}
          onPress={() => onEdit('extras')}
        />
        <ListRow
          icon={ShieldAlert}
          iconTint={colors.danger}
          title={t('maxPerDay')}
          value={form.maxDailyDose !== null ? formatDose(form.maxDailyDose, unit) : t('none')}
          onPress={() => onEdit('extras')}
        />
        <ListRow
          icon={Hourglass}
          title={t('minHours')}
          value={
            form.minHoursBetweenDoses !== null
              ? i18n.t('ui.editor.count.hours', { count: form.minHoursBetweenDoses })
              : t('none')
          }
          onPress={() => onEdit('extras')}
        />
        <ListRow
          icon={BellRing}
          iconTint={colors.success}
          title={t('dnd')}
          value={form.bypassDnd ? t('on') : t('off')}
          onPress={() => onEdit('extras')}
        />
      </ListGroup>
    </View>
  );
}
