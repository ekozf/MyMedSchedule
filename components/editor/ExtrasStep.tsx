/**
 * Step 6 "A few extras" (docs/DESIGN.md §5.4): "Note (shown with every dose)", the "Expiry date"
 * row (it is printed on the box, not a limit, so it has its own group), then "Dose limits from your
 * prescription" with Most in one day and Time between doses (unset rows read "Not set" with no
 * description; once set, the row says what happens; each opens a stepper sheet with a quiet
 * "Remove limit" / "No limit"), with a one-line description under the limits title, and the
 * "Ring even on silent" switch in its own "Reminder sound" group.
 * Everything is optional. `part` shows just the note, just the limits or just the expiry date
 * (edit list rows "Note" / "Dose limits" / "Expiry date"); the default shows all of it.
 *
 * @example
 * <ExtrasSection form={form} update={update} />
 * <ExtrasSection form={form} update={update} part="expiry" />
 */
import * as React from 'react';
import { View } from 'react-native';
import { startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { formatDose, formatShortDate, formatUnit } from '@/lib/ui/format';
import { Button, CalendarSheet, ListGroup, ListRow, Text, TextField } from '@/components/ds';
import { NOTES_MAX, doseStep, type StepIssue } from './form-model';
import { FieldLabel, IssueHint } from './parts';
import { OptionalNumberRow } from './NumberSheet';
import type { SectionProps } from './steps';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.extras.${key}`, opts);

export function ExtrasSection({
  form,
  update,
  issue,
  part = 'all',
}: SectionProps & { issue?: StepIssue | null; part?: 'all' | 'note' | 'limits' | 'expiry' }) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const unit = form.dosageUnit;
  const s = doseStep(unit);
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const expiry = form.expirationDate;
  const noExpiry = i18n.t('ui.editor.screens.noExpiry');

  return (
    <View style={{ gap: 20 }}>
      {part === 'all' || part === 'note' ? (
        <TextField
          label={part === 'note' ? undefined : t('notes')}
          accessibilityLabel={t('notes')}
          autoFocus={part === 'note'}
          value={form.notes}
          onChangeText={(notes) => update.set({ notes })}
          placeholder={t('notesPlaceholder')}
          multiline
          maxLength={NOTES_MAX}
        />
      ) : null}

      {part === 'all' || part === 'expiry' ? (
        <ListGroup>
          <ListRow
            title={t('expiry')}
            value={expiry ? formatShortDate(expiry) : t('notSet')}
            onPress={() => setCalendarOpen(true)}
          />
        </ListGroup>
      ) : null}

      {part === 'all' || part === 'limits' ? (
        <View style={{ gap: 8 }}>
          {/* The Limits page already has this as its title and subtitle. */}
          {part === 'all' ? (
            <View style={{ gap: 2 }}>
              <FieldLabel>{t('safety')}</FieldLabel>
              <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 4 }}>
                {t('safetyHint')}
              </Text>
            </View>
          ) : null}
          <ListGroup>
            <OptionalNumberRow
              title={t('maxPerDay')}
              subtitle={t('maxPerDayHint')}
              subtitleOnlyWhenSet
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
              title={t('minHours')}
              subtitle={t('minHoursHint')}
              subtitleOnlyWhenSet
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
          </ListGroup>
        </View>
      ) : null}

      {part === 'all' ? (
        <ListGroup header={t('sound')}>
          <ListRow
            title={t('dnd')}
            subtitle={t('dndHint')}
            switchValue={form.bypassDnd}
            onSwitchChange={(bypassDnd) => update.set({ bypassDnd })}
          />
        </ListGroup>
      ) : null}
      <IssueHint issue={issue} />

      <CalendarSheet
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        value={expiry ?? today}
        minimumDate={today}
        title={t('expiry')}
        onChange={(d) => update.set({ expirationDate: startOfDay(d) })}
        footer={
          <Button
            label={expiry ? t('expiryRemove') : noExpiry}
            variant="quiet"
            onPress={() => {
              update.set({ expirationDate: null });
              setCalendarOpen(false);
            }}
          />
        }
      />
    </View>
  );
}
