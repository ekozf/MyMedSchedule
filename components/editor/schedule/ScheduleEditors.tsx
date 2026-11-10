/**
 * Step 4 "When do you take it?" (docs/DESIGN.md §5.4), one editor per schedule type. Every change
 * builds the next config from the current props (never from stale local state).
 *
 * - Every day: a list of time cards (one by default), "+ Add another time" (opens the picker at
 *   the next free time) and, with two or more times, "Different amount at this time?". One time is
 *   stored as once_daily, two or more as multiple_daily (switched as times are added or removed;
 *   `storedSchedule` does the same on save). Each card has a
 *   "Remove" button; removing the only time asks first and keeps one (it picks a new time instead).
 * - Certain days: preset chips (Weekdays, Weekends, Every day) above the seven day toggles.
 * - Every few days, certain days, once a month, cycles, every few hours, lowering: steppers, chips,
 *   date rows and a time card, each with a plain summary.
 *
 * @example
 * <WhenEditor form={form} update={update} minStartDate={today} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { addDays, startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { formatDose, formatUnit, useTimeFormat } from '@/lib/ui/format';
import type { ScheduleType } from '@/types';
import {
  Button,
  Card,
  Chip,
  ChipRow,
  Divider,
  ListRow,
  PressableScale,
  Stepper,
  Text,
  useConfirm,
  useTheme,
} from '@/components/ds';
import {
  MAX_DAILY_TIMES,
  cyclePattern,
  doseStep,
  everyXHoursTimes,
  hasAmountOverride,
  nextFreeTime,
  sortTimes,
  timeToMinutes,
  type MedicineForm,
  type ScheduleConfigMap,
} from '../form-model';
import type { MedicineFormUpdater } from '../useMedicineForm';
import {
  dayMonth,
  describeSchedule,
  joinList,
  occurrenceShort,
  weekdayMini,
  weekdayName,
  weekdayOrder,
} from '../describe';
import { nextCycleBreak, taperingPlan } from './plan';
import {
  DateRow,
  FieldLabel,
  SummaryCard,
  TimeCard,
  useTimePicker,
  type TimePicker,
} from '../parts';

const tw = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.when.${key}`, opts);
const ts = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(`ui.editor.screens.${key}`, opts);

type DailyEntry = ScheduleConfigMap['multiple_daily']['times'][number];

/** "Every day at 08:00 and 20:00. We'll remind you at both." */
export function dailySummary(times: string[], fmt: (t: string) => string): string {
  const list = joinList(sortTimes(times.map((time) => ({ time }))).map((x) => fmt(x.time)));
  const key = times.length <= 1 ? 'dailyOne' : times.length === 2 ? 'dailyTwo' : 'dailyMany';
  return ts(key, { times: list });
}

export interface WhenEditorProps {
  form: MedicineForm;
  update: MedicineFormUpdater;
  /** Earliest selectable start date (add: today). */
  minStartDate?: Date;
}

