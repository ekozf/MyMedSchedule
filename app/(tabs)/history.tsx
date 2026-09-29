/**
 * Journal tab (DESIGN.md §4.5). Loads every intake log + every medicine (inactive included, for
 * names) for the active profile on focus, on profile change, on pull-to-refresh and whenever the
 * journal refresh signal is bumped (e.g. after /log/past). Optional route param `medicationId`
 * preselects the medicine filter ("See in Journal" on a medicine).
 */
import * as React from 'react';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import i18n from '@/lib/i18n';
import { useToast } from '@/components/ds';
import { getIntakeLogsByProfile, getMedicationsByProfile } from '@/lib/db/operations';
import { useStore } from '@/store';
import type { IntakeLog, Medication } from '@/types';
import { EntrySheet, type EntryDraft } from '@/components/journal/EntrySheet';
import { JournalView } from '@/components/journal/JournalView';
import { useJournalActions } from '@/components/journal/actions';
import { useJournalRefresh } from '@/components/journal/journal-refresh';
import { DEFAULT_FILTERS, type JournalFilters } from '@/components/journal/utils';

export default function JournalScreen() {
  const profileId = useStore((s) => s.activeProfile?.id);
  const navigation = useNavigation();
  const toast = useToast();
  const { saveChange, deleteEntry } = useJournalActions();

  const params = useLocalSearchParams<{ medicationId?: string | string[] }>();
  const medicationIdParam = Array.isArray(params.medicationId)
    ? params.medicationId[0]
    : params.medicationId;

  const [logs, setLogs] = React.useState<IntakeLog[]>([]);
  const [medications, setMedications] = React.useState<Medication[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [filters, setFilters] = React.useState<JournalFilters>(() => ({
    ...DEFAULT_FILTERS,
    medicationId: medicationIdParam || 'all',
  }));

  // ---- Data -------------------------------------------------------------------------------
  const requestId = React.useRef(0);
  const load = React.useCallback(
    async (showRefreshing = false) => {
      if (!profileId) return;
      const id = ++requestId.current;
      if (showRefreshing) setRefreshing(true);
      try {
        const [fetchedLogs, fetchedMeds] = await Promise.all([
          getIntakeLogsByProfile(profileId),
          getMedicationsByProfile(profileId, false),
        ]);
        if (id !== requestId.current) return; // a newer load (e.g. other profile) won
        setLogs(fetchedLogs);
        setMedications(fetchedMeds);
        setLoaded(true);
      } catch (error) {
        console.error('Failed to load journal:', error);
      } finally {
        if (showRefreshing) setRefreshing(false);
      }
    },
    [profileId]
  );
  const loadRef = React.useRef(load);
  loadRef.current = load;

  // Profile switched: the medicine filter belonged to the other profile.
  const prevProfileId = React.useRef(profileId);
  React.useEffect(() => {
    if (prevProfileId.current !== profileId) {
      prevProfileId.current = profileId;
      setFilters((f) => ({ ...f, medicationId: 'all' }));
    }
  }, [profileId]);

  // Mount, focus and profile change (the callback changes with the profile).
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  // Changes made from transparent modals (/log/past) may not re-focus this tab.
  const refreshVersion = useJournalRefresh((s) => s.version);
  React.useEffect(() => {
    if (refreshVersion > 0) loadRef.current();
  }, [refreshVersion]);

  // "See in Journal": (re)apply the medicine filter, then clear the param so the same medicine
  // can be requested again later.
  React.useEffect(() => {
    if (!medicationIdParam) return;
    setFilters((f) => ({ ...f, medicationId: medicationIdParam }));
    navigation.setParams({ medicationId: undefined } as never);
  }, [medicationIdParam, navigation]);

  // ---- Entry sheet ------------------------------------------------------------------------
  const [selected, setSelected] = React.useState<IntakeLog | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const afterClose = React.useRef<(() => void) | null>(null);

  const openEntry = (log: IntakeLog) => {
    afterClose.current = null;
    setSelected(log);
    setSheetOpen(true);
  };

  const onSave = async (draft: EntryDraft) => {
    if (!selected) return false;
    const ok = await saveChange(selected, draft);
    if (ok) {
      afterClose.current = () =>
        toast.show({ title: i18n.t('ui.journal.entry.updated'), tone: 'success' });
      setSheetOpen(false);
    }
    return ok;
  };

  const onDeleteFromSheet = () => {
    const log = selected;
    if (!log) return;
    // Confirm + toast after the sheet has gone (toasts render under open sheets).
    afterClose.current = () => {
      deleteEntry(log);
    };
    setSheetOpen(false);
  };

  const onDismissed = () => {
    const next = afterClose.current;
    afterClose.current = null;
    setSelected(null);
    next?.();
  };

  const logPast = () => {
    const med =
      filters.medicationId !== 'all'
        ? medications.find((m) => m.id === filters.medicationId && m.isActive)
        : undefined;
    router.push(med ? { pathname: '/log/past', params: { medicationId: med.id } } : '/log/past');
  };

  return (
    <>
      <JournalView
        logs={logs}
        medications={medications}
        loaded={loaded}
        filters={filters}
        onFiltersChange={setFilters}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        onOpenEntry={openEntry}
        onDeleteEntry={(log) => {
          deleteEntry(log);
        }}
        onLogPast={logPast}
      />
      <EntrySheet
        visible={sheetOpen}
        log={selected}
        medication={selected ? medications.find((m) => m.id === selected.medicationId) : undefined}
        onClose={() => setSheetOpen(false)}
        onDismissed={onDismissed}
        onSave={onSave}
        onDelete={onDeleteFromSheet}
      />
    </>
  );
}
