/**
 * Dose sheet (Today): everything you can do with one scheduled dose, in one sheet with in-sheet
 * steps instead of stacked dialogs.
 *
 * - Unlogged: Take now · I took it at 08:00 · Skip · Partial dose (stepper) · Add a note.
 *   Late + taken/partial + "now" with the next dose 0–120 min away → "Your next dose is soon" step
 *   (Keep my schedule / Move next dose → pick a new time).
 * - Logged: result + notes · Change (action / amount / notes) · Undo.
 *
 * Presentational: all persistence goes through the async handlers (see `useDoseActions` for the
 * real implementation); each resolves `true` when saved, and the sheet then closes itself.
 *
 * @example
 * <DoseSheet
 *   visible={open} onClose={close} onDismissed={showPendingToast}
 *   dose={dose} medication={med} log={log}
 *   onLog={…} onRescheduleAndLog={…} onUpdate={…} onUndo={…}
 * />
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  useReducedMotion,
} from 'react-native-reanimated';
import {
  AlarmClock,
  CalendarClock,
  Check,
  Clock,
  Contrast,
  Hourglass,
  NotebookPen,
  PackageOpen,
  Pencil,
  StickyNote,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { isSameDay, startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import {
  Button,
  DateTimeField,
  Icon,
  IconButton,
  MedTile,
  SegmentedControl,
  Sheet,
  Stepper,
  Text,
  TextField,
  haptics,
  statusColors,
  useTheme,
  type StatusTone,
} from '@/components/ds';
import { formatDose, formatShortDate, formatUnit, useTimeFormat } from '@/lib/ui/format';
import { getRunningLowStatus } from '@/lib/medications/refill';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import type { IntakeAction, IntakeLog, Medication } from '@/types';
import {
  LATE_DANGER_MIN,
  computeLateOverlap,
  defaultPartialAmount,
  formatDuration,
  getTiming,
  partialStep,
  suggestRescheduleTime,
  type LateOverlap,
} from './logic';

export type DoseSheetStep = 'main' | 'change' | 'overlap' | 'reschedule';

export interface DoseLogRequest {
  action: IntakeAction;
  amount: number;
  notes?: string;
  /** 'now' → actualTime = now; 'scheduled' → actualTime = the scheduled time. */
  at: 'now' | 'scheduled';
}

export interface DoseUpdateRequest {
  action: IntakeAction;
  amount: number;
  notes?: string;
}

export interface DoseSheetHandlers {
  /** Create a log (runs the safety check for taken/partial). Resolve true when saved. */
  onLog: (req: DoseLogRequest) => Promise<boolean>;
  /** Move the medicine's next dose to `time`, then log this dose now. */
  onRescheduleAndLog: (time: Date, req: Omit<DoseLogRequest, 'at'>) => Promise<boolean>;
  /** Change an existing log. */
  onUpdate: (req: DoseUpdateRequest) => Promise<boolean>;
  /** Remove the existing log (supply restored). */
  onUndo: () => Promise<boolean>;
}

export interface DoseSheetProps extends DoseSheetHandlers {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  dose: ScheduledDose | null;
  medication: Medication | null;
  log: IntakeLog | null;
  /** Open straight at the late-overlap step (used by swipe-to-take). */
  initialStep?: 'main' | 'overlap';
  /** Fixed clock (previews). Default: live clock. */
  now?: Date;
}

type Busy = null | 'now' | 'scheduled' | 'skip' | 'keep' | 'move' | 'save' | 'undo';

