/**
 * DEV ONLY — Today preview with mock data (no DB, no store writes). Open /dev/today.
 * Shows the header + week strip, every progress-card variant, dose rows in every status, the
 * grouped list, as-needed shortcuts, empty states, and buttons that open the dose sheet in each
 * state (unlogged early/late/overlap, logged taken/partial/skipped, future).
 */
import * as React from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import {
  CalendarDays,
  Languages,
  Moon,
  Pill,
  Plus,
  Sun,
  Sunrise,
  Sunset,
} from 'lucide-react-native';
import { addDays, addMinutes, format, startOfDay, startOfWeek } from 'date-fns';
import i18n, { getCurrentLocale, setLocale } from '@/lib/i18n';
import {
  Button,
  Chip,
  ChipRow,
  EmptyState,
  IconButton,
  NavHeader,
  Screen,
  SectionHeader,
  TabHeader,
  Text,
  getWeekStartsOn,
  useToast,
} from '@/components/ds';
import { formatDayLabel, formatLongDate } from '@/lib/ui/format';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import type { IntakeAction, IntakeLog, Medication } from '@/types';
import { WeekStrip, type WeekDay } from '@/components/today/WeekStrip';
import { ProgressCard, type DayKind } from '@/components/today/ProgressCard';
import { DoseRow, type DoseRowAction } from '@/components/today/DoseRow';
import { AsNeededSection } from '@/components/today/AsNeededSection';
import { DoseSheet } from '@/components/today/DoseSheet';
import {
  computeDayStats,
  getDoseStatus,
  groupEntries,
  type DayStats,
  type DoseEntry,
} from '@/components/today/logic';

// ---------------------------------------------------------------------------------------------
// Mock data

const minute = (d: Date) => {
  const c = new Date(d);
  c.setSeconds(0, 0);
  return c;
};
const fromNow = (min: number) => minute(addMinutes(new Date(), min));
const hhmm = (d: Date) => format(d, 'HH:mm');

function mockMed(p: {
  id: string;
  name: string;
  times: Date[];
  amount?: number;
  unit?: Medication['dosageUnit'];
  notes?: string;
  inventory?: number;
  refill?: { type: 'days' | 'doses'; value: number };
  isPrn?: boolean;
  override?: Date;
}): Medication {
  const created = addDays(new Date(), -60);
  return {
    id: p.id,
    profileId: 'preview',
    name: p.name,
    notes: p.notes,
    dosageAmount: p.amount ?? 1,
    dosageUnit: p.unit ?? 'pills',
    scheduleType: p.isPrn ? 'prn' : 'multiple_daily',
    scheduleConfig: JSON.stringify(
      p.isPrn ? {} : { times: p.times.map((t) => ({ time: hhmm(t) })) }
    ),
    inventoryCount: p.inventory ?? 60,
    refillReminderType: p.refill?.type ?? null,
    refillReminderValue: p.refill?.value ?? null,
    bypassDnd: false,
    isActive: true,
    isPrn: !!p.isPrn,
    nextDoseOverrideTime: p.override,
    createdAt: created,
    updatedAt: created,
  };
}

function doseOf(med: Medication, time: Date, amount?: number): ScheduledDose {
  return {
    medicationId: med.id,
    medicationName: med.name,
    notes: med.notes,
    time,
    dosageAmount: amount ?? med.dosageAmount,
    dosageUnit: med.dosageUnit,
    isPrn: false,
  };
}

function logOf(
  dose: ScheduledDose,
  action: IntakeAction,
  actual: Date,
  amount?: number,
  notes?: string
): IntakeLog {
  return {
    id: `log-${dose.medicationId}-${action}`,
    medicationId: dose.medicationId,
    profileId: 'preview',
    scheduledTime: dose.time,
    actualTime: actual,
    action,
    dosageAmount: amount ?? dose.dosageAmount,
    notes,
    createdAt: actual,
    updatedAt: actual,
  };
}

function entryOf(dose: ScheduledDose, log: IntakeLog | null, now: Date, moved = false): DoseEntry {
  const { status, minutesLate } = getDoseStatus(dose, log, now);
  return {
    key: `${dose.medicationId}|${dose.time.toISOString()}`,
    dose,
    log,
    status,
    minutesLate,
    moved,
  };
}

