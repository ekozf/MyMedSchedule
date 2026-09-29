/**
 * Section editors shared by the guided add flow (`variant="guided"`: big question header) and the
 * edit page (`variant="inline"`: no header, the page shows section titles).
 *
 * @example
 * <NameStep form={form} update={update} variant="guided" onSubmit={next} />
 * <ScheduleDetailsStep form={form} update={update} minStartDate={startOfDay(new Date())} />
 */
import * as React from 'react';
import { View, type TextInput } from 'react-native';
import i18n from '@/lib/i18n';
import { formatDose, formatUnit } from '@/lib/ui/format';
import type { ScheduleType } from '@/types';
import { Chip, Stepper, Text, TextField } from '@/components/ds';
import {
  DOSAGE_UNITS,
  NAME_MAX,
  doseStep,
  normalizeConfig,
  type MedicineForm,
  type ScheduleConfigMap,
  type StepIssue,
} from './form-model';
import type { MedicineFormUpdater } from './useMedicineForm';
import { EditorCard, FieldLabel, IssueHint, StepHeader } from './parts';
import { PhotoPicker } from './PhotoPicker';
import { ScheduleTypeCards } from './ScheduleTypeCards';
import { EveryXHoursEditor, MultipleDailyEditor, OnceDailyEditor } from './schedule/TimeEditors';
import { EveryXDaysEditor, SpecificWeekdaysEditor, XthWeekdayEditor } from './schedule/DayEditors';
import { CycleEditor, PrnInfoCard, TaperingEditor } from './schedule/PlanEditors';

