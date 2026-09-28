/**
 * "When?" editors built around times of day: once_daily, multiple_daily, every_x_hours.
 * Every change builds the next config from the current props (never from stale local state).
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { Plus, X } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { formatUnit, useTimeFormat } from '@/lib/ui/format';
import type { DosageUnit } from '@/types';
import { Button, Chip, Divider, IconButton, Stepper, Text } from '@/components/ds';
import {
  MAX_DAILY_TIMES,
  doseStep,
  everyXHoursTimes,
  nextFreeTime,
  sortTimes,
  type ScheduleConfigMap,
} from '../form-model';
import { EditorCard, FieldLabel, LabeledStepper, TimeField } from '../parts';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.when.${key}`, opts);

export function OnceDailyEditor({
  config,
  onChange,
}: {
  config: ScheduleConfigMap['once_daily'];
  onChange: (c: ScheduleConfigMap['once_daily']) => void;
}) {
  return (
    <EditorCard>
      <TimeField label={t('time')} value={config.time} onChange={(time) => onChange({ time })} />
    </EditorCard>
  );
}

export function MultipleDailyEditor({
  config,
  onChange,
  dosageAmount,
  dosageUnit,
}: {
  config: ScheduleConfigMap['multiple_daily'];
  onChange: (c: ScheduleConfigMap['multiple_daily']) => void;
  dosageAmount: number;
  dosageUnit: DosageUnit;
}) {
  const reduceMotion = useReducedMotion();
  const { formatTimeString } = useTimeFormat();
  const times = config.times;
  const full = times.length >= MAX_DAILY_TIMES;

  const replace = (index: number, next: ScheduleConfigMap['multiple_daily']['times'][number]) =>
    onChange({ times: sortTimes(times.map((x, i) => (i === index ? next : x))) });

  return (
    <View style={{ gap: 12 }}>
      <EditorCard>
        {times.map((entry, i) => {
          const hasAmount = entry.dosageAmount !== undefined;
          const amount = entry.dosageAmount ?? dosageAmount;
          const s = doseStep(dosageUnit);
          return (
            <Animated.View
              key={`${entry.time}-${i}`}
              layout={reduceMotion ? undefined : LinearTransition.duration(220)}
              entering={reduceMotion ? undefined : FadeIn.duration(200)}
              style={{ gap: 8 }}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <TimeField
                    label={times.length > 1 ? `${t('time')} ${i + 1}` : t('time')}
                    value={entry.time}
                    onChange={(time) => replace(i, { ...entry, time })}
                  />
                </View>
                {times.length > 1 ? (
                  <IconButton
                    icon={X}
                    variant="tinted"
                    tone="danger"
                    accessibilityLabel={t('removeTime', { time: formatTimeString(entry.time) })}
                    onPress={() => onChange({ times: times.filter((_, j) => j !== i) })}
                    style={{ marginBottom: 6 }}
                  />
                ) : null}
              </View>
              {hasAmount ? (
                <View style={{ gap: 4 }}>
                  <FieldLabel>{t('amountAt', { time: formatTimeString(entry.time) })}</FieldLabel>
                  <Stepper
                    value={amount}
                    onChange={(n) => replace(i, { ...entry, dosageAmount: n })}
                    min={s.min}
                    step={s.step}
                    max={100000}
                    allowDecimal
                    unit={formatUnit(amount, dosageUnit)}
                    accessibilityLabel={t('amountAt', { time: formatTimeString(entry.time) })}
                  />
                  <Button
                    variant="plain"
                    size="sm"
                    label={t('usualAmount')}
                    onPress={() => replace(i, { time: entry.time })}
                  />
                </View>
              ) : (
                <Button
                  variant="plain"
                  size="sm"
                  label={t('differentAmount')}
                  onPress={() => replace(i, { ...entry, dosageAmount })}
                />
              )}
            </Animated.View>
          );
        })}
      </EditorCard>
      <Button
        variant="secondary"
        icon={Plus}
        label={t('addTime')}
        fullWidth
        disabled={full}
        onPress={() => onChange({ times: sortTimes([...times, { time: nextFreeTime(times) }]) })}
      />
      {full ? (
        <Text variant="footnote" tone="secondary" align="center">
          {t('maxTimes')}
        </Text>
      ) : null}
    </View>
  );
}

export function EveryXHoursEditor({
  config,
  onChange,
}: {
  config: ScheduleConfigMap['every_x_hours'];
  onChange: (c: ScheduleConfigMap['every_x_hours']) => void;
}) {
  const { formatTimeString } = useTimeFormat();
  const preview = everyXHoursTimes(config);
  return (
    <View style={{ gap: 12 }}>
      <EditorCard>
        <LabeledStepper
          label={t('every')}
          value={config.intervalHours}
          min={1}
          max={24}
          unit={i18n.t('ui.editor.count.hourUnit', { count: config.intervalHours })}
          onChange={(intervalHours) => onChange({ ...config, intervalHours })}
        />
        <TimeField
          label={t('firstDose')}
          value={config.firstDoseTime}
          onChange={(firstDoseTime) => onChange({ ...config, firstDoseTime })}
        />
      </EditorCard>
      {preview.length ? (
        <EditorCard>
          <FieldLabel>{t('eachDayAt')}</FieldLabel>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            accessible
            accessibilityLabel={`${t('eachDayAt')} ${preview.map(formatTimeString).join(', ')}`}>
            {preview.map((time) => (
              <Chip key={time} label={formatTimeString(time)} selected />
            ))}
          </View>
          <Text variant="footnote" tone="secondary">
            {t('hoursNote')}
          </Text>
        </EditorCard>
      ) : null}
    </View>
  );
}
