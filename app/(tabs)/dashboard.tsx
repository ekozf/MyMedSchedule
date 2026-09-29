/**
 * Today (docs/DESIGN.md §4.2): header with date + calendar jump, week strip, progress card,
 * doses grouped by time of day (swipe to take / skip, tap for the dose sheet), as-needed shortcuts.
 */
import * as React from 'react';
import { RefreshControl, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useLogsVersion } from '@/lib/ui/data-refresh';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { CalendarDays, Moon, Pill, Plus, Sun, Sunrise, Sunset, X } from 'lucide-react-native';
import { addDays, addWeeks, isAfter, isBefore, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import i18n from '@/lib/i18n';
import {
  Button,
  CalendarSheet,
  EmptyState,
  IconButton,
  Screen,
  SectionHeader,
  TabHeader,
  Text,
  getWeekStartsOn,
  haptics,
  useTheme,
  useToast,
  type DayDotTone,
  type ToastOptions,
} from '@/components/ds';
import { formatDayLabel, formatLongDate, formatShortDate, useTimeFormat } from '@/lib/ui/format';
import { getIntakeLogsByProfile } from '@/lib/db/operations';
import { getAllDosesForDate, type ScheduledDose } from '@/lib/schedule/calculator';
import { useStore } from '@/store';
import type { IntakeLog, Medication } from '@/types';
import { WeekStrip, type WeekDay } from '@/components/today/WeekStrip';
import { ProgressCard, type DayKind } from '@/components/today/ProgressCard';
import { DoseRow, type DoseRowAction } from '@/components/today/DoseRow';
import { AsNeededSection } from '@/components/today/AsNeededSection';
import { DoseSheet } from '@/components/today/DoseSheet';
import { useDoseActions } from '@/components/today/useDoseActions';
import {
  buildEntries,
  computeDayStats,
  computeLateOverlap,
  dayProgress,
  groupEntries,
  indexLogs,
  isLogged,
  logsForDay,
  type DayPart,
  type DoseEntry,
} from '@/components/today/logic';

const PART_ICON = {
  earlyNight: Moon,
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
} as const;

function partLabel(part: DayPart): string {
  const key = part === 'earlyNight' ? 'night' : part;
  return i18n.t(`ui.common.timeOfDay.${key}`);
}

interface SheetTarget {
  /** DoseEntry key (medicationId + scheduled time); guards double logging. */
  key: string;
  dose: ScheduledDose;
  log: IntakeLog | null;
  medication: Medication | null;
  initialStep: 'main' | 'overlap';
}

export default function TodayScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const { formatTime } = useTimeFormat();
  const profileId = useStore((s) => s.activeProfile?.id ?? null);
  const medications = useStore((s) => s.medications);
  const loadMedications = useStore((s) => s.loadMedications);

  const [selectedDate, setSelectedDate] = React.useState(() => startOfDay(new Date()));
  const [allLogs, setAllLogs] = React.useState<IntakeLog[]>([]);
  const [now, setNow] = React.useState(() => new Date());
  const [refreshing, setRefreshing] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [sheetTarget, setSheetTarget] = React.useState<SheetTarget | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const pendingToast = React.useRef<ToastOptions | null>(null);
  // Medicine to open once the dose sheet is gone ("Update supply").
  const pendingSupplyNav = React.useRef<string | null>(null);
  // Dose keys with a log/undo running (swipe or sheet): every other log path for them is ignored.
  const inFlight = React.useRef(new Set<string>());
  const guarded = React.useCallback(async <T,>(key: string, fn: () => Promise<T>, busy: T) => {
    if (inFlight.current.has(key)) return busy;
    inFlight.current.add(key);
    try {
      return await fn();
    } finally {
      inFlight.current.delete(key);
    }
  }, []);

  // --- data -----------------------------------------------------------------------------------
  const loadLogs = React.useCallback(async () => {
    if (!profileId) {
      setAllLogs([]);
      return;
    }
    try {
      setAllLogs(await getIntakeLogsByProfile(profileId));
    } catch (error) {
      console.error('Failed to load intake logs:', error);
    }
  }, [profileId]);

  // Reload on focus and whenever the active profile changes; keep the clock fresh while focused.
  useFocusEffect(
    React.useCallback(() => {
      if (profileId) {
        loadMedications(profileId);
        loadLogs();
      } else {
        setAllLogs([]);
      }
      setNow(new Date());
      const id = setInterval(() => setNow(new Date()), 30_000);
      return () => clearInterval(id);
    }, [profileId, loadMedications, loadLogs])
  );

  // Logs changed elsewhere (e.g. the /log/* sheets, which may not re-focus this tab when closed).
  const logsVersion = useLogsVersion();
  React.useEffect(() => {
    if (logsVersion > 0) loadLogs();
  }, [logsVersion, loadLogs]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      if (profileId) await loadMedications(profileId);
      await loadLogs();
      setNow(new Date());
    } catch (error) {
      console.error('Failed to refresh Today:', error);
    } finally {
      setRefreshing(false);
    }
  }, [profileId, loadMedications, loadLogs]);

  const actions = useDoseActions({ profileId, reloadLogs: loadLogs });

  // --- derived --------------------------------------------------------------------------------
  const today = startOfDay(now);
  const todayKey = today.getTime();
  const isToday = isSameDay(selectedDate, now);
  const dayKind: DayKind = isToday ? 'today' : isBefore(selectedDate, today) ? 'past' : 'future';

  const medsById = React.useMemo(
    () => new Map(medications.map((m) => [m.id, m] as const)),
    [medications]
  );
  const logIndex = React.useMemo(() => indexLogs(allLogs), [allLogs]);
  const dayIndex = React.useMemo(
    () => indexLogs(logsForDay(allLogs, selectedDate)),
    [allLogs, selectedDate]
  );
  const doses = React.useMemo(
    () => getAllDosesForDate(medications, selectedDate),
    [medications, selectedDate]
  );
  const entries = React.useMemo(
    () => buildEntries(doses, dayIndex, medsById, now),
    [doses, dayIndex, medsById, now]
  );
  const groups = React.useMemo(() => groupEntries(entries), [entries]);
  const stats = React.useMemo(() => computeDayStats(entries), [entries]);
  const asNeeded = React.useMemo(
    () => medications.filter((m) => m.isActive && m.isPrn),
    [medications]
  );

  const weekStartsOn = getWeekStartsOn();
  const weekStartKey = startOfWeek(selectedDate, { weekStartsOn }).getTime();
  const week = React.useMemo<WeekDay[]>(() => {
    const start = new Date(weekStartKey);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      const p = dayProgress(getAllDosesForDate(medications, date), logIndex, now);
      return { date, total: p.total, done: p.done, handled: p.handled };
    });
    // `now` only matters per day; recompute when the day changes, not every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartKey, medications, logIndex, todayKey]);

  // Calendar dots (computed lazily per visible day, cached until data changes).
  const dotCache = React.useMemo(
    () => new Map<number, DayDotTone>(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [medications, logIndex, todayKey]
  );
  const renderDayDot = React.useCallback(
    (d: Date): DayDotTone => {
      if (isAfter(startOfDay(d), new Date(todayKey))) return null;
      const key = startOfDay(d).getTime();
      if (dotCache.has(key)) return dotCache.get(key) ?? null;
      const p = dayProgress(getAllDosesForDate(medications, d), logIndex, new Date());
      const tone: DayDotTone =
        p.total === 0 ? null : p.handled >= p.total ? 'success' : p.overdue > 0 ? 'warning' : null;
      dotCache.set(key, tone);
      return tone;
    },
    [dotCache, medications, logIndex, todayKey]
  );

  // --- toasts ---------------------------------------------------------------------------------
  const logToast = React.useCallback(
    (log: IntakeLog, name: string, message?: string): ToastOptions => ({
      title: i18n.t(
        log.action === 'taken'
          ? 'ui.today.toast.taken'
          : log.action === 'partial'
            ? 'ui.today.toast.partial'
            : 'ui.today.toast.skipped',
        { name }
      ),
      message,
      tone: log.action === 'skipped' ? 'default' : 'success',
      icon: log.action === 'skipped' ? X : undefined,
      action: { label: i18n.t('ui.common.undo'), onPress: () => void actions.undo(log) },
    }),
    [actions]
  );

  const removedToast = React.useCallback(
    (log: IntakeLog, name: string, unit: string): ToastOptions => ({
      title: i18n.t('ui.today.toast.removed', { name }),
      action: {
        label: i18n.t('ui.common.undo'),
        onPress: async () => {
          if (await actions.restore(log, unit))
            toast.show({ title: i18n.t('ui.today.toast.restored'), tone: 'success' });
        },
      },
    }),
    [actions, toast]
  );

  // --- sheet ----------------------------------------------------------------------------------
  const openSheet = React.useCallback(
    (entry: DoseEntry, initialStep: 'main' | 'overlap' = 'main') => {
      // A swipe is logging this dose right now: the sheet would offer a second log.
      if (inFlight.current.has(entry.key)) return;
      setSheetTarget({
        key: entry.key,
        dose: entry.dose,
        log: entry.log,
        medication: medsById.get(entry.dose.medicationId) ?? null,
        initialStep,
      });
      setSheetOpen(true);
    },
    [medsById]
  );
  const closeSheet = React.useCallback(() => setSheetOpen(false), []);
  const onSheetDismissed = React.useCallback(() => {
    const t = pendingToast.current;
    pendingToast.current = null;
    if (t) toast.show(t);
    const medId = pendingSupplyNav.current;
    pendingSupplyNav.current = null;
    if (medId) router.push({ pathname: '/medication/[id]', params: { id: medId } });
  }, [toast]);
  const onUpdateSupply = React.useCallback(() => {
    const medId = sheetTarget?.dose.medicationId;
    if (!medId) return;
    pendingSupplyNav.current = medId;
    setSheetOpen(false);
  }, [sheetTarget]);

  const sheetHandlers = React.useMemo(() => {
    const target = sheetTarget;
    const name = target?.dose.medicationName ?? '';
    return {
      onLog: (req: Parameters<typeof actions.logDose>[2]) => {
        if (!target) return Promise.resolve(false);
        return guarded(
          target.key,
          async () => {
            const log = await actions.logDose(target.dose, target.medication, req);
            // Logged elsewhere meanwhile: the sheet is stale, close it.
            if (!log) return actions.hasLog(target.dose);
            pendingToast.current = logToast(log, name);
            return true;
          },
          false
        );
      },
      onRescheduleAndLog: async (
        time: Date,
        req: Parameters<typeof actions.rescheduleAndLog>[3]
      ) => {
        if (!target) return false;
        const log = await guarded(
          target.key,
          () => actions.rescheduleAndLog(target.dose, target.medication, time, req),
          null
        );
        if (!log) return actions.hasLog(target.dose);
        pendingToast.current = logToast(
          log,
          name,
          i18n.t('ui.today.toast.moved', {
            when: isSameDay(time, new Date())
              ? formatTime(time)
              : `${formatShortDate(time)}, ${formatTime(time)}`,
          })
        );
        return true;
      },
      onUpdate: async (req: Parameters<typeof actions.updateLog>[1]) => {
        if (!target?.log) return false;
        const ok = await actions.updateLog(target.log, req, target.dose.dosageUnit);
        if (ok) pendingToast.current = { title: i18n.t('ui.today.toast.updated'), tone: 'success' };
        return ok;
      },
      onUndo: async () => {
        if (!target?.log) return false;
        const log = target.log;
        const ok = await actions.undo(log);
        if (ok) pendingToast.current = removedToast(log, name, target.dose.dosageUnit);
        return ok;
      },
    };
  }, [sheetTarget, actions, logToast, removedToast, formatTime, guarded]);

  // --- row actions (one stable callback; latest logic via ref) --------------------------------
  const rowActionRef = React.useRef<(action: DoseRowAction, entry: DoseEntry) => void>(() => {});
  rowActionRef.current = (action, entry) => {
    if (action === 'open') {
      openSheet(entry);
      return;
    }
    if (inFlight.current.has(entry.key)) return;
    const { dose } = entry;
    // Doses on a later day are view-only (the row hides these actions too).
    if (action !== 'undo' && startOfDay(dose.time).getTime() > startOfDay(new Date()).getTime())
      return;
    const run = (fn: () => Promise<void>) => guarded(entry.key, fn, undefined);
    const medication = medsById.get(dose.medicationId) ?? null;
    if (action === 'take') {
      // Same path as "Take now": late-overlap question first (in the sheet), then safety + log.
      if (computeLateOverlap(medication, dose, new Date(), 'taken')) {
        openSheet(entry, 'overlap');
        return;
      }
      run(async () => {
        const log = await actions.logDose(dose, medication, {
          action: 'taken',
          amount: dose.dosageAmount,
          at: 'now',
        });
        if (log) toast.show(logToast(log, dose.medicationName));
      });
    } else if (action === 'skip') {
      run(async () => {
        const log = await actions.logDose(dose, medication, {
          action: 'skipped',
          amount: dose.dosageAmount,
          at: 'now',
        });
        if (log) toast.show(logToast(log, dose.medicationName));
      });
    } else if (action === 'undo' && entry.log) {
      const log = entry.log;
      run(async () => {
        if (await actions.undo(log))
          toast.show(removedToast(log, dose.medicationName, dose.dosageUnit));
      });
    }
  };
  const onRowAction = React.useCallback(
    (action: DoseRowAction, entry: DoseEntry) => rowActionRef.current(action, entry),
    []
  );

  // --- navigation -----------------------------------------------------------------------------
  const goToday = () => {
    haptics.tap();
    setSelectedDate(startOfDay(new Date()));
  };
  const selectDay = React.useCallback((d: Date) => setSelectedDate(startOfDay(d)), []);
  const changeWeek = React.useCallback(
    (delta: 1 | -1) => setSelectedDate((d) => addWeeks(d, delta)),
    []
  );

  // --- render ---------------------------------------------------------------------------------
  const noMedicines = medications.length === 0;
  const dayKey = selectedDate.getTime();
  const enter = (i: number) =>
    reduceMotion ? undefined : FadeInDown.delay(Math.min(i, 8) * 20).duration(260);
  let rowIndex = 0;

  return (
    <Screen
      bottomInset="tabBar"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surfaceSolid}
        />
      }>
      <TabHeader
        overline={formatLongDate(selectedDate)}
        onOverlinePress={() => setCalendarOpen(true)}
        overlineAccessibilityLabel={`${formatLongDate(selectedDate)}. ${i18n.t('ui.today.a11y.chooseDay')}`}
        title={formatDayLabel(selectedDate)}
        right={
          <>
            {!isToday ? (
              <Animated.View
                entering={reduceMotion ? undefined : FadeIn.duration(180)}
                exiting={reduceMotion ? undefined : FadeOut.duration(140)}>
                <Button
                  label={i18n.t('ui.common.today')}
                  accessibilityLabel={i18n.t('ui.today.a11y.goToToday')}
                  variant="secondary"
                  size="sm"
                  haptic="none"
                  onPress={goToday}
                />
              </Animated.View>
            ) : null}
            <IconButton
              icon={CalendarDays}
              accessibilityLabel={i18n.t('ui.today.a11y.chooseDay')}
              haptic="tap"
              onPress={() => setCalendarOpen(true)}
            />
          </>
        }
      />

      {noMedicines ? (
        <EmptyState
          icon={Pill}
          title={i18n.t('ui.today.empty.noMedsTitle')}
          message={i18n.t('ui.today.empty.noMedsMessage')}
          action={{
            label: i18n.t('ui.today.empty.noMedsAction'),
            icon: Plus,
            onPress: () => router.push('/medication/add'),
          }}
          style={{ marginTop: 24 }}
        />
      ) : (
        <>
          <WeekStrip
            days={week}
            selected={selectedDate}
            today={now}
            onSelect={selectDay}
            onChangeWeek={changeWeek}
          />

          <View key={dayKey} style={{ marginTop: 12 }}>
            {entries.length > 0 ? (
              <Animated.View entering={enter(0)}>
                <ProgressCard stats={stats} dayKind={dayKind} firstTime={entries[0]?.dose.time} />
              </Animated.View>
            ) : (
              <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(220)}>
                <EmptyState
                  compact
                  icon={isToday ? Sun : CalendarDays}
                  tone={isToday ? 'success' : 'accent'}
                  title={i18n.t('ui.today.empty.nothingTitle')}
                  message={i18n.t(
                    isToday ? 'ui.today.empty.nothingToday' : 'ui.today.empty.nothingOther'
                  )}
                />
              </Animated.View>
            )}

            {groups.map((group) => {
              const done = group.entries.filter((e) => isLogged(e.status)).length;
              return (
                <View key={group.part}>
                  <SectionHeader
                    icon={PART_ICON[group.part]}
                    title={partLabel(group.part)}
                    right={
                      dayKind !== 'future' ? (
                        <Text variant="footnote" tone="tertiary" tabular>
                          {done}/{group.entries.length}
                        </Text>
                      ) : null
                    }
                  />
                  <View style={{ gap: 10 }}>
                    {group.entries.map((entry) => (
                      <Animated.View
                        key={entry.key}
                        entering={enter(++rowIndex)}
                        layout={
                          reduceMotion ? undefined : LinearTransition.springify().damping(18)
                        }>
                        <DoseRow
                          entry={entry}
                          onAction={onRowAction}
                          readOnly={dayKind === 'future'}
                        />
                      </Animated.View>
                    ))}
                  </View>
                </View>
              );
            })}

            <View style={{ marginTop: 8 }}>
              <AsNeededSection
                medications={asNeeded}
                onLog={(medicationId) =>
                  router.push({ pathname: '/log/as-needed', params: { medicationId } })
                }
              />
            </View>
          </View>
        </>
      )}

      <CalendarSheet
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        value={selectedDate}
        onChange={selectDay}
        renderDayDot={renderDayDot}
        title={i18n.t('ui.today.a11y.calendarTitle')}
      />

      <DoseSheet
        visible={sheetOpen}
        onClose={closeSheet}
        onDismissed={onSheetDismissed}
        dose={sheetTarget?.dose ?? null}
        medication={sheetTarget?.medication ?? null}
        log={sheetTarget?.log ?? null}
        initialStep={sheetTarget?.initialStep}
        onUpdateSupply={onUpdateSupply}
        {...sheetHandlers}
      />
    </Screen>
  );
}
