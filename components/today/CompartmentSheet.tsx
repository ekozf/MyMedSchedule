/**
 * Compartment sheet (docs/DESIGN.md §5.2): opens from a compartment on Today. One row per dose,
 * rows separated by a `line` hairline and 20 px spacing. Each row: name plus strength (title3,
 * "Metformin 500 mg"), detail (callout, ink2) and state lines. A dose still to take gets three
 * equal grey buttons, at least 48 tall, whose labels may wrap to two lines ("Earlier time",
 * "Took less", and a quieter "Skip"), then a full-width 60-tall green primary as the last element so it sits nearest the
 * thumb: "I took it" for a due or late dose, "Record as taken now" for an upcoming one (whose state
 * line reads "Upcoming · planned for 20:00"; taking it more than two hours early asks first). A
 * logged dose shows its status pill ("✓ Taken 08:12" / "Partial 08:12" / "Skipped") right of the
 * name, then quiet "Change" and "Undo". Expansions open in place inside the row: "Earlier
 * time" (a time field, default the planned time, Save / Cancel), partial amount, skip with
 * an optional reason (saved as the log's note), change a logged dose, and the late-overlap question
 * ("Keep my schedule" / "Move next dose" → pick a time). While one is open, that row's buttons
 * hide so the editor's button is the only action, and the sheet scrolls the editor into view. At
 * large font sizes buttons stack. The sheet never closes itself: once everything is handled a
 * 52-tall secondary "Done" shows at the bottom (the pills already say what happened). With several
 * people in the app the subtitle starts with "For {name}".
 *
 * Presentational: rows come live from the parent (`group`), and every change goes through
 * `handlers` (see `useDoseActions` + the Today screen). Each handler resolves true when saved.
 *
 * @example
 * <CompartmentSheet
 *   visible={open} onClose={close} group={groups[1]} medsById={medsById} now={now}
 *   focus={{ key: entry.key, panel: 'overlap' }} handlers={handlers} onUpdateSupply={openMed}
 * />
 */
