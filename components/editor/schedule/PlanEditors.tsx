/**
 * "When?" editors for plans over time: cycle (on/off days), tapering (lowering dose) and the
 * as-needed explanation card.
 */
import * as React from 'react';
import { View } from 'react-native';
import { Check, HandHelping } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { formatNumber, formatUnit, useTimeFormat } from '@/lib/ui/format';
import type { DosageUnit } from '@/types';
import { Card, Icon, Text, useTheme } from '@/components/ds';
import { cyclePattern, doseStep, taperingSteps, type ScheduleConfigMap } from '../form-model';
import { describeSchedule } from '../describe';
import { DateField, EditorCard, FieldLabel, LabeledStepper, TimeField } from '../parts';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.when.${key}`, opts);

/** 4×7 grid of the first 28 days: filled check = take, hollow = break. */
export function CyclePreview({ config }: { config: ScheduleConfigMap['cycle'] }) {
  const { colors } = useTheme();
  const { formatTimeString } = useTimeFormat();
  const pattern = cyclePattern(config, 28);
  if (!pattern.length) return null;
  const weeks = [0, 1, 2, 3].map((w) => pattern.slice(w * 7, w * 7 + 7));
  const cell = (take: boolean, key: React.Key) => (
    <View
      key={key}
      style={{
        flex: 1,
        maxWidth: 36,
        aspectRatio: 1,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: take ? colors.accent : 'transparent',
        borderWidth: take ? 0 : 1.5,
        borderColor: colors.separator,
        borderStyle: take ? 'solid' : 'dashed',
      }}>
      {take ? <Icon as={Check} size={14} color={colors.onAccent} strokeWidth={3} /> : null}
    </View>
  );
  return (
    <View
      style={{ gap: 6 }}
      accessible
      accessibilityLabel={`${t('cyclePreview')}: ${describeSchedule('cycle', config, formatTimeString)}`}>
      {weeks.map((week, w) => (
        <View key={w} style={{ flexDirection: 'row', gap: 6 }}>
          {week.map((take, d) => cell(take, d))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: colors.accent }}
          />
          <Text variant="footnote" tone="secondary">
            {t('legendTake')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 5,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: colors.separator,
            }}
          />
          <Text variant="footnote" tone="secondary">
            {t('legendBreak')}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function CycleEditor({
  config,
  onChange,
  minStartDate,
}: {
  config: ScheduleConfigMap['cycle'];
  onChange: (c: ScheduleConfigMap['cycle']) => void;
  minStartDate?: Date;
}) {
  const dayUnit = (n: number) => i18n.t('ui.editor.count.dayUnit', { count: n });
  return (
    <View style={{ gap: 12 }}>
      <EditorCard>
        <LabeledStepper
          label={t('daysOn')}
          value={config.daysOn}
          min={1}
          max={365}
          unit={dayUnit(config.daysOn)}
          onChange={(daysOn) => onChange({ ...config, daysOn })}
        />
        <LabeledStepper
          label={t('daysOff')}
          value={config.daysOff}
          min={0}
          max={365}
          unit={dayUnit(config.daysOff)}
          onChange={(daysOff) => onChange({ ...config, daysOff })}
        />
      </EditorCard>
      <EditorCard>
        <FieldLabel>{t('cyclePreview')}</FieldLabel>
        <CyclePreview config={config} />
      </EditorCard>
      <EditorCard>
        <DateField
          label={t('cycleStart')}
          value={config.cycleStartDate}
          minimumDate={minStartDate}
          onChange={(cycleStartDate) => onChange({ ...config, cycleStartDate })}
        />
        <TimeField
          label={t('time')}
          value={config.time}
          onChange={(time) => onChange({ ...config, time })}
        />
      </EditorCard>
    </View>
  );
}

/** "4 → 3 → 2 → 1 pills". */
export function taperingPreviewText(
  config: ScheduleConfigMap['tapering'],
  unit: DosageUnit
): string {
  const { doses, more } = taperingSteps(config);
  if (!doses.length) return '';
  const last = doses[doses.length - 1];
  return `${doses.map(formatNumber).join(' → ')}${more ? ' → …' : ''} ${formatUnit(last, unit)}`;
}

export function TaperingEditor({
  config,
  onChange,
  dosageUnit,
  minStartDate,
}: {
  config: ScheduleConfigMap['tapering'];
  onChange: (c: ScheduleConfigMap['tapering']) => void;
  dosageUnit: DosageUnit;
  minStartDate?: Date;
}) {
  const s = doseStep(dosageUnit);
  const preview = taperingPreviewText(config, dosageUnit);
  return (
    <View style={{ gap: 12 }}>
      <EditorCard>
        <LabeledStepper
          label={t('startWith')}
          value={config.startDose}
          min={s.min}
          max={100000}
          step={s.step}
          allowDecimal
          unit={formatUnit(config.startDose, dosageUnit)}
          onChange={(startDose) => onChange({ ...config, startDose })}
        />
        <LabeledStepper
          label={t('lowerBy')}
          value={config.decrementAmount}
          min={s.min}
          max={100000}
          step={s.step}
          allowDecimal
          unit={formatUnit(config.decrementAmount, dosageUnit)}
          onChange={(decrementAmount) => onChange({ ...config, decrementAmount })}
        />
        <LabeledStepper
          label={t('lowerEvery')}
          value={config.decrementIntervalDays}
          min={1}
          max={365}
          unit={i18n.t('ui.editor.count.dayUnit', { count: config.decrementIntervalDays })}
          onChange={(decrementIntervalDays) => onChange({ ...config, decrementIntervalDays })}
        />
      </EditorCard>
      {preview ? (
        <EditorCard>
          <FieldLabel>{t('yourDoses')}</FieldLabel>
          <Text variant="title3" tabular accessibilityLiveRegion="polite">
            {preview}
          </Text>
        </EditorCard>
      ) : null}
      <EditorCard>
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
    </View>
  );
}

export function PrnInfoCard() {
  return (
    <Card tone="accent">
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <Icon as={HandHelping} size={26} tone="accent" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="headline">{t('prnTitle')}</Text>
          <Text variant="subhead" tone="secondary">
            {t('prnMessage')}
          </Text>
        </View>
      </View>
    </Card>
  );
}
