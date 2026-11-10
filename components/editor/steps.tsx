/**
 * Controls of add-medicine steps 1 to 3 (docs/DESIGN.md §5.4), shared by the guided flow and the
 * edit pages (both wrap them in `StepScreen` with the question).
 *
 * @example
 * <NameSection form={form} update={update} autoFocus onSubmit={next} />
 * <DoseSection form={form} update={update} />
 * <ScheduleSection form={form} update={update} minStartDate={today} />
 */
import * as React from 'react';
import { View, type TextInput } from 'react-native';
import i18n from '@/lib/i18n';
import { formatDose, formatUnit } from '@/lib/ui/format';
import type { DosageUnit, ScheduleType } from '@/types';
import {
  Button,
  Chip,
  ChipRow,
  ListGroup,
  ListRow,
  OptionRow,
  Stepper,
  TextField,
} from '@/components/ds';
import {
  COMMON_CHOICES,
  COMMON_UNITS,
  OTHER_CHOICES,
  OTHER_UNITS,
  NAME_MAX,
  STRENGTH_MAX,
  choiceFor,
  doseStep,
  typeForChoice,
  type ScheduleChoice,
  type MedicineForm,
  type StepIssue,
} from './form-model';
import type { MedicineFormUpdater } from './useMedicineForm';
import { FieldLabel, IssueHint, SummaryCard } from './parts';
import { PhotoRow } from './PhotoPicker';
import { WhenEditor } from './schedule/ScheduleEditors';