export interface StepProps {
  form: MedicineForm;
  update: MedicineFormUpdater;
  /** 'guided' shows the question header (add flow). Default 'guided'. */
  variant?: 'guided' | 'inline';
}

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.${key}`, opts);

// ---------------------------------------------------------------------------------------------

export function NameStep({
  form,
  update,
  variant = 'guided',
  onSubmit,
  autoFocus,
  issue,
}: StepProps & { onSubmit?: () => void; autoFocus?: boolean; issue?: StepIssue | null }) {
  const inputRef = React.useRef<TextInput>(null);
  const guided = variant === 'guided';
  const field = (
    <TextField
      ref={inputRef}
      size={guided ? 'lg' : 'md'}
      label={guided ? undefined : t('name.label')}
      accessibilityLabel={t('name.label')}
      value={form.name}
      onChangeText={(name) => update.set({ name })}
      placeholder={t('name.placeholder')}
      autoFocus={autoFocus}
      autoCapitalize="words"
      autoCorrect={false}
      maxLength={NAME_MAX}
      returnKeyType={onSubmit ? 'next' : 'done'}
      onSubmitEditing={onSubmit}
      submitBehavior={onSubmit ? 'submit' : 'blurAndSubmit'}
    />
  );

  if (!guided) {
    return (
      <EditorCard>
        <View style={{ alignItems: 'center' }}>
          <PhotoPicker
            uri={form.imageUri}
            name={form.name}
            size={96}
            onChange={(imageUri) => update.set({ imageUri })}
          />
        </View>
        {field}
        <IssueHint issue={issue} />
      </EditorCard>
    );
  }

  return (
    <View>
      <StepHeader title={t('name.title')} helper={t('name.helper')} />
      {field}
      <View style={{ marginTop: 32 }}>
        <PhotoPicker
          uri={form.imageUri}
          name={form.name}
          onChange={(imageUri) => update.set({ imageUri })}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

export function DoseStep({ form, update, variant = 'guided' }: StepProps) {
  const s = doseStep(form.dosageUnit);
  const amount = form.dosageAmount;
  return (
    <View style={{ gap: 16 }}>
      {variant === 'guided' ? (
        <StepHeader title={t('dose.title')} helper={t('dose.helper')} />
      ) : null}
      <EditorCard>
        <Stepper
          value={amount}
          onChange={(dosageAmount) => update.set({ dosageAmount })}
          min={s.min}
          max={100000}
          step={s.step}
          allowDecimal
          unit={formatUnit(amount, form.dosageUnit)}
          accessibilityLabel={t('dose.amountLabel')}
        />
        <FieldLabel>{t('dose.unitLabel')}</FieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DOSAGE_UNITS.map((unit) => (
            <Chip
              key={unit}
              label={i18n.t(`ui.common.unitNames.${unit}`)}
              selected={form.dosageUnit === unit}
              check
              onPress={() => update.set({ dosageUnit: unit })}
            />
          ))}
        </View>
      </EditorCard>
      {amount > 0 ? (
        <Text
          variant="title3"
          align="center"
          tone="accent"
          accessibilityLiveRegion="polite"
          style={{ marginTop: 4 }}>
          {t('dose.sentence', { dose: formatDose(amount, form.dosageUnit) })}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

export function ScheduleTypeStep({
  form,
  onSelect,
}: {
  form: MedicineForm;
  onSelect: (type: ScheduleType) => void;
}) {
  return (
    <View>
      <StepHeader title={t('type.title')} helper={t('type.helper')} />
      <ScheduleTypeCards value={form.scheduleType} onSelect={onSelect} />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

export function ScheduleDetailsStep({
  form,
  update,
  variant = 'guided',
  minStartDate,
  issue,
}: StepProps & {
  /** Earliest selectable start date (add: today). */
  minStartDate?: Date;
  issue?: StepIssue | null;
}) {
  const { scheduleType: type, scheduleConfig: config } = form;

  // Editors always work on a complete config: fill in anything missing (legacy data) on mount.
  React.useEffect(() => {
    const normalized = normalizeConfig(type, config, { dosageAmount: form.dosageAmount });
    if (JSON.stringify(normalized) !== JSON.stringify(config)) update.setConfig(normalized);
    // Only when the type changes / on mount; later edits come from the editors themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const editor = renderEditor(type, form, update, minStartDate);

  return (
    <View style={{ gap: 12 }}>
      {variant === 'guided' ? (
        <StepHeader
          title={t('when.title')}
          helper={type === 'prn' ? undefined : t('when.helper')}
        />
      ) : null}
      {editor}
      <IssueHint issue={issue} />
    </View>
  );
}

function renderEditor(
  type: ScheduleType,
  form: MedicineForm,
  update: MedicineFormUpdater,
  minStartDate?: Date
): React.ReactNode {
  const config = form.scheduleConfig as unknown;
  const set = (c: unknown) => update.setConfig(c as MedicineForm['scheduleConfig']);
  switch (type) {
    case 'once_daily':
      return <OnceDailyEditor config={config as ScheduleConfigMap['once_daily']} onChange={set} />;
    case 'multiple_daily':
      return (
        <MultipleDailyEditor
          config={config as ScheduleConfigMap['multiple_daily']}
          onChange={set}
          dosageAmount={form.dosageAmount}
          dosageUnit={form.dosageUnit}
        />
      );
    case 'every_x_days':
      return (
        <EveryXDaysEditor
          config={config as ScheduleConfigMap['every_x_days']}
          onChange={set}
          minStartDate={minStartDate}
        />
      );
    case 'specific_weekdays':
      return (
        <SpecificWeekdaysEditor
          config={config as ScheduleConfigMap['specific_weekdays']}
          onChange={set}
        />
      );
    case 'xth_weekday':
      return (
        <XthWeekdayEditor config={config as ScheduleConfigMap['xth_weekday']} onChange={set} />
      );
    case 'cycle':
      return (
        <CycleEditor
          config={config as ScheduleConfigMap['cycle']}
          onChange={set}
          minStartDate={minStartDate}
        />
      );
    case 'every_x_hours':
      return (
        <EveryXHoursEditor config={config as ScheduleConfigMap['every_x_hours']} onChange={set} />
      );
    case 'tapering':
      return (
        <TaperingEditor
          config={config as ScheduleConfigMap['tapering']}
          onChange={set}
          dosageUnit={form.dosageUnit}
          minStartDate={minStartDate}
        />
      );
    case 'prn':
      return <PrnInfoCard />;
  }
}
