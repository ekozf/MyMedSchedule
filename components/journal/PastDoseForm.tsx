/**
 * "Log a past dose" as a full page (DESIGN.md §5.5): "Forgot to log one?", the medicine (chips,
 * or a "Change medicine" row when there are more than six), the day (Today / Yesterday / Pick a
 * day with a calendar sheet), "When did you take it?" (native picker, default now), what happened
 * (Taken / Partial / Skipped), how much (shown once a medicine is chosen, hidden for Skipped), a
 * note, a summary line above the button ("Metformin · Today 13:48 · Taken · 1 pill") and "Save to
 * Journal" (disabled with "Choose a medicine to continue" until one is chosen). For Skipped the
 * time label reads "When was it due?". With several people the subtitle starts with "For {name}".
 *
 * Scheduled medicines: once the medicine and day are chosen, "Which dose?" lists that day's
 * planned times ("08:00 · taken", "20:00") plus "Another time". A planned time pre-fills the time
 * and saves the entry with that `scheduledTime`, so Today counts it; "Another time" keeps the free
 * time. As-needed medicines and edit mode don't show it. The note placeholder follows the action.
 *
 * Edit mode (`entry`): same page prefilled from an existing entry; the medicine can't change.
 * Presentational: the parent saves in `onSubmit` (safety checks, supply) and navigates.
 *
 * @example
 * <PastDoseForm medications={active} initialMedicationId={id} onSubmit={save} onAddMedicine={add} />
 * <PastDoseForm medications={all} entry={{ log, medication }} onSubmit={saveChange} … />
 */
import * as React from 'react';
import { View } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { medicineDisplayName } from '@/components/medicines/medicine-info';
import {
  Button,
  CalendarSheet,
  ChipGroup,
  DateTimeField,
  EmptyState,
  Icon,
  NavHeader,
  PressableScale,
  Screen,
  SegmentedControl,
  Stepper,
  Text,
  TextField,
  radii,
  useTheme,
} from '@/components/ds';
import {
  formatDayLabel,
  formatDose,
  formatShortDate,
  formatUnit,
  useTimeFormat,
} from '@/lib/ui/format';
import { useCarerName } from '@/components/shell/ProfileChip';
import { getAllDosesForDate } from '@/lib/schedule/calculator';
import type { IntakeAction, IntakeLog, Medication } from '@/types';
import { MedicinePickerSheet } from './MedicinePickerSheet';
import {
  ACTIONS,
  amountStep,
  dayChoiceFor,
  dayForChoice,
  defaultOccurrence,
  doseOccurrences,
  isInFuture,
  partialAmount,
  withTime,
  type DayChoice,
} from './filtering';
import { longDate, statusLabel } from './utils';

/** More medicines than this: a "Change medicine" row instead of chips. */
const MAX_CHIPS = 6;

export interface PastDoseDraft {
  medication: Medication;
  actualTime: Date;
  action: IntakeAction;
  dosageAmount: number;
  notes: string;
  /** The planned dose this entry is for ("Which dose?"), so Today recognises it. */
  scheduledTime?: Date;
}

export interface PastDoseFormProps {
  /** New entry: active medicines. Edit mode: may include the entry's (stopped) medicine. */
  medications: Medication[];
  initialMedicationId?: string;
  /** Edit mode: the entry to change and its medicine. */
  entry?: { log: IntakeLog; medication: Medication };
  /** The person's logs, to show what is already logged in "Which dose?". */
  logs?: IntakeLog[];
  /** Resolve true when saved (the parent then leaves the page). */
  onSubmit: (draft: PastDoseDraft) => Promise<boolean>;
  onAddMedicine: () => void;
  /** Fixed "now" for previews and tests. */
  now?: Date;
}