export interface SectionProps {
  form: MedicineForm;
  update: MedicineFormUpdater;
}

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.${key}`, opts);

/** Step 1: name field, the optional strength field ("500 mg") and the photo row. */
export function NameSection({
  form,
  update,
  onSubmit,
  autoFocus,
  issue,
  showLabel = false,
}: SectionProps & {
  onSubmit?: () => void;
  autoFocus?: boolean;
  issue?: StepIssue | null;
  /** Show "Medicine name" above the field (edit page). */
  showLabel?: boolean;
}) {
  const inputRef = React.useRef<TextInput>(null);
  const strengthRef = React.useRef<TextInput>(null);
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 8 }}>
        <TextField
          ref={inputRef}
          label={showLabel ? t('name.label') : undefined}
          accessibilityLabel={t('name.label')}
          value={form.name}
          onChangeText={(name) => update.set({ name })}
          placeholder={t('name.placeholder')}
          autoFocus={autoFocus}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={NAME_MAX}
          returnKeyType="next"
          onSubmitEditing={() => strengthRef.current?.focus()}
          submitBehavior="submit"
        />
        <IssueHint issue={issue === 'strengthTooLong' ? null : issue} />
      </View>
      <View style={{ gap: 8 }}>
        <TextField
          ref={strengthRef}
          label={t('name.strengthLabel')}
          value={form.strength}
          onChangeText={(strength) => update.set({ strength })}
          placeholder={t('name.strengthPlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={STRENGTH_MAX}
          returnKeyType={onSubmit ? 'next' : 'done'}
          onSubmitEditing={onSubmit}
          submitBehavior={onSubmit ? 'submit' : 'blurAndSubmit'}
        />
        <IssueHint issue={issue === 'strengthTooLong' ? issue : null} />
      </View>
      <PhotoRow uri={form.imageUri} onChange={(imageUri) => update.set({ imageUri })} />
    </View>
  );
}

/**
 * Step 2: amount stepper, unit chips and "1 pill each time". With `collapseUnit` (edit page) the
 * rarely changed unit shows as a row "Measured in · Pills ›" that opens the chips in place, and the
 * "1 pill each time" sentence is left out (it only repeats the stepper).
 */
export function DoseSection({
  form,
  update,
  collapseUnit = false,
}: SectionProps & { collapseUnit?: boolean }) {
  const s = doseStep(form.dosageUnit);
  const amount = form.dosageAmount;
  const [unitOpen, setUnitOpen] = React.useState(false);
  const unitName = i18n.t(`ui.common.unitNames.${form.dosageUnit}`);
  const chips = (
    <UnitChips
      value={form.dosageUnit}
      onChange={(dosageUnit) => {
        update.set({ dosageUnit });
        if (collapseUnit) setUnitOpen(false);
      }}
    />
  );
  return (
    <View style={{ gap: 20 }}>
      <Stepper
        value={amount}
        onChange={(dosageAmount) => update.set({ dosageAmount })}
        min={s.min}
        max={100000}
        step={s.step}
        allowDecimal
        editable
        unit={formatUnit(amount, form.dosageUnit)}
        accessibilityLabel={t('dose.amountLabel')}
      />
      {collapseUnit ? (
        <View style={{ gap: 12 }}>
          <ListGroup>
            <ListRow
              title={t('dose.unitLabel')}
              value={unitName}
              accessory={unitOpen ? 'none' : 'chevron'}
              accessibilityLabel={`${t('dose.unitLabel')}, ${unitName}`}
              accessibilityHint={unitOpen ? undefined : t('dose.unitHint')}
              onPress={() => setUnitOpen((o) => !o)}
            />
          </ListGroup>
          {unitOpen ? chips : null}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <FieldLabel>{t('dose.unitLabel')}</FieldLabel>
          {chips}
        </View>
      )}
      {/* The edit page shows the stepper and unit together already; no echo sentence. */}
      {amount > 0 && !collapseUnit ? (
        <SummaryCard
          emphasis
          text={t('dose.sentence', { dose: formatDose(amount, form.dosageUnit) })}
        />
      ) : null}
    </View>
  );
}

/**
 * "Measured in" chips: the four common units (Pills, Millilitres, Puffs, Drops) and "More…", which
 * shows the other four in place. Starts open when the current unit is one of those. Laid out three
 * per row (3 + 2, or 3 + 3 + 2 when open) so "More…" never sits alone on a line.
 */
const UNIT_CHIP_STYLE = { width: '31%', paddingHorizontal: 8 } as const;

export function UnitChips({
  value,
  onChange,
}: {
  value: DosageUnit;
  onChange: (unit: DosageUnit) => void;
}) {
  const [more, setMore] = React.useState(() => !COMMON_UNITS.includes(value));
  const units = more ? [...COMMON_UNITS, ...OTHER_UNITS] : COMMON_UNITS;
  return (
    <View accessibilityRole="radiogroup">
      <ChipRow>
        {units.map((unit) => (
          <Chip
            key={unit}
            label={i18n.t(`ui.common.unitNames.${unit}`)}
            selected={value === unit}
            accessibilityRole="radio"
            style={UNIT_CHIP_STYLE}
            onPress={() => {
              if (value !== unit) onChange(unit);
            }}
          />
        ))}
        {more ? null : (
          <Chip
            label={t('dose.moreUnits')}
            accessibilityLabel={t('dose.moreUnitsA11y')}
            style={UNIT_CHIP_STYLE}
            onPress={() => setMore(true)}
          />
        )}
      </ChipRow>
    </View>
  );
}

/**
 * Schedule choice, frequency first: "Every day" (once or more a day: one time card by default,
 * "+ Add another time"), "On certain days of the week" and "Only when needed", then the secondary
 * button "Other schedules" that shows the other five in place (starts open when one of them is
 * chosen). "Every day" stands for both stored daily types. `renderSelected` renders the chosen
 * option's settings directly under its card.
 */
export function TypeSection({
  value,
  onSelect,
  renderSelected,
}: {
  value: ScheduleType;
  onSelect: (type: ScheduleType) => void;
  renderSelected?: (type: ScheduleType) => React.ReactNode;
}) {
  const current = choiceFor(value);
  const [expanded, setExpanded] = React.useState(() => OTHER_CHOICES.includes(current));
  const row = (choice: ScheduleChoice) => {
    const selected = current === choice;
    const extra = selected && renderSelected ? renderSelected(value) : null;
    return (
      <React.Fragment key={choice}>
        <OptionRow
          title={t(`type.${choice}.title`)}
          description={t(`type.${choice}.example`)}
          selected={selected}
          onPress={() => onSelect(typeForChoice(choice, value))}
        />
        {extra ? <View style={{ paddingTop: 10, paddingBottom: 16 }}>{extra}</View> : null}
      </React.Fragment>
    );
  };
  return (
    <View style={{ gap: 10 }}>
      <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
        {COMMON_CHOICES.map(row)}
      </View>
      {expanded ? (
        <View accessibilityRole="radiogroup" style={{ gap: 10, marginTop: 10 }}>
          <FieldLabel>{t('screens.otherSchedules')}</FieldLabel>
          {OTHER_CHOICES.map(row)}
        </View>
      ) : (
        <Button
          variant="secondary"
          label={t('screens.otherSchedules')}
          onPress={() => setExpanded(true)}
          style={{ marginTop: 4 }}
        />
      )}
    </View>
  );
}

/**
 * Step 3 "When do you take it?": the type choice with the chosen type's settings (time cards,
 * days, interval, cycle, lowering…, each ending with its live summary) right under its card.
 * As-needed medicines have nothing more to set.
 */
export function ScheduleSection({
  form,
  update,
  minStartDate,
  issue,
}: SectionProps & { minStartDate: Date; issue?: StepIssue | null }) {
  return (
    <TypeSection
      value={form.scheduleType}
      onSelect={(type) => update.setScheduleType(type)}
      renderSelected={(type) =>
        type === 'prn' ? null : (
          <View style={{ gap: 8 }}>
            <WhenEditor form={form} update={update} minStartDate={minStartDate} />
            <IssueHint issue={issue} />
          </View>
        )
      }
    />
  );
}