function useMocks() {
  return React.useMemo(() => {
    const now = new Date();
    const t = {
      taken: fromNow(-300),
      partial: fromNow(-240),
      skipped: fromNow(-200),
      lateDanger: fromNow(-180),
      lateWarn: fromNow(-45),
      due: fromNow(10),
      early: fromNow(45),
      upcoming: fromNow(180),
      moved: fromNow(240),
      overlapNext: fromNow(40),
    };
    const metformin = mockMed({
      id: 'm1',
      name: 'Metformin',
      times: [t.taken, t.upcoming],
      notes: 'With food',
    });
    const lisinopril = mockMed({
      id: 'm2',
      name: 'Lisinopril',
      times: [t.partial],
      amount: 10,
      unit: 'milligrams',
    });
    const vitaminD = mockMed({
      id: 'm3',
      name: 'Vitamin D',
      times: [t.skipped],
      unit: 'drops',
      amount: 4,
    });
    const amoxicillin = mockMed({
      id: 'm4',
      name: 'Amoxicillin',
      times: [t.lateDanger, t.overlapNext],
      amount: 500,
      unit: 'milligrams',
      inventory: 3,
      refill: { type: 'doses', value: 5 },
      notes: 'Finish the whole course',
    });
    const levothyroxine = mockMed({
      id: 'm5',
      name: 'Levothyroxine',
      times: [t.lateWarn],
      inventory: 8,
      refill: { type: 'days', value: 10 },
    });
    const salbutamol = mockMed({
      id: 'm6',
      name: 'Salbutamol',
      times: [t.due],
      unit: 'puffs',
      amount: 2,
    });
    const omeprazole = mockMed({
      id: 'm7',
      name: 'Omeprazole',
      times: [t.early],
      notes: 'Before breakfast',
    });
    const atorvastatin = mockMed({ id: 'm8', name: 'Atorvastatin', times: [], override: t.moved });
    const ibuprofen = mockMed({
      id: 'p1',
      name: 'Ibuprofen',
      times: [],
      isPrn: true,
      amount: 400,
      unit: 'milligrams',
    });
    const paracetamol = mockMed({
      id: 'p2',
      name: 'Paracetamol',
      times: [],
      isPrn: true,
      amount: 2,
    });

    const d = {
      taken: doseOf(metformin, t.taken),
      partial: doseOf(lisinopril, t.partial),
      skipped: doseOf(vitaminD, t.skipped),
      lateDanger: doseOf(amoxicillin, t.lateDanger),
      lateWarn: doseOf(levothyroxine, t.lateWarn),
      due: doseOf(salbutamol, t.due),
      early: doseOf(omeprazole, t.early),
      upcoming: doseOf(metformin, t.upcoming),
      moved: doseOf(atorvastatin, t.moved),
      yesterday: doseOf(omeprazole, addDays(t.early, -1)),
      tomorrow: doseOf(metformin, addDays(t.taken, 1)),
    };
    const l = {
      taken: logOf(d.taken, 'taken', addMinutes(t.taken, 4)),
      partial: logOf(d.partial, 'partial', addMinutes(t.partial, 12), 5, 'Felt dizzy, took half'),
      skipped: logOf(d.skipped, 'skipped', addMinutes(t.skipped, 30)),
    };
    const meds = [
      metformin,
      lisinopril,
      vitaminD,
      amoxicillin,
      levothyroxine,
      salbutamol,
      omeprazole,
      atorvastatin,
    ];
    const entries: DoseEntry[] = [
      entryOf(d.taken, l.taken, now),
      entryOf(d.partial, l.partial, now),
      entryOf(d.skipped, l.skipped, now),
      entryOf(d.lateDanger, null, now),
      entryOf(d.lateWarn, null, now),
      entryOf(d.due, null, now),
      entryOf(d.early, null, now),
      entryOf(d.upcoming, null, now),
      entryOf(d.moved, null, now, true),
    ].sort((a, b) => a.dose.time.getTime() - b.dose.time.getTime());
    const missed = entryOf(d.yesterday, null, now);
    return {
      now,
      meds,
      medsById: new Map([...meds, ibuprofen, paracetamol].map((m) => [m.id, m])),
      prn: [ibuprofen, paracetamol],
      d,
      l,
      entries,
      missed,
    };
  }, []);
}

function statsOf(p: Partial<DayStats>): DayStats {
  return {
    total: 0,
    taken: 0,
    partial: 0,
    skipped: 0,
    done: 0,
    handled: 0,
    late: 0,
    missed: 0,
    due: null,
    next: null,
    ...p,
  };
}

// ---------------------------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <SectionHeader title={title} />
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

const PART_ICON = {
  earlyNight: Moon,
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
};

interface SheetState {
  dose: ScheduledDose;
  log: IntakeLog | null;
  medication: Medication | null;
  initialStep?: 'main' | 'overlap';
}