export function PastDoseForm({
  medications,
  initialMedicationId,
  entry,
  logs,
  onSubmit,
  onAddMedicine,
  now: fixedNow,
}: PastDoseFormProps) {
  const editing = !!entry;
  const person = useCarerName();
  const { formatTime } = useTimeFormat();
  const [startTime] = React.useState(() =>
    entry ? new Date(entry.log.actualTime) : (fixedNow ?? new Date())
  );

  const preselected = React.useMemo(() => {
    if (entry) return entry.medication;
    const byParam = initialMedicationId
      ? medications.find((m) => m.id === initialMedicationId)
      : undefined;
    return byParam ?? (medications.length === 1 ? medications[0] : null);
  }, [entry, medications, initialMedicationId]);

  const [medicationId, setMedicationId] = React.useState<string | null>(preselected?.id ?? null);
  const [choice, setChoice] = React.useState<DayChoice>(() =>
    dayChoiceFor(startTime, fixedNow ?? new Date())
  );
  const [picked, setPicked] = React.useState<Date>(startTime);
  const [time, setTime] = React.useState<Date>(startTime);
  const [action, setAction] = React.useState<IntakeAction>(entry?.log.action ?? 'taken');
  const [amount, setAmount] = React.useState<number>(() => {
    if (entry && entry.log.dosageAmount > 0) return entry.log.dosageAmount;
    return preselected && preselected.dosageAmount > 0 ? preselected.dosageAmount : 1;
  });
  const [notes, setNotes] = React.useState(entry?.log.notes ?? '');
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);

  const medication = medications.find((m) => m.id === medicationId) ?? entry?.medication ?? null;
  const usual = medication && medication.dosageAmount > 0 ? medication.dosageAmount : 1;

  const choose = (m: Medication) => {
    setMedicationId(m.id);
    const dose = m.dosageAmount > 0 ? m.dosageAmount : 1;
    setAmount(action === 'partial' ? partialAmount(dose) : dose);
  };

  // Medicines may arrive after mount (fresh fetch): adopt the preselection once.
  const touched = React.useRef(!!preselected);
  React.useEffect(() => {
    if (!touched.current && preselected) {
      touched.current = true;
      choose(preselected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselected]);

  const changeAction = (next: IntakeAction) => {
    // A partial dose usually is less: start at about half the usual dose.
    if (next === 'partial' && amount === usual) setAmount(partialAmount(usual));
    if (next === 'taken' && action === 'partial') setAmount(usual);
    setAction(next);
  };

  const now = fixedNow ?? new Date();
  const day = dayForChoice(choice, picked, now);

  // "Which dose?": that day's planned times for a scheduled medicine (new entries only).
  const occurrences = React.useMemo(
    () =>
      !editing && medication && !medication.isPrn
        ? doseOccurrences(getAllDosesForDate([medication], day), logs ?? [])
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editing, medication, day.getTime(), logs]
  );
  const [slot, setSlot] = React.useState<string>('other');
  const chooseSlot = (key: string) => {
    setSlot(key);
    const o = occurrences.find((x) => x.key === key);
    if (!o) return;
    // The planned time, or now when that is still ahead (never a time in the future).
    const current = new Date();
    setTime(o.time.getTime() <= current.getTime() ? new Date(o.time) : current);
  };
  // New medicine or day (or the logs arrived): start on the latest open planned dose.
  const slotContext = `${medication?.id ?? ''}|${day.getTime()}|${logs ? 1 : 0}`;
  React.useEffect(() => {
    if (editing) return;
    const key = defaultOccurrence(occurrences, new Date());
    if (key === 'other') setSlot('other');
    else chooseSlot(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotContext]);
  const occurrence = occurrences.find((o) => o.key === slot) ?? null;

  const actualTime = withTime(day, time);
  const future = isInFuture(actualTime, now);
  const missingMedicine = !medication;

  const save = async () => {
    if (saving) return;
    if (!medication || future) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        medication,
        actualTime,
        action,
        dosageAmount: action === 'skipped' ? usual : amount,
        notes: notes.trim(),
        scheduledTime: occurrence ? new Date(occurrence.time) : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const header = <NavHeader backIcon="close" />;

  if (!editing && medications.length === 0) {
    return (
      <Screen header={header}>
        <EmptyState
          title={i18n.t('ui.journal.past.noMeds.title')}
          message={i18n.t('ui.journal.past.noMeds.message')}
          action={{ label: i18n.t('ui.journal.past.noMeds.action'), onPress: onAddMedicine }}
        />
      </Screen>
    );
  }

  const dayOptions: { value: DayChoice; label: string }[] = [
    { value: 'today', label: i18n.t('ui.common.today') },
    { value: 'yesterday', label: i18n.t('ui.common.yesterday') },
    { value: 'pick', label: i18n.t('ui.journal.past.pickDay') },
  ];

  return (
    <Screen
      header={header}
      keyboardAware
      footer={
        <View style={{ gap: 8 }}>
          {medication ? (
            <Text
              variant="callout"
              weight="600"
              tone="secondary"
              align="center"
              tabular
              accessibilityLiveRegion="polite">
              {[
                medicineDisplayName(medication),
                `${dayLabel(actualTime, now)} ${formatTime(actualTime)}`,
                statusLabel(action),
                action !== 'skipped' ? formatDose(amount, medication.dosageUnit) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
          {missingMedicine ? (
            <Text
              variant="callout"
              tone="secondary"
              align="center"
              accessibilityLiveRegion="polite">
              {i18n.t('ui.journal.past.chooseToContinue')}
            </Text>
          ) : null}
          <Button
            label={i18n.t(editing ? 'ui.journal.past.saveChanges' : 'ui.journal.past.save')}
            loading={saving}
            disabled={missingMedicine}
            onPress={save}
          />
        </View>
      }>
      <View style={{ gap: 28, paddingTop: 8, paddingBottom: 16 }}>
        <View style={{ gap: 8 }}>
          <Text variant="title1">
            {i18n.t(editing ? 'ui.journal.past.editTitle' : 'ui.journal.past.title')}
          </Text>
          <Text variant="body" tone="secondary">
            {[
              person ? i18n.t('ui.common.forPerson', { name: person }) : null,
              editing ? medicineDisplayName(entry!.medication) : i18n.t('ui.journal.past.subtitle'),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>

        {!editing ? (
          <Field label={i18n.t('ui.journal.past.medicine')}>
            {medications.length <= MAX_CHIPS ? (
              <ChipGroup
                options={medications.map((m) => ({ value: m.id, label: medicineDisplayName(m) }))}
                value={medicationId}
                onChange={(id) => {
                  const m = medications.find((x) => x.id === id);
                  if (m) choose(m);
                }}
              />
            ) : (
              <FieldRow
                title={
                  medication
                    ? medicineDisplayName(medication)
                    : i18n.t('ui.journal.past.chooseMedicine')
                }
                muted={!medication}
                actionLabel={i18n.t(medication ? 'ui.common.change' : 'ui.journal.past.choose')}
                accessibilityLabel={
                  medication
                    ? i18n.t('ui.journal.past.a11yChangeMedicine', {
                        name: medicineDisplayName(medication),
                      })
                    : i18n.t('ui.journal.past.chooseMedicine')
                }
                onPress={() => setPickerOpen(true)}
              />
            )}
            {showErrors && missingMedicine ? (
              <ErrorText>{i18n.t('ui.journal.past.errorMedicine')}</ErrorText>
            ) : null}
          </Field>
        ) : null}

        <Field label={i18n.t('ui.journal.past.day')}>
          <SegmentedControl
            options={dayOptions}
            value={choice}
            onChange={(next) => {
              if (next === 'pick') setCalendarOpen(true);
              else setChoice(next);
            }}
          />
          {choice === 'pick' ? (
            <FieldRow
              icon
              title={longDate(picked, now)}
              actionLabel={i18n.t('ui.common.change')}
              accessibilityLabel={i18n.t('ui.journal.past.a11yChangeDay', {
                day: longDate(picked, now),
              })}
              onPress={() => setCalendarOpen(true)}
            />
          ) : null}
        </Field>

        {occurrences.length > 0 ? (
          <Field label={i18n.t('ui.journal.past.whichDose')}>
            <ChipGroup
              options={[
                ...occurrences.map((o) => {
                  const label = formatTime(o.time);
                  const status = o.status ? statusLabel(o.status) : null;
                  return {
                    value: o.key,
                    label,
                    detail: status ? status.toLocaleLowerCase(i18n.locale) : undefined,
                    accessibilityLabel: status
                      ? i18n.t('ui.journal.past.slotA11y', { time: label, status })
                      : label,
                  };
                }),
                { value: 'other', label: i18n.t('ui.journal.past.anotherTime') },
              ]}
              value={slot}
              onChange={chooseSlot}
            />
            {occurrence ? (
              <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 4 }}>
                {i18n.t('ui.journal.past.slotHint', { time: formatTime(occurrence.time) })}
              </Text>
            ) : null}
          </Field>
        ) : null}

        <View style={{ gap: 8 }}>
          <DateTimeField
            mode="time"
            label={i18n.t(
              action === 'skipped' ? 'ui.journal.past.dueWhen' : 'ui.journal.past.time'
            )}
            value={time}
            onChange={setTime}
          />
          {future ? <ErrorText>{i18n.t('ui.journal.past.errorFuture')}</ErrorText> : null}
        </View>

        <Field label={i18n.t('ui.journal.entry.whatHappened')}>
          <SegmentedControl
            options={ACTIONS.map((a) => ({ value: a, label: statusLabel(a) }))}
            value={action}
            onChange={changeAction}
          />
        </Field>

        {action !== 'skipped' && medication ? (
          <Stepper
            label={i18n.t('ui.journal.past.howMuch')}
            value={amount}
            onChange={setAmount}
            min={amountStep(usual)}
            step={amountStep(usual)}
            allowDecimal
            unit={formatUnit(amount, medication.dosageUnit)}
            hint={
              amount === usual
                ? i18n.t('ui.journal.past.usualDose')
                : i18n.t('ui.journal.past.usualDoseIs', {
                    dose: formatDose(usual, medication.dosageUnit),
                  })
            }
          />
        ) : null}

        <TextField
          label={i18n.t('ui.journal.past.note')}
          value={notes}
          onChangeText={setNotes}
          placeholder={i18n.t(
            action === 'skipped'
              ? 'ui.journal.past.notePlaceholderSkipped'
              : action === 'partial'
                ? 'ui.journal.past.notePlaceholderPartial'
                : 'ui.journal.past.notePlaceholder'
          )}
          multiline
        />
      </View>

      <CalendarSheet
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        title={i18n.t('ui.journal.past.pickDayTitle')}
        value={choice === 'pick' ? picked : dayForChoice(choice, picked, now)}
        maximumDate={now}
        onChange={(d) => {
          setPicked(d);
          setChoice(dayChoiceFor(d, now));
        }}
      />

      {!editing && medications.length > MAX_CHIPS ? (
        <MedicinePickerSheet
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          title={i18n.t('ui.journal.past.chooseMedicine')}
          medications={medications}
          value={medicationId}
          onChange={(id) => {
            const m = medications.find((x) => x.id === id);
            if (m) choose(m);
          }}
        />
      ) : null}
    </Screen>
  );
}

/** "Today" / "Yesterday" / the weekday within the last week, else a short date. */
function dayLabel(d: Date, now: Date): string {
  const days = Math.round(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000
  );
  return days >= 0 && days < 7 ? formatDayLabel(d, now) : formatShortDate(d, now);
}

function FieldRow({
  title,
  actionLabel,
  accessibilityLabel,
  onPress,
  icon = false,
  muted = false,
}: {
  title: string;
  actionLabel: string;
  accessibilityLabel: string;
  onPress: () => void;
  icon?: boolean;
  muted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        minHeight: 68,
        borderRadius: radii.field,
        backgroundColor: colors.field,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 12,
      }}>
      {icon ? <Icon as={CalendarDays} size={24} tone="secondary" /> : null}
      <Text
        variant={muted ? 'body' : 'headline'}
        tone={muted ? 'secondary' : 'primary'}
        style={{ flex: 1 }}>
        {title}
      </Text>
      <Text variant="callout" weight="700" color={colors.accent}>
        {actionLabel}
      </Text>
    </PressableScale>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        variant="subhead"
        weight="700"
        tone="secondary"
        accessibilityRole="header"
        style={{ paddingHorizontal: 4 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function ErrorText({ children }: { children: string }) {
  return (
    <Text
      variant="callout"
      tone="danger"
      accessibilityLiveRegion="polite"
      style={{ paddingHorizontal: 4 }}>
      {children}
    </Text>
  );
}
