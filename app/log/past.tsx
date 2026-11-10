/**
 * `/log/past` — "Log a past dose" as a full page (no tab bar).
 *
 * Params:
 * - `medicationId`: preselect that medicine (e.g. from Today's as-needed sheet).
 * - `logId`: edit mode — change that existing entry (from the Journal entry sheet).
 *
 * After saving it goes back and shows a toast ("Saved to your Journal." with Undo, or
 * "Changes saved.").
 */
import * as React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import i18n from '@/lib/i18n';
import { NavHeader, OverlayScope, Screen, goBackOrHome, useToast } from '@/components/ds';
import { getIntakeLogsByProfile, getMedicationsByProfile } from '@/lib/db/operations';
import { useStore } from '@/store';
import type { IntakeLog, Medication } from '@/types';
import { PastDoseForm, type PastDoseDraft } from '@/components/journal/PastDoseForm';
import { useJournalActions } from '@/components/journal/actions';

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) || undefined;

export default function LogPastScreen() {
  const params = useLocalSearchParams<{
    medicationId?: string | string[];
    logId?: string | string[];
  }>();
  const medicationId = first(params.medicationId);
  const logId = first(params.logId);

  const profileId = useStore((s) => s.activeProfile?.id);
  const storeMeds = useStore((s) => s.medications);
  const toast = useToast();
  const { logPastDose, undoPastDose, saveChange } = useJournalActions();

  // New entry: start from the store (instant), then refresh from the database.
  const [medications, setMedications] = React.useState<Medication[]>(() =>
    logId ? [] : storeMeds.filter((m) => m.isActive && m.profileId === profileId)
  );
  const [entry, setEntry] = React.useState<{ log: IntakeLog; medication: Medication } | null>(null);
  // What is already logged, for the "Which dose?" chips ("08:00 · taken").
  const [logs, setLogs] = React.useState<IntakeLog[] | undefined>(undefined);
  // Wait for the database before showing "No medicines yet" or an entry to change.
  const [ready, setReady] = React.useState(() => !logId && medications.length > 0);

  React.useEffect(() => {
    if (!profileId) return;
    let alive = true;
    (async () => {
      try {
        if (!logId) {
          const meds = await getMedicationsByProfile(profileId, true);
          if (!alive) return;
          setMedications(meds);
          setReady(true);
          // Best-effort: without it the chips just don't show what's already logged.
          getIntakeLogsByProfile(profileId)
            .then((all) => alive && setLogs(all))
            .catch((error) => console.warn('Failed to load logs for past dose:', error));
          return;
        }
        const [logs, meds] = await Promise.all([
          getIntakeLogsByProfile(profileId),
          getMedicationsByProfile(profileId, false),
        ]);
        if (!alive) return;
        const log = logs.find((l) => l.id === logId);
        const medication = log ? meds.find((m) => m.id === log.medicationId) : undefined;
        if (!log || !medication) {
          toast.show({ title: i18n.t('ui.journal.past.notFound') });
          goBackOrHome();
          return;
        }
        setMedications(meds);
        setEntry({ log, medication });
        setReady(true);
      } catch (error) {
        console.error('Failed to load for past dose:', error);
        if (!alive) return;
        if (logId) {
          toast.show({ title: i18n.t('ui.journal.past.notFound') });
          goBackOrHome();
        } else {
          setReady(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, logId]);

  const onSubmit = async (draft: PastDoseDraft) => {
    if (entry) {
      const ok = await saveChange(entry.log, draft);
      if (!ok) return false;
      goBackOrHome();
      toast.show({ title: i18n.t('ui.journal.past.changed') });
      return true;
    }
    const log = await logPastDose(draft);
    if (!log) return false;
    goBackOrHome();
    toast.show({
      title: i18n.t('ui.journal.past.saved'),
      action: { label: i18n.t('ui.common.undo'), onPress: () => undoPastDose(log) },
    });
    return true;
  };

  // A modal route: overlays opened while it is up are presented from it (see OverlayHost).
  return (
    <OverlayScope>
      {ready ? (
        <PastDoseForm
          key={entry?.log.id ?? 'new'}
          medications={medications}
          initialMedicationId={medicationId}
          entry={entry ?? undefined}
          logs={logs}
          onSubmit={onSubmit}
          onAddMedicine={() => router.replace('/medication/add')}
        />
      ) : (
        <Screen header={<NavHeader backIcon="close" />} />
      )}
    </OverlayScope>
  );
}