export default function TodayPreviewScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const toast = useToast();
  const m = useMocks();
  const isDark = colorScheme === 'dark';

  const [selected, setSelected] = React.useState(() => startOfDay(new Date()));
  const [sheet, setSheet] = React.useState<SheetState | null>(null);
  const [open, setOpen] = React.useState(false);
  const pending = React.useRef<string | null>(null);

  const week = React.useMemo<WeekDay[]>(() => {
    const start = startOfWeek(selected, { weekStartsOn: getWeekStartsOn() });
    const today = startOfDay(new Date()).getTime();
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      const offset = Math.round((date.getTime() - today) / 86_400_000);
      const total = offset % 3 === 0 ? 5 : 4;
      const done = offset < 0 ? (offset % 2 === 0 ? total : total - 1) : offset === 0 ? 2 : 0;
      return { date, total, done, handled: done };
    });
  }, [selected]);

  const openSheet = (s: SheetState) => {
    setSheet(s);
    setOpen(true);
  };
  const mockSave = (label: string) => async () => {
    await new Promise((r) => setTimeout(r, 600));
    pending.current = label;
    return true;
  };

  const onRowAction = React.useCallback(
    (action: DoseRowAction, entry: DoseEntry) => {
      if (action === 'open') {
        openSheet({
          dose: entry.dose,
          log: entry.log,
          medication: m.medsById.get(entry.dose.medicationId) ?? null,
        });
        return;
      }
      toast.show({
        title: `${action}: ${entry.dose.medicationName}`,
        tone: action === 'take' ? 'success' : 'default',
        action: { label: i18n.t('ui.common.undo'), onPress: () => {} },
      });
    },
    [m, toast]
  );

  const groups = groupEntries(m.entries);
  const stats = computeDayStats(m.entries);
  const allStatuses = [...m.entries, m.missed];

  const cards: { label: string; kind: DayKind; stats: DayStats; first?: Date }[] = [
    { label: 'Today (live mock)', kind: 'today', stats },
    {
      label: 'Next up',
      kind: 'today',
      stats: statsOf({
        total: 5,
        taken: 2,
        done: 2,
        handled: 2,
        next: m.entries.find((e) => e.status === 'upcoming') ?? null,
      }),
    },
    {
      label: 'Due now',
      kind: 'today',
      stats: statsOf({
        total: 4,
        taken: 1,
        done: 1,
        handled: 1,
        due: m.entries.find((e) => e.status === 'due') ?? null,
      }),
    },
    {
      label: 'Late',
      kind: 'today',
      stats: statsOf({ total: 5, taken: 3, done: 3, handled: 3, late: 1 }),
    },
    {
      label: 'All done',
      kind: 'today',
      stats: statsOf({ total: 4, taken: 3, skipped: 1, done: 3, handled: 4 }),
    },
    {
      label: 'Past, not logged',
      kind: 'past',
      stats: statsOf({ total: 4, taken: 2, done: 2, handled: 2, missed: 2 }),
    },
    {
      label: 'Past, all logged',
      kind: 'past',
      stats: statsOf({ total: 3, taken: 3, done: 3, handled: 3 }),
    },
    { label: 'Future', kind: 'future', stats: statsOf({ total: 5 }), first: m.d.tomorrow.time },
  ];

  const sheetButtons: { label: string; state: SheetState }[] = [
    {
      label: 'Unlogged · early (due in 45 min)',
      state: { dose: m.d.early, log: null, medication: m.medsById.get('m7')! },
    },
    {
      label: 'Unlogged · due now',
      state: { dose: m.d.due, log: null, medication: m.medsById.get('m6')! },
    },
    {
      label: 'Unlogged · 45 min late + running low (days)',
      state: { dose: m.d.lateWarn, log: null, medication: m.medsById.get('m5')! },
    },
    {
      label: 'Unlogged · 3 h late → Take now shows overlap',
      state: { dose: m.d.lateDanger, log: null, medication: m.medsById.get('m4')! },
    },
    {
      label: 'Overlap step (swipe-to-take path)',
      state: {
        dose: m.d.lateDanger,
        log: null,
        medication: m.medsById.get('m4')!,
        initialStep: 'overlap',
      },
    },
    {
      label: 'Unlogged · tomorrow',
      state: { dose: m.d.tomorrow, log: null, medication: m.medsById.get('m1')! },
    },
    {
      label: 'Logged · taken',
      state: { dose: m.d.taken, log: m.l.taken, medication: m.medsById.get('m1')! },
    },
    {
      label: 'Logged · partial (with note)',
      state: { dose: m.d.partial, log: m.l.partial, medication: m.medsById.get('m2')! },
    },
    {
      label: 'Logged · skipped',
      state: { dose: m.d.skipped, log: m.l.skipped, medication: m.medsById.get('m3')! },
    },
  ];

  let rowIndex = 0;

  return (
    <Screen
      header={
        <NavHeader
          title="Today preview"
          right={
            <IconButton
              icon={isDark ? Sun : Moon}
              accessibilityLabel="Toggle colour scheme"
              onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
            />
          }
        />
      }>
      <ChipRow>
        {(['en', 'nl', 'tr'] as const).map((l) => (
          <Chip
            key={l}
            label={l.toUpperCase()}
            icon={Languages}
            selected={getCurrentLocale() === l}
            check
            onPress={() => setLocale(l)}
          />
        ))}
      </ChipRow>

      <TabHeader
        overline={formatLongDate(selected)}
        onOverlinePress={() => {}}
        title={formatDayLabel(selected)}
        right={
          <>
            <Button
              label={i18n.t('ui.common.today')}
              variant="secondary"
              size="sm"
              onPress={() => setSelected(startOfDay(new Date()))}
            />
            <IconButton icon={CalendarDays} accessibilityLabel="Calendar" onPress={() => {}} />
          </>
        }
      />
      <WeekStrip
        days={week}
        selected={selected}
        today={new Date()}
        onSelect={setSelected}
        onChangeWeek={(delta) => setSelected((d) => addDays(d, delta * 7))}
      />

      <Section title="Progress card variants">
        {cards.map((c) => (
          <View key={c.label} style={{ gap: 4 }}>
            <Text variant="footnote" tone="tertiary">
              {c.label}
            </Text>
            <ProgressCard stats={c.stats} dayKind={c.kind} firstTime={c.first} />
          </View>
        ))}
      </Section>

      <Section title="Grouped list (today)">
        {groups.map((g) => (
          <View key={g.part}>
            <SectionHeader
              icon={PART_ICON[g.part]}
              title={i18n.t(`ui.common.timeOfDay.${g.part === 'earlyNight' ? 'night' : g.part}`)}
              style={{ marginTop: 8 }}
            />
            <View style={{ gap: 10 }}>
              {g.entries.map((e) => (
                <DoseRow key={`${e.key}-${rowIndex++}`} entry={e} onAction={onRowAction} />
              ))}
            </View>
          </View>
        ))}
      </Section>

      <Section title="Every status">
        {allStatuses.map((e) => (
          <View key={`all-${e.key}`} style={{ gap: 4 }}>
            <Text variant="footnote" tone="tertiary">
              {e.status}
              {e.moved ? ' + moved' : ''}
            </Text>
            <DoseRow entry={e} onAction={onRowAction} />
          </View>
        ))}
      </Section>

      <AsNeededSection
        medications={m.prn}
        onLog={(id) => toast.show({ title: `→ /log/as-needed?medicationId=${id}` })}
      />

      <Section title="Dose sheet">
        {sheetButtons.map((b) => (
          <Button
            key={b.label}
            label={b.label}
            variant="secondary"
            fullWidth
            onPress={() => openSheet(b.state)}
          />
        ))}
      </Section>

      <Section title="Empty states">
        <EmptyState
          icon={Pill}
          title={i18n.t('ui.today.empty.noMedsTitle')}
          message={i18n.t('ui.today.empty.noMedsMessage')}
          action={{ label: i18n.t('ui.today.empty.noMedsAction'), icon: Plus, onPress: () => {} }}
        />
        <EmptyState
          compact
          icon={Sun}
          tone="success"
          title={i18n.t('ui.today.empty.nothingTitle')}
          message={i18n.t('ui.today.empty.nothingToday')}
        />
        <EmptyState
          compact
          icon={CalendarDays}
          title={i18n.t('ui.today.empty.nothingTitle')}
          message={i18n.t('ui.today.empty.nothingOther')}
        />
      </Section>

      <DoseSheet
        visible={open}
        onClose={() => setOpen(false)}
        onDismissed={() => {
          if (pending.current) toast.show({ title: pending.current, tone: 'success' });
          pending.current = null;
        }}
        dose={sheet?.dose ?? null}
        medication={sheet?.medication ?? null}
        log={sheet?.log ?? null}
        initialStep={sheet?.initialStep}
        onLog={async (req) =>
          mockSave(
            `Logged ${req.action} (${req.amount}) at ${req.at}${req.notes ? ` · “${req.notes}”` : ''}`
          )()
        }
        onRescheduleAndLog={async (time, req) =>
          mockSave(`Moved next dose to ${format(time, 'Pp')} and logged ${req.action}`)()
        }
        onUpdate={async (req) => mockSave(`Changed to ${req.action} (${req.amount})`)()}
        onUndo={mockSave('Undone')}
      />
    </Screen>
  );
}