function useClock(visible: boolean, fixed?: Date): Date {
  const [now, setNow] = React.useState(() => fixed ?? new Date());
  React.useEffect(() => {
    if (fixed || !visible) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [visible, fixed]);
  return fixed ?? now;
}

export function DoseSheet({
  visible,
  onClose,
  onDismissed,
  dose,
  medication,
  log,
  initialStep = 'main',
  now: fixedNow,
  onLog,
  onRescheduleAndLog,
  onUpdate,
  onUndo,
}: DoseSheetProps) {
  const { formatTime } = useTimeFormat();
  const reduceMotion = useReducedMotion();
  const now = useClock(visible, fixedNow);

  const [step, setStepState] = React.useState<DoseSheetStep>('main');
  const direction = React.useRef<1 | -1>(1);
  const [busy, setBusy] = React.useState<Busy>(null);
  const [partialOn, setPartialOn] = React.useState(false);
  const [partialAmount, setPartialAmount] = React.useState(0.5);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [overlap, setOverlap] = React.useState<LateOverlap | null>(null);
  const [pending, setPending] = React.useState<Omit<DoseLogRequest, 'at'> | null>(null);
  const [moveTo, setMoveTo] = React.useState<Date>(() => new Date());
  const [changeAction, setChangeAction] = React.useState<IntakeAction>('taken');
  const [changeAmount, setChangeAmount] = React.useState(1);
  const [changeNotes, setChangeNotes] = React.useState('');

  const unit = dose?.dosageUnit ?? 'pills';
  const fullAmount = dose?.dosageAmount ?? 1;
  const step05 = partialStep(fullAmount, unit);

  const goTo = (next: DoseSheetStep, dir: 1 | -1 = 1) => {
    direction.current = dir;
    setStepState(next);
  };

  // Reset on open (or when another dose is shown).
  const doseId = dose ? `${dose.medicationId}|${dose.time.toISOString()}` : '';
  React.useEffect(() => {
    if (!visible || !dose) return;
    setBusy(null);
    setPartialOn(false);
    setPartialAmount(defaultPartialAmount(dose.dosageAmount, partialStep(dose.dosageAmount, unit)));
    setNoteOpen(false);
    setNotes('');
    setPending(null);
    direction.current = 1;
    if (initialStep === 'overlap' && !log) {
      const o = computeLateOverlap(medication, dose, new Date(), 'taken');
      if (o) {
        setOverlap(o);
        setPending({ action: 'taken', amount: dose.dosageAmount });
        setStepState('overlap');
        haptics.warning();
        return;
      }
    }
    setOverlap(null);
    setStepState('main');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, doseId]);

  if (!dose) return null;

  const timing = getTiming(dose, now);
  const time = formatTime(dose.time);
  const doseText = formatDose(dose.dosageAmount, dose.dosageUnit);
  const subtitle = isSameDay(dose.time, now)
    ? i18n.t('ui.today.sheet.scheduled', { dose: doseText, time })
    : i18n.t('ui.today.sheet.scheduledOn', {
        dose: doseText,
        date: formatShortDate(dose.time, now),
        time,
      });

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<boolean>) => {
    if (busy) return;
    setBusy(kind);
    let ok = false;
    try {
      ok = await action();
    } finally {
      setBusy(null);
    }
    if (ok) onClose();
  };

  const baseRequest = (): Omit<DoseLogRequest, 'at'> => ({
    action: partialOn ? 'partial' : 'taken',
    amount: partialOn ? partialAmount : dose.dosageAmount,
    notes: notes.trim() || undefined,
  });

  // --- unlogged actions ---------------------------------------------------------------------
  const takeNow = () => {
    if (busy) return;
    const req = baseRequest();
    const o = computeLateOverlap(medication, dose, new Date(), req.action);
    if (o) {
      haptics.warning();
      setOverlap(o);
      setPending(req);
      goTo('overlap');
      return;
    }
    run('now', () => onLog({ ...req, at: 'now' }));
  };
  const takeAtScheduled = () =>
    run('scheduled', () => onLog({ ...baseRequest(), at: 'scheduled' }));
  const skip = () =>
    run('skip', () =>
      onLog({
        action: 'skipped',
        amount: dose.dosageAmount,
        notes: notes.trim() || undefined,
        at: 'now',
      })
    );
  const keepSchedule = () => {
    const req = pending ?? baseRequest();
    run('keep', () => onLog({ ...req, at: 'now' }));
  };
  const startMove = () => {
    if (!overlap) return;
    setMoveTo(suggestRescheduleTime(dose, overlap.nextDoseTime, new Date()));
    goTo('reschedule');
  };
  const confirmMove = () => {
    const req = pending ?? baseRequest();
    run('move', () => onRescheduleAndLog(moveTo, req));
  };

  // --- logged actions -----------------------------------------------------------------------
  const startChange = () => {
    if (!log) return;
    setChangeAction(log.action);
    setChangeAmount(
      log.action === 'partial' ? log.dosageAmount : defaultPartialAmount(fullAmount, step05)
    );
    setChangeNotes(log.notes ?? '');
    goTo('change');
  };
  const saveChange = () =>
    run('save', () =>
      onUpdate({
        action: changeAction,
        amount: changeAction === 'partial' ? changeAmount : dose.dosageAmount,
        notes: changeNotes.trim() || undefined,
      })
    );
  const undo = () => run('undo', onUndo);

  const moveValid = moveTo.getTime() > now.getTime();
  const disabled = busy !== null;

  // --- footer per step ----------------------------------------------------------------------
  let footer: React.ReactNode;
  if (step === 'main' && !log) {
    footer = (
      <>
        <Button
          label={i18n.t(partialOn ? 'ui.today.sheet.logPartialNow' : 'ui.today.sheet.takeNow')}
          variant="success"
          size="lg"
          icon={Check}
          fullWidth
          loading={busy === 'now'}
          disabled={disabled && busy !== 'now'}
          onPress={takeNow}
        />
        <Button
          label={i18n.t(
            partialOn ? 'ui.today.sheet.logPartialAtScheduled' : 'ui.today.sheet.tookAtScheduled',
            { time }
          )}
          variant="secondary"
          size="lg"
          fullWidth
          loading={busy === 'scheduled'}
          disabled={disabled && busy !== 'scheduled'}
          onPress={takeAtScheduled}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            label={i18n.t('ui.today.sheet.skip')}
            variant="secondaryDanger"
            icon={X}
            loading={busy === 'skip'}
            disabled={disabled && busy !== 'skip'}
            onPress={skip}
            style={{ flex: 1 }}
          />
          <Button
            label={i18n.t(partialOn ? 'ui.today.sheet.fullDose' : 'ui.today.sheet.partial')}
            variant="secondary"
            icon={partialOn ? Check : Contrast}
            haptic="tap"
            disabled={disabled}
            onPress={() => setPartialOn((v) => !v)}
            style={{ flex: 1 }}
          />
        </View>
      </>
    );
  } else if (step === 'main' && log) {
    footer = (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          label={i18n.t('ui.today.sheet.change')}
          variant="secondary"
          size="lg"
          icon={Pencil}
          disabled={disabled}
          onPress={startChange}
          style={{ flex: 1 }}
        />
        <Button
          label={i18n.t('ui.today.sheet.undo')}
          variant="secondaryDanger"
          size="lg"
          icon={Undo2}
          loading={busy === 'undo'}
          disabled={disabled && busy !== 'undo'}
          onPress={undo}
          style={{ flex: 1 }}
        />
      </View>
    );
  } else if (step === 'change') {
    footer = (
      <>
        <Button
          label={i18n.t('ui.today.sheet.saveChanges')}
          size="lg"
          fullWidth
          loading={busy === 'save'}
          disabled={disabled && busy !== 'save'}
          onPress={saveChange}
        />
        <Button
          label={i18n.t('ui.today.sheet.back')}
          variant="plain"
          fullWidth
          disabled={disabled}
          onPress={() => goTo('main', -1)}
        />
      </>
    );
  } else if (step === 'overlap') {
    footer = (
      <>
        <Button
          label={i18n.t('ui.today.overlap.keep')}
          variant="success"
          size="lg"
          icon={Check}
          fullWidth
          loading={busy === 'keep'}
          disabled={disabled && busy !== 'keep'}
          onPress={keepSchedule}
        />
        <Button
          label={i18n.t('ui.today.overlap.move')}
          variant="secondary"
          size="lg"
          icon={CalendarClock}
          fullWidth
          disabled={disabled}
          onPress={startMove}
        />
        <Button
          label={i18n.t('ui.today.sheet.back')}
          variant="plain"
          fullWidth
          disabled={disabled}
          onPress={() => goTo('main', -1)}
        />
      </>
    );
  } else {
    footer = (
      <>
        <Button
          label={i18n.t('ui.today.reschedule.confirm')}
          variant="success"
          size="lg"
          icon={Check}
          fullWidth
          loading={busy === 'move'}
          disabled={!moveValid || (disabled && busy !== 'move')}
          onPress={confirmMove}
        />
        <Button
          label={i18n.t('ui.today.sheet.back')}
          variant="plain"
          fullWidth
          disabled={disabled}
          onPress={() => goTo('overlap', -1)}
        />
      </>
    );
  }

  const entering = reduceMotion
    ? FadeIn.duration(150)
    : (direction.current === 1 ? FadeInRight : FadeInLeft).duration(220);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      dismissible={busy === null}
      accessibilityLabel={dose.medicationName}
      footer={footer}>
      <Hero
        name={dose.medicationName}
        imageUri={dose.imageUri}
        subtitle={subtitle}
        onClose={onClose}
        closeDisabled={disabled}
      />
      <Animated.View key={step} entering={entering} style={{ gap: 12 }}>
        {step === 'main' && !log ? (
          <UnloggedBody
            timing={timing}
            medication={medication}
            notes={medication?.notes ?? dose.notes}
            partialOn={partialOn}
            partialAmount={partialAmount}
            onPartialAmount={setPartialAmount}
            partialStepSize={step05}
            unit={unit}
            noteOpen={noteOpen}
            onOpenNote={() => setNoteOpen(true)}
            noteValue={notes}
            onNoteChange={setNotes}
            reduceMotion={reduceMotion}
          />
        ) : null}
        {step === 'main' && log ? (
          <LoggedBody log={log} unit={unit} now={now} notes={medication?.notes ?? dose.notes} />
        ) : null}
        {step === 'change' ? (
          <>
            <Text variant="title3" accessibilityRole="header">
              {i18n.t('ui.today.sheet.changeTitle')}
            </Text>
            <SegmentedControl<IntakeAction>
              size="lg"
              value={changeAction}
              onChange={setChangeAction}
              options={[
                { value: 'taken', label: i18n.t('ui.today.sheet.actionTaken') },
                { value: 'skipped', label: i18n.t('ui.today.sheet.actionSkipped') },
                { value: 'partial', label: i18n.t('ui.today.sheet.actionPartial') },
              ]}
            />
            {changeAction === 'partial' ? (
              <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(200)}>
                <AmountStepper
                  value={changeAmount}
                  onChange={setChangeAmount}
                  step={step05}
                  unit={unit}
                />
              </Animated.View>
            ) : null}
            <TextField
              label={i18n.t('ui.today.sheet.noteLabel')}
              placeholder={i18n.t('ui.today.sheet.notePlaceholder')}
              value={changeNotes}
              onChangeText={setChangeNotes}
              multiline
            />
          </>
        ) : null}
        {step === 'overlap' && overlap ? (
          <OverlapBody name={dose.medicationName} overlap={overlap} now={now} />
        ) : null}
        {step === 'reschedule' ? (
          <>
            <Text variant="title2">{i18n.t('ui.today.reschedule.title')}</Text>
            <Text variant="body" tone="secondary">
              {i18n.t('ui.today.reschedule.message', { name: dose.medicationName })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <DateTimeField
                mode="date"
                label={i18n.t('ui.today.reschedule.date')}
                value={moveTo}
                minimumDate={startOfDay(now)}
                onChange={(d) => {
                  const next = new Date(moveTo);
                  next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                  setMoveTo(next);
                }}
                style={{ flex: 1.3 }}
              />
              <DateTimeField
                mode="time"
                label={i18n.t('ui.today.reschedule.time')}
                value={moveTo}
                onChange={(d) => {
                  const next = new Date(moveTo);
                  next.setHours(d.getHours(), d.getMinutes(), 0, 0);
                  setMoveTo(next);
                }}
                style={{ flex: 1 }}
              />
            </View>
            {moveValid ? (
              <Notice
                tone="accent"
                icon={CalendarClock}
                text={i18n.t('ui.today.reschedule.preview', {
                  when: `${formatShortDate(moveTo, now)}, ${formatTime(moveTo)}`,
                })}
              />
            ) : (
              <Notice
                tone="danger"
                icon={Clock}
                text={i18n.t('ui.today.reschedule.pastError')}
                live
              />
            )}
          </>
        ) : null}
      </Animated.View>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------------

function Hero({
  name,
  imageUri,
  subtitle,
  onClose,
  closeDisabled,
}: {
  name: string;
  imageUri?: string;
  subtitle: string;
  onClose: () => void;
  closeDisabled: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
      <MedTile name={name} imageUri={imageUri} size="lg" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title2" numberOfLines={3}>
          {name}
        </Text>
        <Text variant="subhead" tone="secondary">
          {subtitle}
        </Text>
      </View>
      <IconButton
        icon={X}
        size="sm"
        variant="tinted"
        tone="default"
        disabled={closeDisabled}
        accessibilityLabel={i18n.t('ui.today.sheet.close')}
        onPress={onClose}
        style={{ alignSelf: 'flex-start' }}
      />
    </View>
  );
}

function Notice({
  tone,
  icon,
  title,
  text,
  live,
}: {
  tone: StatusTone;
  icon: LucideIcon;
  title?: string;
  text: string;
  live?: boolean;
}) {
  const { colors } = useTheme();
  const sc = statusColors(colors, tone);
  return (
    <View
      accessible
      accessibilityLiveRegion={live ? 'polite' : undefined}
      accessibilityLabel={[title, text].filter(Boolean).join('. ')}
      style={{
        flexDirection: 'row',
        alignItems: title ? 'flex-start' : 'center',
        gap: 10,
        padding: 14,
        borderRadius: 16,
        backgroundColor: sc.bg,
      }}>
      <Icon as={icon} size={20} color={tone === 'default' ? colors.inkSecondary : sc.fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <Text variant="subhead" weight="600" color={tone === 'default' ? colors.ink : sc.fg}>
            {title}
          </Text>
        ) : null}
        <Text
          variant="subhead"
          weight={title ? undefined : '600'}
          color={title || tone === 'default' ? colors.ink : sc.fg}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function NotesBlock({ label, text }: { label: string; text: string }) {
  return <Notice tone="default" icon={StickyNote} title={label} text={text} />;
}

function AmountStepper({
  value,
  onChange,
  step,
  unit,
}: {
  value: number;
  onChange: (n: number) => void;
  step: number;
  unit: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="subhead" tone="secondary" style={{ paddingHorizontal: 4 }}>
        {i18n.t('ui.today.sheet.amountLabel')}
      </Text>
      <Stepper
        value={value}
        onChange={onChange}
        min={step}
        step={step}
        allowDecimal
        unit={formatUnit(value, unit)}
        accessibilityLabel={i18n.t('ui.today.sheet.amountLabel')}
      />
    </View>
  );
}

function UnloggedBody({
  timing,
  medication,
  notes,
  partialOn,
  partialAmount,
  onPartialAmount,
  partialStepSize,
  unit,
  noteOpen,
  onOpenNote,
  noteValue,
  onNoteChange,
  reduceMotion,
}: {
  timing: ReturnType<typeof getTiming>;
  medication: Medication | null;
  notes?: string;
  partialOn: boolean;
  partialAmount: number;
  onPartialAmount: (n: number) => void;
  partialStepSize: number;
  unit: string;
  noteOpen: boolean;
  onOpenNote: () => void;
  noteValue: string;
  onNoteChange: (s: string) => void;
  reduceMotion: boolean;
}) {
  const runningLow = medication ? getRunningLowStatus(medication) : null;
  const reveal = reduceMotion ? undefined : FadeInDown.duration(200);
  return (
    <>
      {timing.isLate ? (
        <Notice
          tone={timing.minutesLate >= LATE_DANGER_MIN ? 'danger' : 'warning'}
          icon={Clock}
          text={i18n.t('ui.today.sheet.lateBy', { duration: formatDuration(timing.minutesLate) })}
        />
      ) : timing.isEarly ? (
        <Notice
          tone="warning"
          icon={Hourglass}
          text={i18n.t('ui.today.sheet.dueIn', { duration: formatDuration(timing.minutesEarly) })}
        />
      ) : null}
      {runningLow?.isRunningLow ? (
        <Notice
          tone="warning"
          icon={PackageOpen}
          title={i18n.t('ui.today.sheet.runningLowTitle')}
          text={
            runningLow.basis === 'days'
              ? i18n.t('ui.today.sheet.runningLowDays', {
                  days: i18n.t('ui.today.duration.days', {
                    count: runningLow.remainingDays ?? runningLow.threshold,
                  }),
                  doses: i18n.t('ui.today.doses', { count: runningLow.remainingDoses }),
                })
              : i18n.t('ui.today.sheet.runningLowDoses', {
                  doses: i18n.t('ui.today.doses', { count: runningLow.remainingDoses }),
                })
          }
        />
      ) : null}
      {notes ? <NotesBlock label={i18n.t('ui.today.sheet.notes')} text={notes} /> : null}
      {partialOn ? (
        <Animated.View entering={reveal}>
          <AmountStepper
            value={partialAmount}
            onChange={onPartialAmount}
            step={partialStepSize}
            unit={unit}
          />
        </Animated.View>
      ) : null}
      {noteOpen ? (
        <Animated.View entering={reveal}>
          <TextField
            label={i18n.t('ui.today.sheet.noteLabel')}
            placeholder={i18n.t('ui.today.sheet.notePlaceholder')}
            value={noteValue}
            onChangeText={onNoteChange}
            multiline
            autoFocus
          />
        </Animated.View>
      ) : (
        <Button
          label={i18n.t('ui.today.sheet.addNote')}
          variant="plain"
          size="sm"
          icon={NotebookPen}
          haptic="tap"
          onPress={onOpenNote}
        />
      )}
    </>
  );
}

function LoggedBody({
  log,
  unit,
  now,
  notes,
}: {
  log: IntakeLog;
  unit: string;
  now: Date;
  notes?: string;
}) {
  const { colors } = useTheme();
  const { formatTime } = useTimeFormat();
  const actual = new Date(log.actualTime);
  const at = formatTime(actual);
  const spec =
    log.action === 'taken'
      ? {
          tone: 'success' as const,
          icon: Check,
          title: isSameDay(actual, now)
            ? i18n.t('ui.today.sheet.takenAt', { time: at })
            : i18n.t('ui.today.sheet.takenOn', { date: formatShortDate(actual, now), time: at }),
          sub: null as string | null,
        }
      : log.action === 'partial'
        ? {
            tone: 'accent' as const,
            icon: Contrast,
            title: i18n.t('ui.today.sheet.partialResult', {
              amount: formatDose(log.dosageAmount, unit),
            }),
            sub: i18n.t('ui.today.sheet.loggedAt', { time: at }),
          }
        : {
            tone: 'danger' as const,
            icon: X,
            title: i18n.t('ui.today.sheet.skipped'),
            sub: i18n.t('ui.today.sheet.loggedAt', { time: at }),
          };
  const sc = statusColors(colors, spec.tone);
  return (
    <>
      <View
        accessible
        accessibilityLabel={[spec.title, spec.sub].filter(Boolean).join(', ')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          borderRadius: 20,
          backgroundColor: sc.bg,
        }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: sc.fg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon as={spec.icon} size={24} color={colors.onAccent} strokeWidth={2.75} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title3">{spec.title}</Text>
          {spec.sub ? (
            <Text variant="subhead" tone="secondary">
              {spec.sub}
            </Text>
          ) : null}
        </View>
      </View>
      {log.notes ? <NotesBlock label={i18n.t('ui.today.sheet.yourNote')} text={log.notes} /> : null}
      {notes ? <NotesBlock label={i18n.t('ui.today.sheet.notes')} text={notes} /> : null}
    </>
  );
}

function OverlapBody({ name, overlap, now }: { name: string; overlap: LateOverlap; now: Date }) {
  const { colors } = useTheme();
  const { formatTime } = useTimeFormat();
  const next = overlap.nextDoseTime;
  const time = isSameDay(next, now)
    ? formatTime(next)
    : `${formatShortDate(next, now)}, ${formatTime(next)}`;
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.warningSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon as={AlarmClock} size={28} tone="warning" />
      </View>
      <Text variant="title2">{i18n.t('ui.today.overlap.title')}</Text>
      <Text variant="body">
        {i18n.t('ui.today.overlap.message', {
          name,
          time,
          minutes: overlap.minutesUntilNext,
        })}
      </Text>
      <Text variant="subhead" tone="secondary">
        {i18n.t('ui.today.overlap.explain')}
      </Text>
    </View>
  );
}
