/**
 * Extras section: notes, expiry date, max per day, minimum time between doses and "Break through
 * Do Not Disturb". Everything is optional.
 *
 * @example
 * <ExtrasStep form={form} update={update} variant="inline" canClearExpiry={false} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { BellRing, CalendarX, Hourglass, ShieldAlert, X } from 'lucide-react-native';
import { startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { formatDose, formatShortDate, formatUnit } from '@/lib/ui/format';
import {
  CalendarSheet,
  IconButton,
  ListGroup,
  ListRow,
  TextField,
  useTheme,
} from '@/components/ds';
import { NOTES_MAX, doseStep, type StepIssue } from './form-model';
import { IssueHint, StepHeader } from './parts';
import { OptionalNumberRow } from './NumberSheet';
import type { StepProps } from './steps';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.extras.${key}`, opts);

export function ExtrasStep({
  form,
  update,
  variant = 'guided',
  issue,
  canClearExpiry = true,
}: StepProps & {
  issue?: StepIssue | null;
  /**
   * Whether a set expiry date can be removed. The DB layer can't clear a stored expiry date, so
   * the edit page turns this off when the medicine already had one (the user can pick a new date).
   */
  canClearExpiry?: boolean;
}) {
  const { colors } = useTheme();
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const unit = form.dosageUnit;
  const s = doseStep(unit);
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const expiry = form.expirationDate;

  return (
    <View style={{ gap: 16 }}>
      {variant === 'guided' ? <StepHeader title={t('title')} helper={t('helper')} /> : null}

      <TextField
        label={t('notes')}
        value={form.notes}
        onChangeText={(notes) => update.set({ notes })}
        placeholder={t('notesPlaceholder')}
        helper={t('notesHelper')}
        multiline
        maxLength={NOTES_MAX}
      />

      <ListGroup header={t('safety')}>
        <ListRow
          icon={CalendarX}
          iconTint={colors.warning}
          title={t('expiry')}
          value={expiry ? formatShortDate(expiry) : t('notSet')}
          onPress={() => setCalendarOpen(true)}
          accessory={
            expiry && canClearExpiry ? (
              <IconButton
                icon={X}
                size="sm"
                variant="plain"
                tone="default"
                accessibilityLabel={t('expiryRemove')}
                onPress={() => update.set({ expirationDate: null })}
              />
            ) : undefined
          }
        />
        <OptionalNumberRow
          icon={ShieldAlert}
          iconTint={colors.danger}
          title={t('maxPerDay')}
          hint={t('maxPerDayHint')}
          value={form.maxDailyDose}
          defaultValue={Math.max(form.dosageAmount * 4, s.min)}
          min={s.min}
          step={s.step}
          allowDecimal
          format={(n) => formatDose(n, unit)}
          unit={(n) => formatUnit(n, unit)}
          onChange={(maxDailyDose) => update.set({ maxDailyDose })}
        />
        <OptionalNumberRow
          icon={Hourglass}
          title={t('minHours')}
          hint={t('minHoursHint')}
          value={form.minHoursBetweenDoses}
          defaultValue={4}
          min={0.5}
          max={168}
          step={0.5}
          allowDecimal
          format={(n) => i18n.t('ui.editor.count.hours', { count: n })}
          unit={(n) => i18n.t('ui.editor.count.hourUnit', { count: n })}
          onChange={(minHoursBetweenDoses) => update.set({ minHoursBetweenDoses })}
        />
        <ListRow
          icon={BellRing}
          iconTint={colors.success}
          title={t('dnd')}
          subtitle={t('dndHint')}
          switchValue={form.bypassDnd}
          onSwitchChange={(bypassDnd) => update.set({ bypassDnd })}
        />
      </ListGroup>
      <IssueHint issue={issue} />

      <CalendarSheet
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        value={expiry ?? today}
        minimumDate={today}
        title={t('expiry')}
        onChange={(d) => update.set({ expirationDate: startOfDay(d) })}
      />
    </View>
  );
}