import * as React from 'react';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { isSameDay, startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import {
  Button,
  ChipGroup,
  DateTimeField,
  Icon,
  PressableScale,
  SegmentedControl,
  Sheet,
  Stepper,
  Text,
  TextField,
  radii,
  useConfirm,
  useSheetScroll,
  useTheme,
} from '@/components/ds';
import { useCarerName } from '@/components/shell/ProfileChip';
import { compartmentLabelKey } from '@/lib/settings/compartments';
import {
  formatDose,
  formatLongDate,
  formatShortDate,
  formatUnit,
  useTimeFormat,
} from '@/lib/ui/format';
import { isSupplyShort } from '@/lib/ui/supply';
import { medicineDisplayName } from '@/components/medicines/medicine-info';
import type { IntakeAction, Medication } from '@/types';
import {
  compartmentSheetSubtitle,
  computeLateOverlap,
  defaultPartialAmount,
  EARLY_WINDOW_MIN,
  formatDuration,
  formatDurationLong,
  getTiming,
  isLogged,
  partialStep,
  suggestRescheduleTime,
  type CompartmentGroup,
  type DoseEntry,
  type DoseLogRequest,
  type DoseUpdateRequest,
  type LateOverlap,
} from './logic';

export type RowPanel = 'earlier' | 'partial' | 'skip' | 'change' | 'overlap' | 'reschedule';

/** Skip reasons, stored as the log's note in the person's language. */
const SKIP_REASONS = ['forgot', 'unwell', 'ranOut', 'doctor', 'other'] as const;
type SkipReason = (typeof SKIP_REASONS)[number];

export interface CompartmentSheetHandlers {
  /** Create a log (safety check inside). */
  log: (entry: DoseEntry, req: DoseLogRequest) => Promise<boolean>;
  /** Move the medicine's next dose to `time`, then log this dose now. */
  rescheduleAndLog: (
    entry: DoseEntry,
    time: Date,
    req: Omit<DoseLogRequest, 'at'>
  ) => Promise<boolean>;
  /** Change the existing log. */
  update: (entry: DoseEntry, req: DoseUpdateRequest) => Promise<boolean>;
  /** Remove the existing log (supply restored). */
  undo: (entry: DoseEntry) => Promise<boolean>;
}

export interface CompartmentSheetFocus {
  key: string;
  panel: RowPanel | null;
}

export interface CompartmentSheetProps {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  /** Live group of the open compartment (re-derived by the parent after every change). */
  group: CompartmentGroup | null;
  medsById: Map<string, Medication>;
  now: Date;
  /** Open with this row's panel expanded (Up next "More", overlap from "I took it", reminders). */
  focus?: CompartmentSheetFocus | null;
  handlers: CompartmentSheetHandlers;
  /** "Update supply" on a dose there isn't enough left for. */
  onUpdateSupply: (medicationId: string) => void;
}

interface OpenPanel {
  key: string;
  panel: RowPanel;
  /** Late-overlap: the log waiting for "Keep my schedule" / "Move next dose". */
  pending?: Omit<DoseLogRequest, 'at'>;
  overlap?: LateOverlap;
}

/** Above this font scale the row's buttons stack (one per line) and the pill sits under the name. */
const STACK_FONT_SCALE = 1.2;

export function CompartmentSheet({
  visible,
  onClose,
  onDismissed,
  group,
  medsById,
  now,
  focus,
  handlers,
  onUpdateSupply,
}: CompartmentSheetProps) {
  const { formatTime } = useTimeFormat();
  const { colors } = useTheme();
  const [open, setOpen] = React.useState<OpenPanel | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const person = useCarerName();

  // Reset (or apply the requested focus) each time the sheet opens.
  React.useEffect(() => {
    if (!visible) return;
    setBusy(null);
    if (focus?.panel && group) {
      const entry = group.entries.find((e) => e.key === focus.key);
      const med = entry ? medsById.get(entry.dose.medicationId) : undefined;
      if (entry && focus.panel === 'overlap') {
        const overlap = computeLateOverlap(med, entry.dose, new Date(), 'taken');
        setOpen(
          overlap
            ? {
                key: entry.key,
                panel: 'overlap',
                overlap,
                pending: { action: 'taken', amount: entry.dose.dosageAmount },
              }
            : null
        );
        return;
      }
      setOpen(entry ? { key: entry.key, panel: focus.panel } : null);
      return;
    }
    setOpen(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, focus]);

  const allHandled = !!group && group.total > 0 && group.handled === group.total;

  const run = React.useCallback(
    async (key: string, fn: () => Promise<boolean>) => {
      if (busy) return false;
      setBusy(key);
      let ok = false;
      try {
        ok = await fn();
      } finally {
        setBusy(null);
      }
      if (ok) setOpen(null);
      return ok;
    },
    [busy]
  );

  const title = group ? i18n.t(compartmentLabelKey(group.id)) : '';
  const status = group ? compartmentSheetSubtitle(group, formatTime) : '';
  const subtitle = person
    ? [i18n.t('ui.common.forPerson', { name: person }), status].filter(Boolean).join(' · ')
    : status || undefined;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      dismissible={busy === null}
      title={title}
      subtitle={subtitle}>
      <View>
        {group?.entries.map((entry, i) => (
          <DoseItem
            key={entry.key}
            entry={entry}
            first={i === 0}
            medication={medsById.get(entry.dose.medicationId) ?? null}
            now={now}
            open={open?.key === entry.key ? open : null}
            setOpen={setOpen}
            busy={busy}
            run={run}
            handlers={handlers}
            onUpdateSupply={onUpdateSupply}
          />
        ))}
        {allHandled && !open ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              borderTopWidth: StyleSheet.hairlineWidth * 2,
              borderTopColor: colors.line,
              paddingTop: 20,
            }}>
            <Button
              label={i18n.t('ui.today.dose.done')}
              variant="secondary"
              disabled={busy !== null}
              onPress={onClose}
              style={{ minHeight: 52 }}
            />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------------

interface DoseItemProps {
  entry: DoseEntry;
  first: boolean;
  medication: Medication | null;
  now: Date;
  open: OpenPanel | null;
  setOpen: (p: OpenPanel | null) => void;
  busy: string | null;
  run: (key: string, fn: () => Promise<boolean>) => Promise<boolean>;
  handlers: CompartmentSheetHandlers;
  onUpdateSupply: (medicationId: string) => void;
}

function DoseItem({
  entry,
  first,
  medication,
  now,
  open,
  setOpen,
  busy,
  run,
  handlers,
  onUpdateSupply,
}: DoseItemProps) {
  const { colors } = useTheme();
  const { formatTime } = useTimeFormat();
  const confirm = useConfirm();
  const reduceMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale > STACK_FONT_SCALE;
  const sheetScroll = useSheetScroll();
  const rowY = React.useRef(0);
  const { dose, log, status } = entry;
  const name = medicineDisplayName(medication ?? { name: dose.medicationName });
  const unit = dose.dosageUnit;
  const time = formatTime(dose.time);
  const logged = isLogged(status);
  const futureDay = startOfDay(dose.time).getTime() > startOfDay(now).getTime();
  const disabled = busy !== null;
  const myBusy = busy?.startsWith(entry.key) ? busy.slice(entry.key.length + 1) : null;

  // --- detail lines ---------------------------------------------------------------------------
  const planned = isSameDay(dose.time, now)
    ? i18n.t('ui.today.dose.plannedFor', { time })
    : i18n.t('ui.today.dose.plannedOn', { date: formatShortDate(dose.time, now), time });
  const amountText = formatDose(dose.dosageAmount, unit);
  // Upcoming today: the amount here, and "Upcoming · planned for 20:00" as the state line.
  const upcomingToday = status === 'upcoming' && !futureDay;
  const detail = upcomingToday ? amountText : `${amountText} · ${planned}`;

  let stateLine: { text: string; tone: 'late' | 'secondary' } | null = null;
  if (status === 'late') {
    stateLine = {
      text: i18n.t('ui.today.dose.lateBy', { duration: formatDurationLong(entry.minutesLate) }),
      tone: 'late',
    };
  } else if (status === 'missed') {
    stateLine = { text: i18n.t('ui.today.dose.notLogged'), tone: 'late' };
  } else if (status === 'due') {
    const t = getTiming(dose, now);
    if (t.minutesEarly > 0) {
      stateLine = {
        text: i18n.t('ui.today.dose.dueIn', { duration: formatDuration(t.minutesEarly) }),
        tone: 'secondary',
      };
    }
  } else if (upcomingToday) {
    stateLine = { text: i18n.t('ui.today.dose.upcoming', { time }), tone: 'secondary' };
  } else if (status === 'partial' && log) {
    stateLine = {
      text: i18n.t('ui.today.dose.takenAmount', { amount: formatDose(log.dosageAmount, unit) }),
      tone: 'secondary',
    };
  }

  const supplyShort =
    !logged &&
    !futureDay &&
    !!medication &&
    isSupplyShort(medication.inventoryCount, dose.dosageAmount, medication.trackSupply);

  // --- actions --------------------------------------------------------------------------------
  const busyKey = (kind: string) => `${entry.key}|${kind}`;

  const take = async () => {
    if (disabled) return;
    if (status === 'missed') {
      // A dose from a day that's over: "I took it" means at the planned time.
      run(busyKey('take'), () =>
        handlers.log(entry, { action: 'taken', amount: dose.dosageAmount, at: 'scheduled' })
      );
      return;
    }
    // Well before its time (more than the early window): make sure it's meant for now.
    const pressedAt = new Date();
    const minutesEarly = getTiming(dose, pressedAt).minutesEarly;
    if (minutesEarly > EARLY_WINDOW_MIN) {
      const ok = await confirm({
        title: i18n.t('ui.today.dose.earlyTitle'),
        message: i18n.t('ui.today.dose.earlyMessage', { time, now: formatTime(pressedAt) }),
        confirmLabel: i18n.t('ui.today.dose.earlyConfirm'),
        cancelLabel: i18n.t('ui.today.dose.earlyCancel'),
      });
      if (!ok) return;
    }
    const req = { action: 'taken' as const, amount: dose.dosageAmount };
    const overlap = computeLateOverlap(medication, dose, new Date(), 'taken');
    if (overlap) {
      setOpen({ key: entry.key, panel: 'overlap', overlap, pending: req });
      return;
    }
    run(busyKey('take'), () => handlers.log(entry, { ...req, at: 'now' }));
  };
  const logEarlier = (at: Date) =>
    run(busyKey('earlier'), () =>
      handlers.log(entry, { action: 'taken', amount: dose.dosageAmount, at })
    );
  const skip = (reason: string | null) =>
    run(busyKey('skip'), () =>
      handlers.log(entry, {
        action: 'skipped',
        amount: dose.dosageAmount,
        at: 'now',
        notes: reason ?? undefined,
      })
    );
  const undo = () => run(busyKey('undo'), () => handlers.undo(entry));

  const logPartial = (amount: number) => {
    const req = { action: 'partial' as const, amount };
    if (status !== 'missed') {
      const overlap = computeLateOverlap(medication, dose, new Date(), 'partial');
      if (overlap) {
        setOpen({ key: entry.key, panel: 'overlap', overlap, pending: req });
        return;
      }
    }
    run(busyKey('partial'), () =>
      handlers.log(entry, { ...req, at: status === 'missed' ? 'scheduled' : 'now' })
    );
  };

  const toggle = (panel: RowPanel) =>
    setOpen(open?.panel === panel ? null : { key: entry.key, panel });

  // --- status pill (logged) -----------------------------------------------------------------
  let pill: React.ReactNode = null;
  let loggedLabel: string | null = null;
  if (logged && log) {
    const at = formatTime(new Date(log.actualTime));
    const spec =
      status === 'taken'
        ? {
            label: i18n.t('ui.today.dose.taken', { time: at }),
            bg: colors.done,
            fg: colors.doneInk,
          }
        : status === 'partial'
          ? {
              label: i18n.t('ui.today.dose.partial', { time: at }),
              bg: colors.now,
              fg: colors.nowInk,
            }
          : { label: i18n.t('ui.today.dose.skipped'), bg: colors.field, fg: colors.ink };
    loggedLabel = spec.label;
    pill = (
      <LoggedPill
        label={spec.label}
        bg={spec.bg}
        fg={spec.fg}
        icon={status === 'taken'}
        accessibilityLabel={i18n.t('ui.today.dose.loggedA11y', {
          name,
          state: spec.label,
        })}
      />
    );
  }

  // --- actions --------------------------------------------------------------------------------
  // Not logged: a row of secondary choices, then "I took it" last so it sits nearest the thumb.
  // Logged: "Change" and "Undo" as quiet buttons.
  const choices: ActionSpec[] = [];
  if (logged) {
    choices.push({
      key: 'change',
      label: i18n.t('ui.today.dose.change'),
      onPress: () => toggle('change'),
      tone: 'quiet',
      accessibilityLabel: i18n.t('ui.today.dose.changeA11y', { name }),
    });
    choices.push({
      key: 'undo',
      label: i18n.t('ui.today.dose.undo'),
      onPress: undo,
      tone: 'quiet',
      accessibilityLabel: i18n.t('ui.today.dose.undoA11y', {
        name,
        state: loggedLabel ?? '',
      }),
    });
  } else if (!futureDay) {
    choices.push({
      key: 'earlier',
      label: i18n.t('ui.today.dose.earlier'),
      onPress: () => toggle('earlier'),
      tone: 'secondary',
      accessibilityLabel: i18n.t('ui.today.dose.earlierA11y', { name }),
    });
    choices.push({
      key: 'partial',
      label: i18n.t('ui.today.dose.partOf'),
      onPress: () => toggle('partial'),
      tone: 'secondary',
    });
    choices.push({
      key: 'skip',
      label: i18n.t('ui.today.dose.skip'),
      onPress: () => toggle('skip'),
      tone: 'muted',
    });
  }
  const canTake = !logged && !futureDay;

  const medNote = medication?.notes ?? dose.notes;
  const reveal = reduceMotion ? undefined : FadeIn.duration(200);
  // While an editor is open it is the row's only action: hide the row's buttons.
  const editing = open !== null;

  return (
    <View
      onLayout={(e) => {
        rowY.current = e.nativeEvent.layout.y;
      }}
      style={{
        paddingTop: first ? 4 : 20,
        paddingBottom: 20,
        gap: 12,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth * 2,
        borderTopColor: colors.line,
      }}>
      <View style={{ gap: 4 }}>
        <View
          style={{
            flexDirection: stacked ? 'column' : 'row',
            alignItems: stacked ? 'flex-start' : 'center',
            gap: stacked ? 8 : 12,
          }}>
          <Text variant="title3" style={{ flex: stacked ? undefined : 1 }}>
            {name}
          </Text>
          {pill ? (
            <View style={{ flexShrink: 1, maxWidth: stacked ? '100%' : '60%' }}>{pill}</View>
          ) : null}
        </View>
        <Text variant="callout" tone="secondary" tabular>
          {detail}
        </Text>
        {stateLine ? (
          <Text
            variant="callout"
            weight="700"
            tone={stateLine.tone === 'late' ? 'late' : 'secondary'}
            tabular>
            {stateLine.text}
          </Text>
        ) : null}
        {entry.moved && !logged ? (
          <Text variant="subhead" weight="400" tone="secondary">
            {i18n.t('ui.today.dose.moved')}
          </Text>
        ) : null}
        {medNote ? (
          <Text variant="subhead" weight="400" tone="secondary">
            {i18n.t('ui.today.dose.note', { note: medNote })}
          </Text>
        ) : null}
        {log?.notes ? (
          <Text variant="subhead" weight="400" tone="secondary">
            {i18n.t('ui.today.dose.yourNote', { note: log.notes })}
          </Text>
        ) : null}
        {futureDay && !logged ? (
          <Text variant="subhead" weight="400" tone="secondary">
            {i18n.t('ui.today.dose.futureDay', { date: formatLongDate(dose.time, now) })}
          </Text>
        ) : null}
      </View>

      {supplyShort && medication ? (
        <View style={{ gap: 0 }} accessibilityLiveRegion="polite">
          <Text variant="subhead" weight="700" tone="late">
            {i18n.t('ui.today.dose.supplyShort', {
              left: formatDose(medication.inventoryCount, unit),
            })}
          </Text>
          <Button
            label={i18n.t('ui.today.dose.updateSupply')}
            variant="link"
            size="sm"
            disabled={disabled}
            onPress={() => onUpdateSupply(medication.id)}
          />
        </View>
      ) : null}

      {choices.length > 0 && !editing ? (
        <View style={{ flexDirection: stacked ? 'column' : 'row', gap: 8 }}>
          {choices.map((c) => (
            <ActionButton
              key={c.key}
              spec={c}
              disabled={disabled}
              loading={myBusy === c.key}
              fill={!stacked}
            />
          ))}
        </View>
      ) : null}

      {canTake && !editing ? (
        <Button
          label={i18n.t(upcomingToday ? 'ui.today.dose.takeNow' : 'ui.today.dose.take')}
          variant="primary"
          onPress={take}
          disabled={disabled && myBusy !== 'take'}
          loading={myBusy === 'take'}
          accessibilityLabel={i18n.t('ui.today.dose.takeA11y', { name })}
          accessibilityHint={status === 'missed' ? undefined : i18n.t('ui.today.a11y.takeHint')}
        />
      ) : null}

      {open ? (
        <Animated.View
          entering={reveal}
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            sheetScroll?.reveal(rowY.current + y, height);
          }}
          style={{ gap: 12, marginTop: 4 }}>
          {open.panel === 'earlier' ? (
            <EarlierPanel
              planned={dose.time}
              busy={myBusy === 'earlier'}
              disabled={disabled}
              onSubmit={logEarlier}
              onCancel={() => setOpen(null)}
            />
          ) : null}
          {open.panel === 'skip' ? (
            <SkipPanel
              busy={myBusy === 'skip'}
              disabled={disabled}
              onSubmit={skip}
              onCancel={() => setOpen(null)}
            />
          ) : null}
          {open.panel === 'partial' ? (
            <PartialPanel
              amount={dose.dosageAmount}
              unit={unit}
              busy={myBusy === 'partial'}
              disabled={disabled}
              onSubmit={logPartial}
              onCancel={() => setOpen(null)}
            />
          ) : null}
          {open.panel === 'change' && log ? (
            <ChangePanel
              entry={entry}
              busy={myBusy === 'change'}
              disabled={disabled}
              onSubmit={(req) => run(busyKey('change'), () => handlers.update(entry, req))}
              onCancel={() => setOpen(null)}
            />
          ) : null}
          {open.panel === 'overlap' && open.overlap ? (
            <OverlapPanel
              name={name}
              overlap={open.overlap}
              now={now}
              busy={myBusy === 'keep'}
              disabled={disabled}
              onKeep={() =>
                run(busyKey('keep'), () =>
                  handlers.log(entry, {
                    ...(open.pending ?? { action: 'taken', amount: dose.dosageAmount }),
                    at: 'now',
                  })
                )
              }
              onMove={() => setOpen({ ...open, panel: 'reschedule' })}
              onCancel={() => setOpen(null)}
            />
          ) : null}
          {open.panel === 'reschedule' && open.overlap ? (
            <ReschedulePanel
              name={name}
              initial={suggestRescheduleTime(dose, open.overlap.nextDoseTime, new Date())}
              now={now}
              busy={myBusy === 'move'}
              disabled={disabled}
              onSubmit={(t) =>
                run(busyKey('move'), () =>
                  handlers.rescheduleAndLog(
                    entry,
                    t,
                    open.pending ?? { action: 'taken', amount: dose.dosageAmount }
                  )
                )
              }
              onBack={() => setOpen({ ...open, panel: 'overlap' })}
            />
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

/** Non-interactive status once a dose is logged ("✓ Taken 12:24"); undo is a separate link. */
function LoggedPill({
  label,
  bg,
  fg,
  icon,
  accessibilityLabel,
}: {
  label: string;
  bg: string;
  fg: string;
  icon?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      style={{
        minHeight: 40,
        borderRadius: radii.pill,
        backgroundColor: bg,
        paddingHorizontal: 14,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}>
      {icon ? <Icon as={Check} size={20} color={fg} strokeWidth={2.5} /> : null}
      <Text variant="callout" weight="700" color={fg} tabular style={{ flexShrink: 1 }}>
        {label}
      </Text>
    </View>
  );
}

interface ActionSpec {
  key: string;
  label: string;
  onPress: () => void;
  /** secondary = `field` fill + ink · muted = `field` fill + ink2 (Skip) · quiet = no fill, ink2. */
  tone: 'secondary' | 'muted' | 'quiet';
  accessibilityLabel?: string;
}

/**
 * Row button, at least 48 tall; `fill` shares the row's width equally with its siblings. Labels
 * wrap to two lines at 17/600 instead of shrinking; the row grows so all three stay equal.
 */
function ActionButton({
  spec,
  disabled,
  loading,
  fill,
}: {
  spec: ActionSpec;
  disabled: boolean;
  loading: boolean;
  fill: boolean;
}) {
  const { colors } = useTheme();
  const fg = spec.tone === 'secondary' ? colors.ink : colors.ink2;
  return (
    <PressableScale
      onPress={spec.onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={spec.accessibilityLabel ?? spec.label}
      accessibilityState={{ disabled, busy: loading }}
      style={{
        flex: fill ? 1 : undefined,
        flexBasis: fill ? 0 : undefined,
        minHeight: 48,
        borderRadius: radii.button,
        backgroundColor: spec.tone === 'quiet' ? 'transparent' : colors.field,
        paddingHorizontal: 8,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled && !loading ? 0.6 : 1,
      }}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text
          variant="callout"
          weight="600"
          color={fg}
          align="center"
          tabular
          numberOfLines={fill ? 2 : undefined}>
          {spec.label}
        </Text>
      )}
    </PressableScale>
  );
}

/** "Taken earlier": a time field (default: the planned time, or now when that is still ahead). */
function EarlierPanel({
  planned,
  busy,
  disabled,
  onSubmit,
  onCancel,
}: {
  planned: Date;
  busy: boolean;
  disabled: boolean;
  onSubmit: (at: Date) => void;
  onCancel: () => void;
}) {
  const [time, setTime] = React.useState(() => {
    const now = new Date();
    const d = planned.getTime() <= now.getTime() ? new Date(planned) : now;
    d.setSeconds(0, 0);
    return d;
  });
  const valid = time.getTime() <= Date.now() + 60_000;
  return (
    <>
      <DateTimeField
        mode="time"
        label={i18n.t('ui.today.dose.earlierLabel')}
        value={time}
        onChange={(d) => {
          const next = new Date(time);
          next.setHours(d.getHours(), d.getMinutes(), 0, 0);
          setTime(next);
        }}
      />
      {!valid ? (
        <Text variant="footnote" tone="danger" accessibilityLiveRegion="polite">
          {i18n.t('ui.today.dose.futureTime')}
        </Text>
      ) : null}
      <Button
        label={i18n.t('ui.today.dose.save')}
        loading={busy}
        disabled={!valid || (disabled && !busy)}
        onPress={() => onSubmit(time)}
      />
      <Button
        label={i18n.t('ui.today.dose.cancel')}
        variant="quiet"
        disabled={disabled}
        onPress={onCancel}
      />
    </>
  );
}

/** Skip with an optional reason; the reason text becomes the log's note. */
function SkipPanel({
  busy,
  disabled,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  disabled: boolean;
  onSubmit: (reason: string | null) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = React.useState<SkipReason | null>(null);
  return (
    <>
      <Text variant="subhead" weight="700" tone="secondary">
        {i18n.t('ui.today.dose.skipWhy')}
      </Text>
      <ChipGroup<SkipReason>
        options={SKIP_REASONS.map((r) => ({
          value: r,
          label: i18n.t(`ui.today.dose.reason.${r}`),
        }))}
        value={reason}
        onChange={(r) => setReason(r)}
      />
      <Button
        label={i18n.t('ui.today.dose.skipConfirm')}
        loading={busy}
        disabled={disabled && !busy}
        onPress={() => onSubmit(reason ? i18n.t(`ui.today.dose.reason.${reason}`) : null)}
      />
      <Button
        label={i18n.t('ui.today.dose.cancel')}
        variant="quiet"
        disabled={disabled}
        onPress={onCancel}
      />
    </>
  );
}

function PartialPanel({
  amount,
  unit,
  busy,
  disabled,
  onSubmit,
  onCancel,
}: {
  amount: number;
  unit: string;
  busy: boolean;
  disabled: boolean;
  onSubmit: (amount: number) => void;
  onCancel: () => void;
}) {
  const step = partialStep(amount, unit);
  const [value, setValue] = React.useState(() => defaultPartialAmount(amount, step));
  return (
    <>
      <Stepper
        label={i18n.t('ui.today.dose.howMuch')}
        value={value}
        onChange={setValue}
        min={step}
        step={step}
        unit={formatUnit(value, unit)}
      />
      <Button
        label={i18n.t('ui.today.dose.logAmount')}
        loading={busy}
        disabled={disabled && !busy}
        onPress={() => onSubmit(value)}
      />
      <Button
        label={i18n.t('ui.today.dose.cancel')}
        variant="quiet"
        disabled={disabled}
        onPress={onCancel}
      />
    </>
  );
}

function ChangePanel({
  entry,
  busy,
  disabled,
  onSubmit,
  onCancel,
}: {
  entry: DoseEntry;
  busy: boolean;
  disabled: boolean;
  onSubmit: (req: DoseUpdateRequest) => void;
  onCancel: () => void;
}) {
  const log = entry.log!;
  const unit = entry.dose.dosageUnit;
  const step = partialStep(entry.dose.dosageAmount, unit);
  const [action, setAction] = React.useState<IntakeAction>(log.action);
  // Start from what was logged (not today's planned amount); a skipped log may hold 0.
  const [amount, setAmount] = React.useState(
    log.dosageAmount > 0 ? log.dosageAmount : entry.dose.dosageAmount
  );
  const [time, setTime] = React.useState(() => new Date(log.actualTime));
  const [notes, setNotes] = React.useState(log.notes ?? '');

  const consumes = action !== 'skipped';
  const amountValid = !consumes || amount > 0;
  const timeValid = time.getTime() <= Date.now() + 60_000;
  const error = !amountValid
    ? i18n.t('ui.today.dose.invalidAmount')
    : !timeValid
      ? i18n.t('ui.today.dose.futureTime')
      : null;

  return (
    <>
      <SegmentedControl<IntakeAction>
        value={action}
        onChange={setAction}
        options={[
          { value: 'taken', label: i18n.t('ui.today.dose.statusTaken') },
          { value: 'skipped', label: i18n.t('ui.today.dose.statusSkipped') },
          { value: 'partial', label: i18n.t('ui.today.dose.statusPartial') },
        ]}
      />
      {consumes ? (
        <Stepper
          label={i18n.t('ui.today.dose.howMuch')}
          value={amount}
          onChange={setAmount}
          min={step}
          step={step}
          unit={formatUnit(amount, unit)}
        />
      ) : null}
      <DateTimeField
        mode="time"
        label={i18n.t('ui.today.dose.timeLabel')}
        value={time}
        onChange={(d) => {
          const next = new Date(time);
          next.setHours(d.getHours(), d.getMinutes(), 0, 0);
          setTime(next);
        }}
      />
      <TextField
        label={i18n.t('ui.today.dose.noteLabel')}
        placeholder={i18n.t(
          action === 'skipped'
            ? 'ui.today.dose.notePlaceholderSkipped'
            : 'ui.today.dose.notePlaceholder'
        )}
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      {error ? (
        <Text variant="footnote" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button
        label={i18n.t('ui.today.dose.saveChanges')}
        loading={busy}
        disabled={!!error || (disabled && !busy)}
        onPress={() =>
          onSubmit({
            action,
            // Skipped keeps the log's amount (no supply effect either way).
            amount: consumes ? amount : log.dosageAmount,
            notes: notes.trim(),
            actualTime: time,
          })
        }
      />
      <Button
        label={i18n.t('ui.today.dose.cancel')}
        variant="quiet"
        disabled={disabled}
        onPress={onCancel}
      />
    </>
  );
}

function OverlapPanel({
  name,
  overlap,
  now,
  busy,
  disabled,
  onKeep,
  onMove,
  onCancel,
}: {
  name: string;
  overlap: LateOverlap;
  now: Date;
  busy: boolean;
  disabled: boolean;
  onKeep: () => void;
  onMove: () => void;
  onCancel: () => void;
}) {
  const { formatTime } = useTimeFormat();
  const next = overlap.nextDoseTime;
  const time = isSameDay(next, now)
    ? formatTime(next)
    : `${formatShortDate(next, now)}, ${formatTime(next)}`;
  return (
    <>
      <Text variant="headline" accessibilityRole="header">
        {i18n.t('ui.today.overlap.title')}
      </Text>
      <Text variant="body">
        {i18n.t('ui.today.overlap.message', { name, time, minutes: overlap.minutesUntilNext })}
      </Text>
      <Text variant="body" tone="secondary">
        {i18n.t('ui.today.overlap.explain')}
      </Text>
      <Button
        label={i18n.t('ui.today.overlap.keep')}
        loading={busy}
        disabled={disabled && !busy}
        onPress={onKeep}
      />
      <Button
        label={i18n.t('ui.today.overlap.move')}
        variant="secondary"
        disabled={disabled}
        onPress={onMove}
      />
      <Button
        label={i18n.t('ui.today.dose.cancel')}
        variant="quiet"
        disabled={disabled}
        onPress={onCancel}
      />
    </>
  );
}

function ReschedulePanel({
  name,
  initial,
  now,
  busy,
  disabled,
  onSubmit,
  onBack,
}: {
  name: string;
  initial: Date;
  now: Date;
  busy: boolean;
  disabled: boolean;
  onSubmit: (time: Date) => void;
  onBack: () => void;
}) {
  const { formatTime } = useTimeFormat();
  const [moveTo, setMoveTo] = React.useState(initial);
  const valid = moveTo.getTime() > now.getTime();
  return (
    <>
      <Text variant="headline" accessibilityRole="header">
        {i18n.t('ui.today.reschedule.title')}
      </Text>
      <Text variant="body" tone="secondary">
        {i18n.t('ui.today.reschedule.message', { name })}
      </Text>
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
      />
      <Text
        variant="subhead"
        weight={valid ? '600' : '700'}
        tone={valid ? 'secondary' : 'danger'}
        accessibilityLiveRegion="polite">
        {valid
          ? i18n.t('ui.today.reschedule.preview', {
              when: `${formatShortDate(moveTo, now)}, ${formatTime(moveTo)}`,
            })
          : i18n.t('ui.today.reschedule.pastError')}
      </Text>
      <Button
        label={i18n.t('ui.today.reschedule.confirm')}
        loading={busy}
        disabled={!valid || (disabled && !busy)}
        onPress={() => onSubmit(moveTo)}
      />
      <Button
        label={i18n.t('ui.today.dose.cancel')}
        variant="quiet"
        disabled={disabled}
        onPress={onBack}
      />
    </>
  );
}
