/**
 * /log/past — "Log a past dose" (transparent modal). Optional search param `medicationId`
 * preselects that medicine. Closes with `router.back()` once the sheet has animated away; after a
 * save it then shows a "Logged" toast with Undo.
 */
import * as React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import i18n from '@/lib/i18n';
import { useToast } from '@/components/ds';
import { getMedicationsByProfile } from '@/lib/db/operations';
import { useStore } from '@/store';
import { useTimeFormat } from '@/lib/ui/format';
import type { IntakeLog, Medication } from '@/types';
import { PastDoseSheet, type PastDoseDraft } from '@/components/journal/PastDoseSheet';
import { statusMeta } from '@/components/journal/StatusDot';
import { useJournalActions } from '@/components/journal/actions';
import { dayLabel } from '@/components/journal/utils';

type After = { kind: 'back' } | { kind: 'add' } | { kind: 'logged'; log: IntakeLog; name: string };

export default function LogPastScreen() {
  const params = useLocalSearchParams<{ medicationId?: string | string[] }>();
  const medicationId = Array.isArray(params.medicationId)
    ? params.medicationId[0]
    : params.medicationId;
  const profileId = useStore((s) => s.activeProfile?.id);
  const storeMeds = useStore((s) => s.medications);
  const toast = useToast();
  const { formatTime } = useTimeFormat();
  const { logPastDose, undoPastDose } = useJournalActions();

  const [visible, setVisible] = React.useState(true);
  // Start from the store (instant), then refresh from the database (only active medicines).
  const [medications, setMedications] = React.useState<Medication[]>(() =>
    storeMeds.filter((m) => m.isActive && m.profileId === profileId)
  );
  React.useEffect(() => {
    if (!profileId) return;
    let alive = true;
    getMedicationsByProfile(profileId, true)
      .then((meds) => alive && setMedications(meds))
      .catch((error) => console.error('Failed to load medicines:', error));
    return () => {
      alive = false;
    };
  }, [profileId]);

  const after = React.useRef<After>({ kind: 'back' });

  const onSubmit = async (draft: PastDoseDraft) => {
    const log = await logPastDose(draft);
    if (!log) return false;
    after.current = { kind: 'logged', log, name: draft.medication.name };
    setVisible(false);
    return true;
  };

  const onDismissed = () => {
    const next = after.current;
    if (next.kind === 'add') {
      router.replace('/medication/add');
      return;
    }
    router.back();
    if (next.kind === 'logged') {
      const when = new Date(next.log.actualTime);
      toast.show({
        title: i18n.t('ui.journal.past.logged', { name: next.name }),
        message: `${statusMeta(next.log.action).label} · ${i18n.t('ui.journal.entry.dayAtTime', {
          day: dayLabel(when),
          time: formatTime(when),
        })}`,
        tone: 'success',
        action: { label: i18n.t('ui.common.undo'), onPress: () => undoPastDose(next.log) },
      });
    }
  };

  return (
    <PastDoseSheet
      visible={visible}
      onClose={() => setVisible(false)}
      onDismissed={onDismissed}
      medications={medications}
      initialMedicationId={medicationId}
      onSubmit={onSubmit}
      onAddMedicine={() => {
        after.current = { kind: 'add' };
        setVisible(false);
      }}
    />
  );
}
