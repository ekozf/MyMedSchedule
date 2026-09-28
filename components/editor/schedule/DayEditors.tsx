/**
 * "When?" editors built around days: every_x_days, specific_weekdays, xth_weekday.
 */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import i18n from '@/lib/i18n';
import { useTimeFormat } from '@/lib/ui/format';
import { Chip, PressableScale, Text, useTheme } from '@/components/ds';
import type { ScheduleConfigMap } from '../form-model';
import {
  describeSchedule,
  occurrenceShort,
  weekdayMini,
  weekdayName,
  weekdayOrder,
  weekdayShort,
} from '../describe';
import { DateField, EditorCard, FieldLabel, LabeledStepper, TimeField } from '../parts';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.when.${key}`, opts);

export function EveryXDaysEditor({
  config,
  onChange,
  minStartDate,
}: {
  config: ScheduleConfigMap['every_x_days'];
  onChange: (c: ScheduleConfigMap['every_x_days']) => void;
  minStartDate?: Date;
}) {
  return (
    <EditorCard>
      <LabeledStepper
        label={t('every')}
        value={config.intervalDays}
        min={1}
        max={365}
        unit={i18n.t('ui.editor.count.dayUnit', { count: config.intervalDays })}
        onChange={(intervalDays) => onChange({ ...config, intervalDays })}
      />
      <DateField
        label={t('startDate')}
        value={config.startDate}
        minimumDate={minStartDate}
        onChange={(startDate) => onChange({ ...config, startDate })}
      />
      <TimeField
        label={t('time')}
        value={config.time}
        onChange={(time) => onChange({ ...config, time })}
      />
    </EditorCard>
  );
}

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && a.every((d) => b.includes(d));

/** Seven round day toggles in the locale's week order. */
export function WeekdayToggles({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
      {weekdayOrder().map((d) => {
        const selected = value.includes(d);
        return (
          <PressableScale
            key={d}
            haptic="tap"
            hitSlop={{ top: 6, bottom: 6 }}
            accessibilityRole="checkbox"
            accessibilityLabel={weekdayName(d)}
            accessibilityState={{ checked: selected }}
            onPress={() =>
              onChange(
                selected ? value.filter((x) => x !== d) : [...value, d].sort((a, b) => a - b)
              )
            }
            style={{
              flex: 1,
              maxWidth: 52,
              aspectRatio: 1,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.accent : colors.surface,
              borderWidth: selected ? 0 : StyleSheet.hairlineWidth * 2,
              borderColor: colors.stroke,
            }}>
            <Text
              variant="headline"
              color={selected ? colors.onAccent : colors.ink}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {weekdayMini(d)}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function SpecificWeekdaysEditor({
  config,
  onChange,
}: {
  config: ScheduleConfigMap['specific_weekdays'];
  onChange: (c: ScheduleConfigMap['specific_weekdays']) => void;
}) {
  const days = config.weekdays;
  const quick: { label: string; days: number[] }[] = [
    { label: t('quickWeekdays'), days: WEEKDAYS },
    { label: t('quickWeekends'), days: WEEKENDS },
    { label: t('quickEveryDay'), days: ALL_DAYS },
  ];
  return (
    <View style={{ gap: 12 }}>
      <EditorCard>
        <FieldLabel>{t('whichDays')}</FieldLabel>
        <WeekdayToggles value={days} onChange={(weekdays) => onChange({ ...config, weekdays })} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {quick.map((q) => (
            <Chip
              key={q.label}
              label={q.label}
              selected={sameSet(days, q.days)}
              check
              onPress={() => onChange({ ...config, weekdays: [...q.days] })}
            />
          ))}
        </View>
        {days.length ? (
          <Text variant="subhead" tone="secondary">
            {days
              .slice()
              .sort((a, b) => weekdayOrder().indexOf(a) - weekdayOrder().indexOf(b))
              .map((d) => weekdayShort(d))
              .join(' · ')}
          </Text>
        ) : null}
      </EditorCard>
      <EditorCard>
        <TimeField
          label={t('time')}
          value={config.time}
          onChange={(time) => onChange({ ...config, time })}
        />
      </EditorCard>
    </View>
  );
}

export function XthWeekdayEditor({
  config,
  onChange,
}: {
  config: ScheduleConfigMap['xth_weekday'];
  onChange: (c: ScheduleConfigMap['xth_weekday']) => void;
}) {
  const { formatTimeString } = useTimeFormat();
  return (
    <View style={{ gap: 12 }}>
      <EditorCard>
        <Text variant="title3" accessibilityLiveRegion="polite">
          {describeSchedule('xth_weekday', config, formatTimeString)}
        </Text>
      </EditorCard>
      <EditorCard>
        <FieldLabel>{t('whichOne')}</FieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Chip
              key={n}
              size="lg"
              label={occurrenceShort(n)}
              selected={config.occurrence === n}
              onPress={() => onChange({ ...config, occurrence: n })}
            />
          ))}
        </View>
        <FieldLabel>{t('whichDay')}</FieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {weekdayOrder().map((d) => (
            <Chip
              key={d}
              size="lg"
              label={weekdayShort(d)}
              accessibilityLabel={weekdayName(d)}
              selected={config.weekday === d}
              onPress={() => onChange({ ...config, weekday: d })}
            />
          ))}
        </View>
        <TimeField
          label={t('time')}
          value={config.time}
          onChange={(time) => onChange({ ...config, time })}
        />
      </EditorCard>
    </View>
  );
}