export function WhenEditor({ form, update, minStartDate }: WhenEditorProps) {
  const picker = useTimePicker();
  const config = form.scheduleConfig as unknown;
  const set = (c: unknown) => update.setConfig(c as MedicineForm['scheduleConfig']);
  const type: ScheduleType = form.scheduleType;

  let editor: React.ReactNode = null;
  switch (type) {
    case 'once_daily':
    case 'multiple_daily':
      editor = <DailyTimesEditor form={form} update={update} picker={picker} />;
      break;
    case 'every_x_days':
      editor = (
        <EveryXDaysEditor
          config={config as ScheduleConfigMap['every_x_days']}
          onChange={set}
          minStartDate={minStartDate}
          picker={picker}
        />
      );
      break;
    case 'specific_weekdays':
      editor = (
        <WeekdaysEditor
          config={config as ScheduleConfigMap['specific_weekdays']}
          onChange={set}
          picker={picker}
        />
      );
      break;
    case 'xth_weekday':
      editor = (
        <XthWeekdayEditor
          config={config as ScheduleConfigMap['xth_weekday']}
          onChange={set}
          picker={picker}
        />
      );
      break;
    case 'cycle':
      editor = (
        <CycleEditor
          config={config as ScheduleConfigMap['cycle']}
          onChange={set}
          minStartDate={minStartDate}
          picker={picker}
        />
      );
      break;
    case 'every_x_hours':
      editor = (
        <EveryXHoursEditor
          config={config as ScheduleConfigMap['every_x_hours']}
          onChange={set}
          picker={picker}
        />
      );
      break;
    case 'tapering':
      editor = (
        <TaperingEditor
          config={config as ScheduleConfigMap['tapering']}
          onChange={set}
          form={form}
          minStartDate={minStartDate}
          picker={picker}
        />
      );
      break;
    case 'prn':
      editor = <PrnInfoCard />;
      break;
  }

  return (
    <View style={{ gap: 12 }}>
      {editor}
      {picker.element}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Every day / several times a day

function DailyTimesEditor({
  form,
  update,
  picker,
}: {
  form: MedicineForm;
  update: MedicineFormUpdater;
  picker: TimePicker;
}) {
  const { formatTimeString } = useTimeFormat();
  const confirm = useConfirm();
  const type = form.scheduleType;
  const entries: DailyEntry[] =
    type === 'once_daily'
      ? [{ time: (form.scheduleConfig as ScheduleConfigMap['once_daily']).time }]
      : (form.scheduleConfig as ScheduleConfigMap['multiple_daily']).times;
  const unit = form.dosageUnit;
  const s = doseStep(unit);
  const full = entries.length >= MAX_DAILY_TIMES;
  const several = entries.length > 1;
  // Times whose amount stepper the user opened with "Different amount at this time?". Otherwise the
  // stepper only shows for a stored amount that differs from the usual one.
  const [opened, setOpened] = React.useState<ReadonlySet<string>>(() => new Set());
  const setOpen = (time: string, open: boolean, from?: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      if (from) next.delete(from);
      if (open) next.add(time);
      else next.delete(time);
      return next;
    });

  // "Every day": one time is stored as once_daily, more as multiple_daily.
  const commit = (next: DailyEntry[]) => {
    const sorted = sortTimes(next);
    if (sorted.length === 1) {
      if (type === 'once_daily') update.setConfig({ time: sorted[0].time });
      else update.set({ scheduleType: 'once_daily', scheduleConfig: { time: sorted[0].time } });
    } else if (type === 'once_daily') {
      update.set({ scheduleType: 'multiple_daily', scheduleConfig: { times: sorted } });
    } else {
      update.setConfig({ times: sorted });
    }
  };

  // A scheduled medicine needs at least one time: removing the last one asks, then replaces it.
  const remove = async (i: number) => {
    if (entries.length > 1) {
      const rest = entries.filter((_, j) => j !== i);
      // With one time left the usual amount applies, so drop a per-time amount.
      commit(rest.length === 1 ? [{ time: rest[0].time }] : rest);
      return;
    }
    const ok = await confirm({
      title: tw('removeOnlyTitle'),
      message: tw('removeOnlyMessage'),
      confirmLabel: tw('removeOnlyConfirm'),
    });
    if (!ok) return;
    const time = await picker.pick(entries[i].time, ts('timeN', { n: i + 1 }));
    if (time) commit(entries.map((e, j) => (j === i ? { ...e, time } : e)));
  };

  const addAnother = async () => {
    const time = await picker.pick(nextFreeTime(entries), ts('timeN', { n: entries.length + 1 }));
    if (!time || entries.some((e) => e.time === time)) return;
    commit([...entries, { time }]);
  };

  return (
    <View style={{ gap: 12 }}>
      {entries.map((entry, i) => {
        const label = ts('timeN', { n: i + 1 });
        const shown = formatTimeString(entry.time);
        const custom =
          hasAmountOverride(entry.dosageAmount, form.dosageAmount) ||
          (entry.dosageAmount !== undefined && opened.has(entry.time));
        const amount = entry.dosageAmount ?? form.dosageAmount;
        return (
          <TimeCard
            key={`${i}-${entries.length}`}
            label={label}
            time={entry.time}
            picker={picker}
            onChange={(time) => {
              if (opened.has(entry.time)) setOpen(time, true, entry.time);
              commit(entries.map((e, j) => (j === i ? { ...e, time } : e)));
            }}
            onRemove={() => void remove(i)}
            removeLabel={tw('removeTime', { time: shown })}>
            {several ? (
              <View>
                <Divider inset={16} strong style={{ marginRight: 16 }} />
                <ListRow
                  title={tw('differentAmount')}
                  accessibilityLabel={tw('differentAmountA11y', { time: shown })}
                  switchValue={custom}
                  onSwitchChange={(on) => {
                    setOpen(entry.time, on);
                    commit(
                      entries.map((e, j) =>
                        j !== i
                          ? e
                          : on
                            ? { ...e, dosageAmount: e.dosageAmount ?? form.dosageAmount }
                            : { time: e.time }
                      )
                    );
                  }}
                />
                {custom ? (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                    <Stepper
                      style={{ paddingHorizontal: 0, paddingVertical: 4 }}
                      value={amount}
                      onChange={(n) =>
                        commit(entries.map((e, j) => (j === i ? { ...e, dosageAmount: n } : e)))
                      }
                      min={s.min}
                      step={s.step}
                      max={100000}
                      allowDecimal
                      unit={formatUnit(amount, unit)}
                      accessibilityLabel={tw('amountAt', { time: shown })}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </TimeCard>
        );
      })}
      <Button variant="secondary" label={ts('addAnother')} disabled={full} onPress={addAnother} />
      {full ? (
        <Text variant="footnote" tone="secondary" align="center">
          {tw('maxTimes')}
        </Text>
      ) : null}
      <SummaryCard
        text={dailySummary(
          entries.map((e) => e.time),
          formatTimeString
        )}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Days

function EveryXDaysEditor({
  config,
  onChange,
  minStartDate,
  picker,
}: {
  config: ScheduleConfigMap['every_x_days'];
  onChange: (c: ScheduleConfigMap['every_x_days']) => void;
  minStartDate?: Date;
  picker: TimePicker;
}) {
  const { formatTimeString } = useTimeFormat();
  return (
    <View style={{ gap: 12 }}>
      <Stepper
        label={ts('everyDays')}
        value={config.intervalDays}
        min={1}
        max={365}
        unit={i18n.t('ui.editor.count.dayUnit', { count: config.intervalDays })}
        onChange={(intervalDays) => onChange({ ...config, intervalDays })}
      />
      <DateRow
        label={tw('startDate')}
        value={config.startDate}
        minimumDate={minStartDate}
        onChange={(startDate) => onChange({ ...config, startDate })}
      />
      <TimeCard
        label={tw('time')}
        time={config.time}
        picker={picker}
        onChange={(time) => onChange({ ...config, time })}
      />
      <SummaryCard text={describeSchedule('every_x_days', config, formatTimeString)} />
    </View>
  );
}

/**
 * The seven days as one row of equal-width toggles (two-letter abbreviations) in the locale's
 * week order; fits a 360 dp screen. `multiple` = checkboxes, else radios.
 */
export function WeekdayRow({
  selected,
  onToggle,
  multiple,
}: {
  selected: number[];
  onToggle: (day: number) => void;
  multiple: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole={multiple ? undefined : 'radiogroup'}
      style={{ flexDirection: 'row', gap: 6 }}>
      {weekdayOrder().map((d) => {
        const on = selected.includes(d);
        return (
          <PressableScale
            key={d}
            onPress={() => onToggle(d)}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityLabel={weekdayName(d)}
            accessibilityState={multiple ? { checked: on } : { selected: on }}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 2,
              backgroundColor: on ? colors.accent : colors.field,
            }}>
            <Text
              variant="headline"
              color={on ? colors.onAccent : colors.ink}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}>
              {weekdayMini(d)}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && a.every((d) => b.includes(d));

function WeekdaysEditor({
  config,
  onChange,
  picker,
}: {
  config: ScheduleConfigMap['specific_weekdays'];
  onChange: (c: ScheduleConfigMap['specific_weekdays']) => void;
  picker: TimePicker;
}) {
  const { formatTimeString } = useTimeFormat();
  const days = config.weekdays;
  const toggle = (d: number) =>
    onChange({
      ...config,
      weekdays: days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b),
    });
  const quick = [
    { label: tw('quickWeekdays'), days: WEEKDAYS },
    { label: tw('quickWeekends'), days: WEEKENDS },
    { label: tw('quickEveryDay'), days: ALL_DAYS },
  ];
  return (
    <View style={{ gap: 12 }}>
      <FieldLabel>{tw('whichDays')}</FieldLabel>
      <ChipRow>
        {quick.map((q) => (
          <Chip
            key={q.label}
            label={q.label}
            size="sm"
            selected={sameSet(days, q.days)}
            onPress={() => onChange({ ...config, weekdays: [...q.days] })}
          />
        ))}
      </ChipRow>
      <WeekdayRow selected={days} onToggle={toggle} multiple />
      <TimeCard
        label={tw('time')}
        time={config.time}
        picker={picker}
        onChange={(time) => onChange({ ...config, time })}
      />
      {/* No days yet: the footnote by Next says so; no empty summary card. */}
      {days.length ? (
        <SummaryCard text={describeSchedule('specific_weekdays', config, formatTimeString)} />
      ) : null}
    </View>
  );
}

function XthWeekdayEditor({
  config,
  onChange,
  picker,
}: {
  config: ScheduleConfigMap['xth_weekday'];
  onChange: (c: ScheduleConfigMap['xth_weekday']) => void;
  picker: TimePicker;
}) {
  const { formatTimeString } = useTimeFormat();
  return (
    <View style={{ gap: 12 }}>
      <FieldLabel>{tw('whichOne')}</FieldLabel>
      <ChipRow>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip
            key={n}
            label={occurrenceShort(n)}
            accessibilityRole="radio"
            selected={config.occurrence === n}
            onPress={() => onChange({ ...config, occurrence: n })}
          />
        ))}
      </ChipRow>
      <FieldLabel>{tw('whichDay')}</FieldLabel>
      <WeekdayRow
        selected={[config.weekday]}
        onToggle={(weekday) => onChange({ ...config, weekday })}
        multiple={false}
      />
      <TimeCard
        label={tw('time')}
        time={config.time}
        picker={picker}
        onChange={(time) => onChange({ ...config, time })}
      />
      <SummaryCard text={describeSchedule('xth_weekday', config, formatTimeString)} />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Plans over time

/** "Next break: 30 Nov to 6 Dec, then it starts again." (null without days off). */
export function cycleBreakSentence(
  config: ScheduleConfigMap['cycle'],
  now = new Date()
): string | null {
  const next = nextCycleBreak(config, now);
  if (!next) return null;
  return next.ongoing
    ? ts('cycleOnBreak', { end: dayMonth(next.end, now) })
    : ts('cycleNextBreak', { start: dayMonth(next.start, now), end: dayMonth(next.end, now) });
}

/**
 * The first 28 days from the cycle start: legend on top, weekday initials as column headers
 * (starting on the start date's weekday), a 4×7 grid (`done` fill = take, dashed = break) and the
 * next break in words.
 */
export function CyclePreview({ config }: { config: ScheduleConfigMap['cycle'] }) {
  const { colors } = useTheme();
  const { formatTimeString } = useTimeFormat();
  const pattern = cyclePattern(config, 28);
  if (!pattern.length) return null;
  const start = startOfDay(new Date(config.cycleStartDate));
  const validStart = !Number.isNaN(start.getTime());
  const weeks = [0, 1, 2, 3].map((w) => pattern.slice(w * 7, w * 7 + 7));
  const breakLine = cycleBreakSentence(config);
  const cell = { flex: 1, maxWidth: 40 } as const;
  const swatch = (take: boolean, size?: number) => ({
    ...(size ? { width: size, height: size } : { ...cell, aspectRatio: 1 }),
    borderRadius: 8,
    backgroundColor: take ? colors.done : 'transparent',
    borderWidth: 2,
    borderStyle: take ? ('solid' as const) : ('dashed' as const),
    borderColor: take ? 'transparent' : colors.line2,
  });
  return (
    <Card
      accessible
      accessibilityLabel={[
        `${tw('cyclePreview')}: ${describeSchedule('cycle', config, formatTimeString)}`,
        breakLine,
      ]
        .filter(Boolean)
        .join('. ')}>
      <View style={{ gap: 12 }}>
        <Text variant="subhead" weight="700" tone="secondary">
          {tw('cyclePreview')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={swatch(true, 20)} />
            <Text variant="footnote">{tw('legendTake')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={swatch(false, 20)} />
            <Text variant="footnote">{tw('legendBreak')}</Text>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          {validStart ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {Array.from({ length: 7 }, (_, d) => (
                <View key={d} style={{ ...cell, alignItems: 'center' }}>
                  <Text variant="caption" tone="secondary">
                    {weekdayMini(addDays(start, d).getDay())}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {weeks.map((week, w) => (
            <View key={w} style={{ flexDirection: 'row', gap: 6 }}>
              {week.map((take, d) => (
                <View key={d} style={swatch(take)} />
              ))}
            </View>
          ))}
        </View>
        {breakLine ? <Text variant="body">{breakLine}</Text> : null}
      </View>
    </Card>
  );
}

function CycleEditor({
  config,
  onChange,
  minStartDate,
  picker,
}: {
  config: ScheduleConfigMap['cycle'];
  onChange: (c: ScheduleConfigMap['cycle']) => void;
  minStartDate?: Date;
  picker: TimePicker;
}) {
  const dayUnit = (n: number) => i18n.t('ui.editor.count.dayUnit', { count: n });
  return (
    <View style={{ gap: 12 }}>
      <Stepper
        label={tw('daysOn')}
        value={config.daysOn}
        min={1}
        max={365}
        unit={dayUnit(config.daysOn)}
        onChange={(daysOn) => onChange({ ...config, daysOn })}
      />
      <Stepper
        label={tw('daysOff')}
        value={config.daysOff}
        min={0}
        max={365}
        unit={dayUnit(config.daysOff)}
        onChange={(daysOff) => onChange({ ...config, daysOff })}
      />
      <DateRow
        label={tw('cycleStart')}
        value={config.cycleStartDate}
        minimumDate={minStartDate}
        onChange={(cycleStartDate) => onChange({ ...config, cycleStartDate })}
      />
      <CyclePreview config={config} />
      <TimeCard
        label={tw('time')}
        time={config.time}
        picker={picker}
        onChange={(time) => onChange({ ...config, time })}
      />
    </View>
  );
}

/**
 * "Each day: 08:00, 16:00. Starts again next morning at 08:00." The schedule restarts at the
 * first dose every day (the calculator's rule), so the sentence says so.
 */
export function everyXHoursSummary(times: string[], fmt: (t: string) => string): string {
  if (!times.length) return '';
  const first = times[0];
  // Before 04:00 "next morning" reads oddly; say "the next day".
  const restartKey = timeToMinutes(first) >= 4 * 60 ? 'hoursRestartMorning' : 'hoursRestartDay';
  return `${ts('hoursSummary', { times: times.map(fmt).join(', ') })} ${ts(restartKey, { time: fmt(first) })}`;
}

function EveryXHoursEditor({
  config,
  onChange,
  picker,
}: {
  config: ScheduleConfigMap['every_x_hours'];
  onChange: (c: ScheduleConfigMap['every_x_hours']) => void;
  picker: TimePicker;
}) {
  const { formatTimeString } = useTimeFormat();
  const times = everyXHoursTimes(config);
  return (
    <View style={{ gap: 12 }}>
      <Stepper
        label={ts('everyHours')}
        value={config.intervalHours}
        min={1}
        max={24}
        unit={i18n.t('ui.editor.count.hourUnit', { count: config.intervalHours })}
        onChange={(intervalHours) => onChange({ ...config, intervalHours })}
      />
      <TimeCard
        label={tw('firstDose')}
        time={config.firstDoseTime}
        picker={picker}
        onChange={(firstDoseTime) => onChange({ ...config, firstDoseTime })}
      />
      {times.length ? <SummaryCard text={everyXHoursSummary(times, formatTimeString)} /> : null}
    </View>
  );
}

/** One line per step: "From 9 Nov · 1 pill", …, "Last dose · 22 Nov". */
export function taperingPreviewLines(
  form: MedicineForm,
  now = new Date()
): { label: string; value: string }[] {
  const plan = taperingPlan(form);
  const lines = plan.steps.map((step) => ({
    label: ts('taperFrom', { date: dayMonth(step.date, now) }),
    value: formatDose(step.dose, form.dosageUnit),
  }));
  if (plan.more > 0) lines.push({ label: ts('taperMore', { count: plan.more }), value: '' });
  if (plan.lastDay) lines.push({ label: ts('taperLastDose'), value: dayMonth(plan.lastDay, now) });
  return lines;
}

/** Dated preview of the plan, in a card (see `taperingPreviewLines`). */
function TaperingPreview({ form }: { form: MedicineForm }) {
  const { colors } = useTheme();
  const lines = taperingPreviewLines(form);
  if (!lines.length) return null;
  return (
    <Card
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={lines
        .map((l) => (l.value ? `${l.label}: ${l.value}` : l.label))
        .join('. ')}>
      <View style={{ gap: 4 }}>
        <Text variant="subhead" weight="700" tone="secondary" style={{ marginBottom: 4 }}>
          {tw('yourDoses')}
        </Text>
        {lines.map((l, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              columnGap: 12,
              paddingVertical: 8,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.line2,
            }}>
            <Text variant="body" tone={l.value ? 'primary' : 'secondary'}>
              {l.label}
            </Text>
            {l.value ? (
              <Text variant="headline" tabular>
                {l.value}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </Card>
  );
}

function TaperingEditor({
  config,
  onChange,
  form,
  minStartDate,
  picker,
}: {
  config: ScheduleConfigMap['tapering'];
  onChange: (c: ScheduleConfigMap['tapering']) => void;
  form: MedicineForm;
  minStartDate?: Date;
  picker: TimePicker;
}) {
  const unit = form.dosageUnit;
  const s = doseStep(unit);
  return (
    <View style={{ gap: 12 }}>
      <Stepper
        label={tw('startWith')}
        value={config.startDose}
        min={s.min}
        max={100000}
        step={s.step}
        allowDecimal
        unit={formatUnit(config.startDose, unit)}
        onChange={(startDose) => onChange({ ...config, startDose })}
      />
      <Stepper
        label={tw('lowerBy')}
        value={config.decrementAmount}
        min={s.min}
        max={100000}
        step={s.step}
        allowDecimal
        unit={formatUnit(config.decrementAmount, unit)}
        onChange={(decrementAmount) => onChange({ ...config, decrementAmount })}
      />
      <Stepper
        label={`${tw('lowerEvery')} …`}
        value={config.decrementIntervalDays}
        min={1}
        max={365}
        unit={i18n.t('ui.editor.count.dayUnit', { count: config.decrementIntervalDays })}
        onChange={(decrementIntervalDays) => onChange({ ...config, decrementIntervalDays })}
      />
      <DateRow
        label={tw('startDate')}
        value={config.startDate}
        minimumDate={minStartDate}
        onChange={(startDate) => onChange({ ...config, startDate })}
      />
      <TaperingPreview form={form} />
      <TimeCard
        label={tw('time')}
        time={config.time}
        picker={picker}
        onChange={(time) => onChange({ ...config, time })}
      />
    </View>
  );
}

export function PrnInfoCard() {
  return (
    <Card>
      <View style={{ gap: 6 }}>
        <Text variant="headline">{tw('prnTitle')}</Text>
        <Text variant="body" tone="secondary">
          {tw('prnMessage')}
        </Text>
      </View>
    </Card>
  );
}
