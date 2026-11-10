/**
 * Today (docs/DESIGN.md §5.2): date row with the day picker, greeting and status line, the 2×2
 * pill-box tray (compartments from the profile's boundaries), "Up next" (a compact banner when a dose
 * is due, else a "Next: …" row), "When you need it" rows, and the compartment / as-needed sheets.
 * Pull to refresh. A tapped dose reminder lands here with that dose's compartment open (see
 * `lib/notifications/handlers.ts`). Reminders: an "Allow reminders?" sheet before the OS dialog
 * once a scheduled medicine exists, and a "Reminders are off" banner while the phone blocks them.
 * A supply count too low for a dose asks "Log anyway" / "Update supply first" (the supply sheet
 * opens here).
 */
import * as React from 'react';
import { RefreshControl, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { isBefore, isSameDay, startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import {
  Button,
  CalendarSheet,
  EmptyState,
  Screen,
  Text,
  useTheme,
  useToast,
  type ToastOptions,
} from '@/components/ds';
import { useLogsVersion } from '@/lib/ui/data-refresh';
import { formatDose, formatShortDate, useTimeFormat } from '@/lib/ui/format';
import { undoIntakeLog } from '@/lib/ui/dose-actions';
import { haptics } from '@/lib/ui/haptics';
import { getIntakeLogsByProfile } from '@/lib/db/operations';
import { getAllDosesForDate } from '@/lib/schedule/calculator';
import { compartmentFor, useCompartmentBoundaries } from '@/lib/settings/compartments';
import {
  subscribeTodayFocus,
  takePendingTodayFocus,
  todayFocusFromData,
  type TodayFocus,
} from '@/lib/notifications/handlers';
import { useStore } from '@/store';
import type { CompartmentId, IntakeLog, Medication } from '@/types';
import { saveSupply } from '@/components/medicines/actions';
import { SupplySheet } from '@/components/medicines/SupplySheet';
import { requestNotificationPermissions } from '@/lib/notifications/permissions';
import {
  scheduleNotificationsForMedication,
  scheduleRefillReminder,
} from '@/lib/notifications/scheduler';
import {
  notifyPermissionChanged,
  openAppSettings,
  reminderPrompt,
  useNotificationPermission,
} from '@/lib/notifications/use-permission';
import { ReminderPermissionSheet } from '@/components/today/ReminderPermissionSheet';
import { RemindersOffBanner } from '@/components/today/RemindersOffBanner';
import { TodayHeader } from '@/components/today/TodayHeader';
import { Tray } from '@/components/today/Tray';
import { UpNext } from '@/components/today/UpNextCard';
import { AsNeededList, type AsNeededItem } from '@/components/today/AsNeededList';
import { AsNeededDoseSheet } from '@/components/today/AsNeededDoseSheet';
import {
  CompartmentSheet,
  type CompartmentSheetFocus,
  type CompartmentSheetHandlers,
} from '@/components/today/CompartmentSheet';
import { useDoseActions } from '@/components/today/useDoseActions';
import { doseName } from '@/components/today/names';
import { medicineDisplayName, nextUnloggedDose } from '@/components/medicines/medicine-info';
import {
  buildEntries,
  computeDayStats,
  computeLateOverlap,
  doseKey,
  groupByCompartment,
  indexLogs,
  laterWhen,
  logsForDay,
  nowCompartment,
  sortEntries,
  statusLine,
  upNext,
  type DayKind,
  type DoseEntry,
  type LaterDose,
} from '@/components/today/logic';
import type { UpNextLater } from '@/components/today/UpNextCard';

/** Where to go once a sheet has animated away. */
type AfterSheet =
  | { kind: 'medicine'; id: string }
  | { kind: 'pastDose'; medicationId: string }
  | { kind: 'supply'; id: string }
  | null;

export default function TodayScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { formatTime } = useTimeFormat();
  const profileId = useStore((s) => s.activeProfile?.id ?? null);
  const profileName = useStore((s) => s.activeProfile?.name);
  const medications = useStore((s) => s.medications);
  const loadMedications = useStore((s) => s.loadMedications);
  const { boundaries } = useCompartmentBoundaries();

  const [selectedDate, setSelectedDate] = React.useState(() => startOfDay(new Date()));
  const [allLogs, setAllLogs] = React.useState<IntakeLog[]>([]);
  // Logs loaded at least once for this profile (so the first-use hint doesn't flash).
  const [logsLoaded, setLogsLoaded] = React.useState(false);
  const [now, setNow] = React.useState(() => new Date());
  const [refreshing, setRefreshing] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const [sheetId, setSheetId] = React.useState<CompartmentId | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetFocus, setSheetFocus] = React.useState<CompartmentSheetFocus | null>(null);

  const [prnMed, setPrnMed] = React.useState<Medication | null>(null);
  const [prnOpen, setPrnOpen] = React.useState(false);

  const [upNextBusy, setUpNextBusy] = React.useState(false);
  const afterSheet = React.useRef<AfterSheet>(null);

  const [supplyMedId, setSupplyMedId] = React.useState<string | null>(null);
  const [supplyOpen, setSupplyOpen] = React.useState(false);
  const supplyMed = supplyMedId ? (medications.find((m) => m.id === supplyMedId) ?? null) : null;

  const permission = useNotificationPermission();
  const [askReminders, setAskReminders] = React.useState(false);

  // Dose keys with a log/undo running: every other log path for them is ignored.
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
      setLogsLoaded(false);
      return;
    }
    try {
      setAllLogs(await getIntakeLogsByProfile(profileId));
      setLogsLoaded(true);
    } catch (error) {
      console.error('Failed to load intake logs:', error);
    }
  }, [profileId]);

  // Reminder deep link: the dose to show once data is there.
  const [deepFocus, setDeepFocus] = React.useState<TodayFocus | null>(null);
  const isFocused = React.useRef(false);

  // Reload on focus and whenever the active profile changes; keep the clock fresh while focused.
  useFocusEffect(
    React.useCallback(() => {
      isFocused.current = true;
      if (profileId) {
        loadMedications(profileId);
        loadLogs();
      } else {
        setAllLogs([]);
      }
      setNow(new Date());
      const pending = takePendingTodayFocus();
      if (pending) setDeepFocus(pending);
      const id = setInterval(() => setNow(new Date()), 30_000);
      return () => {
        isFocused.current = false;
        clearInterval(id);
      };
    }, [profileId, loadMedications, loadLogs])
  );

  // A reminder tapped while Today is already showing.
  React.useEffect(
    () =>
      subscribeTodayFocus(() => {
        if (!isFocused.current) return; // read on the next focus instead
        const pending = takePendingTodayFocus();
        if (pending) setDeepFocus(pending);
      }),
    []
  );

  // Cold start from a reminder: the response may arrive before the listener was registered.
  React.useEffect(() => {
    try {
      const last = Notifications.getLastNotificationResponse();
      if (last && last.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        const focus = todayFocusFromData(last.notification.request.content.data);
        Notifications.clearLastNotificationResponse();
        if (focus) setDeepFocus(focus);
      }
    } catch {
      // Not available (web / tests): nothing to do.
    }
  }, []);

  // Logs changed elsewhere (e.g. the /log/* routes, which may not re-focus this tab).
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

  // "Update supply first": close whichever sheet is open, then show the supply sheet.
  const openSupplyRef = React.useRef<(medicationId: string) => void>(() => {});
  const onUpdateSupplyFirst = React.useCallback((id: string) => openSupplyRef.current(id), []);
  const actions = useDoseActions({
    profileId,
    reloadLogs: loadLogs,
    onUpdateSupply: onUpdateSupplyFirst,
  });

  // --- derived --------------------------------------------------------------------------------
  const today = startOfDay(now);
  const isToday = isSameDay(selectedDate, now);
  const dayKind: DayKind = isToday ? 'today' : isBefore(selectedDate, today) ? 'past' : 'future';

  const medsById = React.useMemo(
    () => new Map(medications.map((m) => [m.id, m] as const)),
    [medications]
  );
  const dayIndex = React.useMemo(
    () => indexLogs(logsForDay(allLogs, selectedDate)),
    [allLogs, selectedDate]
  );
  const entries = React.useMemo(
    () =>
      sortEntries(
        buildEntries(getAllDosesForDate(medications, selectedDate), dayIndex, medsById, now)
      ),
    [medications, selectedDate, dayIndex, medsById, now]
  );
  const groups = React.useMemo(
    () => groupByCompartment(entries, boundaries),
    [entries, boundaries]
  );
  const stats = React.useMemo(() => computeDayStats(entries), [entries]);
  const nowId = nowCompartment(groups, now, boundaries, isToday);
  const next = upNext(entries, isToday);
  const sheetGroup = sheetId ? (groups.find((g) => g.id === sheetId) ?? null) : null;

  // Today has no doses but scheduled medicines exist (e.g. one added after its times passed):
  // point at the first dose on a later day instead of "Nothing planned today."
  const laterDose = React.useMemo(() => {
    if (!isToday || entries.length > 0) return null;
    let best: ReturnType<typeof nextUnloggedDose> = null;
    for (const m of medications) {
      const d = nextUnloggedDose(m, allLogs, now);
      if (d && (!best || d.time.getTime() < best.time.getTime())) best = d;
    }
    return best;
  }, [isToday, entries.length, medications, allLogs, now]);
  const later = React.useMemo<(LaterDose & UpNextLater) | null>(() => {
    if (!laterDose) return null;
    const med = medsById.get(laterDose.medicationId);
    return {
      dose: laterDose,
      name: med ? medicineDisplayName(med) : laterDose.medicationName,
      when: laterWhen(laterDose.time, now, formatTime),
      first: !allLogs.some((l) => l.medicationId === laterDose.medicationId),
    };
  }, [laterDose, medsById, now, formatTime, allLogs]);

  // As-needed medicines with today's count and their last log.
  const prnItems = React.useMemo<AsNeededItem[]>(() => {
    const todays = logsForDay(allLogs, now);
    return medications
      .filter((m) => m.isActive && m.isPrn)
      .map((m) => {
        const mine = todays.filter((l) => l.medicationId === m.id && l.action !== 'skipped');
        const last = mine.reduce<Date | null>((acc, l) => {
          const t = new Date(l.actualTime);
          return !acc || t > acc ? t : acc;
        }, null);
        return { medication: m, takenToday: mine.length, lastAt: last };
      });
    // `now` matters per day only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medications, allLogs, today.getTime()]);
  const prnTodayLogs = React.useMemo(
    () => (prnMed ? logsForDay(allLogs, now).filter((l) => l.medicationId === prnMed.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prnMed, allLogs, today.getTime()]
  );
  const prnLastLog = React.useMemo(() => {
    if (!prnMed) return null;
    let last: IntakeLog | null = null;
    for (const l of allLogs) {
      if (l.medicationId !== prnMed.id || l.action === 'skipped') continue;
      if (!last || new Date(l.actualTime) > new Date(last.actualTime)) last = l;
    }
    return last;
  }, [prnMed, allLogs]);

  // Calendar: days with something logged get a dot.
  const loggedDays = React.useMemo(() => {
    const set = new Set<number>();
    for (const l of allLogs) {
      const t = l.scheduledTime ? new Date(l.scheduledTime) : new Date(l.actualTime);
      set.add(startOfDay(t).getTime());
    }
    return set;
  }, [allLogs]);
  const hasEntries = React.useCallback(
    (d: Date) => loggedDays.has(startOfDay(d).getTime()),
    [loggedDays]
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
            toast.show({ title: i18n.t('ui.today.toast.restored') });
        },
      },
    }),
    [actions, toast]
  );

  // --- after a sheet / supply ----------------------------------------------------------------
  function runAfterSheet(next: AfterSheet) {
    if (next?.kind === 'medicine') {
      router.push({ pathname: '/medication/[id]', params: { id: next.id } });
    } else if (next?.kind === 'pastDose') {
      router.push({ pathname: '/log/past', params: { medicationId: next.medicationId } });
    } else if (next?.kind === 'supply') {
      setSupplyMedId(next.id);
      setSupplyOpen(true);
    }
  }
  openSupplyRef.current = (id: string) => {
    if (sheetOpen || prnOpen) {
      afterSheet.current = { kind: 'supply', id };
      setSheetOpen(false);
      setPrnOpen(false);
    } else {
      setSupplyMedId(id);
      setSupplyOpen(true);
    }
  };

  // --- reminders permission -------------------------------------------------------------------
  const hasScheduled = medications.some((m) => m.isActive && !m.isPrn);
  React.useEffect(() => {
    if (permission.state === 'undetermined' && hasScheduled && !reminderPrompt.dismissed) {
      setAskReminders(true);
    }
  }, [permission.state, hasScheduled]);
  const reminderTimes = React.useMemo(() => {
    const todays = sortEntries(
      buildEntries(getAllDosesForDate(medications, today), new Map(), medsById, now)
    );
    return [...new Set(todays.map((e) => formatTime(e.dose.time)))];
    // Only the day matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medications, today.getTime(), formatTime]);
  // "Turn on": not asked yet → "Allow reminders?" then the OS dialog; blocked → phone settings.
  const turnOnReminders = () => {
    if (permission.state === 'undetermined') setAskReminders(true);
    else void openAppSettings();
  };
  const onReminderAnswer = async (allow: boolean) => {
    reminderPrompt.dismiss();
    if (!allow) return;
    try {
      const granted = await requestNotificationPermissions({ prompt: true });
      if (granted) {
        // Plan (again) now that the channel exists and reminders can show.
        for (const m of medications) {
          if (!m.isActive) continue;
          if (!m.isPrn) await scheduleNotificationsForMedication(m);
          await scheduleRefillReminder(m);
        }
      }
    } catch (error) {
      console.warn('Failed to ask for notification permission:', error);
    }
    notifyPermissionChanged();
  };

  // --- compartment sheet ----------------------------------------------------------------------
  const openCompartment = React.useCallback(
    (id: CompartmentId, focus: CompartmentSheetFocus | null = null) => {
      setSheetId(id);
      setSheetFocus(focus);
      setSheetOpen(true);
    },
    []
  );
  const closeSheet = React.useCallback(() => setSheetOpen(false), []);

  // A dose logged inside the open compartment sheet already shows its status and Undo there, so
  // its toast waits until the sheet closes (only when exactly one dose was logged and not undone).
  const sheetOpenRef = React.useRef(false);
  sheetOpenRef.current = sheetOpen;
  const sheetToasts = React.useRef<{ logId: string; toast: ToastOptions }[]>([]);
  const showLogToast = React.useCallback(
    (log: IntakeLog, options: ToastOptions) => {
      if (sheetOpenRef.current) sheetToasts.current.push({ logId: log.id, toast: options });
      else toast.show(options);
    },
    [toast]
  );

  const onSheetDismissed = React.useCallback(() => {
    setSheetFocus(null);
    const pending = sheetToasts.current;
    sheetToasts.current = [];
    if (pending.length === 1) toast.show(pending[0].toast);
    const next = afterSheet.current;
    afterSheet.current = null;
    runAfterSheet(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const onUpdateSupply = React.useCallback((medicationId: string) => {
    afterSheet.current = { kind: 'supply', id: medicationId };
    setSheetOpen(false);
  }, []);

  const handlers = React.useMemo<CompartmentSheetHandlers>(
    () => ({
      log: (entry, req) =>
        guarded(
          entry.key,
          async () => {
            const medication = medsById.get(entry.dose.medicationId) ?? null;
            const log = await actions.logDose(entry.dose, medication, req);
            // Logged elsewhere meanwhile: the rows already show the fresh state.
            if (!log) return actions.hasLog(entry.dose);
            showLogToast(log, logToast(log, doseName(entry, medsById)));
            return true;
          },
          false
        ),
      rescheduleAndLog: (entry, time, req) =>
        guarded(
          entry.key,
          async () => {
            const medication = medsById.get(entry.dose.medicationId) ?? null;
            const log = await actions.rescheduleAndLog(entry.dose, medication, time, req);
            if (!log) return actions.hasLog(entry.dose);
            showLogToast(
              log,
              logToast(
                log,
                doseName(entry, medsById),
                i18n.t('ui.today.toast.moved', {
                  when: isSameDay(time, new Date())
                    ? formatTime(time)
                    : `${formatShortDate(time)}, ${formatTime(time)}`,
                })
              )
            );
            return true;
          },
          false
        ),
      update: async (entry, req) => {
        if (!entry.log) return false;
        const ok = await actions.updateLog(entry.log, req, entry.dose.dosageUnit);
        // The open sheet already shows the changed status.
        if (ok && !sheetOpenRef.current) toast.show({ title: i18n.t('ui.today.toast.updated') });
        return ok;
      },
      undo: (entry) =>
        guarded(
          entry.key,
          async () => {
            const log = entry.log;
            if (!log) return false;
            // Undoing a dose just logged in this sheet is a plain take-back: no "Removed" toast.
            const justLogged = sheetToasts.current.some((t) => t.logId === log.id);
            const ok = await actions.undo(log);
            sheetToasts.current = sheetToasts.current.filter((t) => t.logId !== log.id);
            if (ok && !justLogged)
              toast.show(removedToast(log, doseName(entry, medsById), entry.dose.dosageUnit));
            return ok;
          },
          false
        ),
    }),
    [guarded, medsById, actions, toast, logToast, showLogToast, removedToast, formatTime]
  );

  // --- Up next --------------------------------------------------------------------------------
  const compartmentOf = React.useCallback(
    (entry: DoseEntry) => compartmentFor(entry.dose.time, boundaries),
    [boundaries]
  );
  const takeUpNext = async () => {
    if (!next || upNextBusy) return;
    const medication = medsById.get(next.dose.medicationId) ?? null;
    // Late with the next dose close: ask in the compartment sheet (keep schedule / move next).
    if (computeLateOverlap(medication, next.dose, new Date(), 'taken')) {
      openCompartment(compartmentOf(next), { key: next.key, panel: 'overlap' });
      return;
    }
    setUpNextBusy(true);
    try {
      await handlers.log(next, { action: 'taken', amount: next.dose.dosageAmount, at: 'now' });
    } finally {
      setUpNextBusy(false);
    }
  };

  // --- reminder deep link ---------------------------------------------------------------------
  React.useEffect(() => {
    if (!deepFocus || medications.length === 0) return;
    const time = new Date(deepFocus.scheduledTime);
    setDeepFocus(null);
    setCalendarOpen(false);
    setPrnOpen(false);
    setSelectedDate(startOfDay(time));
    openCompartment(compartmentFor(time, boundaries), {
      key: doseKey(deepFocus.medicationId, time),
      panel: null,
    });
  }, [deepFocus, medications.length, boundaries, openCompartment]);

  // --- as-needed sheet ------------------------------------------------------------------------
  const openPrn = (m: Medication) => {
    setPrnMed(m);
    setPrnOpen(true);
  };
  const onPrnDismissed = () => {
    const next = afterSheet.current;
    afterSheet.current = null;
    runAfterSheet(next);
  };
  const onPrnLogged = (m: Medication, log: IntakeLog, amount: number) => {
    setPrnOpen(false);
    loadLogs();
    toast.show({
      title: i18n.t('ui.today.asNeededSheet.logged', { name: medicineDisplayName(m) }),
      message: i18n.t('ui.today.asNeededSheet.loggedDetail', {
        amount: formatDose(amount, m.dosageUnit),
        time: formatTime(new Date(log.actualTime)),
      }),
      action: {
        label: i18n.t('ui.common.undo'),
        onPress: async () => {
          try {
            await undoIntakeLog(log);
            if (profileId) await loadMedications(profileId);
            await loadLogs();
            haptics.light();
            toast.show({ title: i18n.t('ui.today.asNeededSheet.undone') });
          } catch (error) {
            console.error('Failed to undo as-needed dose:', error);
            toast.show({ title: i18n.t('ui.safety.couldNotDelete') });
          }
        },
      },
    });
  };

  // --- navigation -----------------------------------------------------------------------------
  const goToday = () => setSelectedDate(startOfDay(new Date()));
  const selectDay = React.useCallback((d: Date) => setSelectedDate(startOfDay(d)), []);

  // --- render ---------------------------------------------------------------------------------
  const noMedicines = medications.length === 0;
  // First use: a scheduled medicine but nothing ever logged for this person, and a dose to take
  // in one of the shown day's compartments.
  const showFirstUseHint =
    logsLoaded && hasScheduled && allLogs.length === 0 && entries.some((e) => !e.log);

  return (
    <Screen
      bottomInset="tabBar"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.field}
        />
      }>
      <View style={{ gap: 20, paddingBottom: 24 }}>
        <TodayHeader
          date={selectedDate}
          now={now}
          name={profileName}
          status={statusLine(stats, dayKind, later)}
          onPickDay={() => setCalendarOpen(true)}
        />

        {noMedicines ? (
          <EmptyState
            title={i18n.t('ui.today.empty.noMedsTitle')}
            message={i18n.t('ui.today.empty.noMedsMessage')}
            action={{
              label: i18n.t('ui.today.empty.noMedsAction'),
              onPress: () => router.push('/medication/add'),
            }}
          />
        ) : (
          <>
            <View style={{ gap: 4 }}>
              <Tray
                groups={groups}
                medsById={medsById}
                nowId={nowId}
                onOpen={(id) => openCompartment(id)}
              />
              {showFirstUseHint ? (
                <Text variant="footnote" tone="secondary" align="center" style={{ marginTop: 8 }}>
                  {i18n.t('ui.today.tray.firstUseHint')}
                </Text>
              ) : null}
              {!isToday ? (
                <Button
                  label={i18n.t('ui.today.tray.backToToday')}
                  variant="quiet"
                  onPress={goToday}
                  style={{ marginTop: 4 }}
                />
              ) : null}
            </View>

            <UpNext
              entry={next}
              name={next ? doseName(next, medsById) : undefined}
              compartment={next ? compartmentOf(next) : null}
              now={now}
              later={later}
              busy={upNextBusy}
              onTake={takeUpNext}
              onOpen={() => {
                if (next) openCompartment(compartmentOf(next), { key: next.key, panel: null });
              }}
            />

            {hasScheduled &&
            isToday &&
            (permission.state === 'denied' ||
              (permission.state === 'undetermined' && !askReminders)) ? (
              <RemindersOffBanner
                blocked={permission.state === 'denied'}
                onTurnOn={turnOnReminders}
              />
            ) : null}

            <AsNeededList items={prnItems} onLog={openPrn} />
          </>
        )}
      </View>

      <CalendarSheet
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        value={selectedDate}
        onChange={selectDay}
        markedDays={hasEntries}
        title={i18n.t('ui.today.dayPicker.title')}
        footer={
          <Button
            label={i18n.t('ui.today.dayPicker.backToToday')}
            variant="quiet"
            onPress={() => {
              goToday();
              setCalendarOpen(false);
            }}
          />
        }
      />

      <CompartmentSheet
        visible={sheetOpen}
        onClose={closeSheet}
        onDismissed={onSheetDismissed}
        group={sheetGroup}
        medsById={medsById}
        now={now}
        focus={sheetFocus}
        handlers={handlers}
        onUpdateSupply={onUpdateSupply}
      />

      <AsNeededDoseSheet
        visible={prnOpen}
        onClose={() => setPrnOpen(false)}
        onDismissed={onPrnDismissed}
        medication={prnMed}
        todayLogs={prnTodayLogs}
        lastLog={prnLastLog}
        onLog={actions.logAsNeeded}
        handlesShortSupply
        onLogged={onPrnLogged}
        onOtherTime={(m) => {
          afterSheet.current = { kind: 'pastDose', medicationId: m.id };
          setPrnOpen(false);
        }}
        onUpdateSupply={(m) => {
          afterSheet.current = { kind: 'supply', id: m.id };
          setPrnOpen(false);
        }}
      />

      <SupplySheet
        visible={supplyOpen}
        medication={supplyMed}
        onClose={() => setSupplyOpen(false)}
        onSave={async (newCount, change) => {
          if (supplyMed) await saveSupply(supplyMed, newCount, profileId ?? undefined, change);
        }}
        onSaved={(newCount) => {
          if (!supplyMed) return;
          toast.show({
            title: i18n.t('ui.medicines.toast.supplyUpdated'),
            message: i18n.t('ui.medicines.toast.supplyNow', {
              amount: formatDose(newCount, supplyMed.dosageUnit),
            }),
          });
        }}
      />

      <ReminderPermissionSheet
        visible={askReminders}
        times={reminderTimes}
        onClose={() => setAskReminders(false)}
        onAnswer={onReminderAnswer}
      />
    </Screen>
  );
}
