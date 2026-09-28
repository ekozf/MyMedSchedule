/**
 * Medicine detail (docs/DESIGN.md §4.3). Loads the medicine + its logs on focus (so returning
 * from edit, the supply sheet or the as-needed sheet shows fresh data) and owns the actions:
 * update supply, stop/resume, delete, open Journal, log an as-needed dose.
 */
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  CircleAlert,
  CirclePause,
  CirclePlay,
  PackageCheck,
  SearchX,
  Trash2,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import { getIntakeLogsByMedication, getMedicationById } from '@/lib/db/operations';
import { formatDose } from '@/lib/ui/format';
import {
  Button,
  EmptyState,
  NavHeader,
  Screen,
  goBackOrHome,
  useConfirm,
  useTheme,
  useToast,
} from '@/components/ds';
import { MedicineDetailContent } from '@/components/medicines/MedicineDetailContent';
import { SupplySheet } from '@/components/medicines/SupplySheet';
import { findLastTaken } from '@/components/medicines/medicine-info';
import { removeMedicine, saveSupply, setMedicineActive } from '@/components/medicines/actions';
import type { IntakeLog, Medication } from '@/types';

export default function MedicineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const confirm = useConfirm();
  const toast = useToast();
  const profileId = useStore((s) => s.activeProfile?.id);
  // Re-read when this medicine changes in the store (e.g. a dose logged from the as-needed sheet).
  const storeStamp = useStore((s) => {
    const m = s.medications.find((x) => x.id === id);
    return m ? new Date(m.updatedAt).getTime() : 0;
  });

  const [medication, setMedication] = React.useState<Medication | null>(null);
  const [lastTaken, setLastTaken] = React.useState<IntakeLog | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [supplyOpen, setSupplyOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const [med, logs] = await Promise.all([getMedicationById(id), getIntakeLogsByMedication(id)]);
      setMedication(med);
      setLastTaken(findLastTaken(logs));
    } catch (error) {
      console.error('Failed to load medication:', error);
      setMedication(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const firstStamp = React.useRef(true);
  React.useEffect(() => {
    if (firstStamp.current) {
      firstStamp.current = false;
      return;
    }
    // 0 = gone from the store (deleted / profile switched): keep what is on screen while leaving.
    if (storeStamp !== 0) load();
  }, [storeStamp, load]);

  const showError = (message: string) =>
    confirm({
      title: i18n.t('ui.common.somethingWentWrong'),
      message,
      confirmLabel: i18n.t('ui.common.ok'),
      cancelLabel: i18n.t('ui.common.close'),
      icon: CircleAlert,
    });

  const applyActive = async (med: Medication, active: boolean) => {
    await setMedicineActive(med, active, profileId);
    await load();
  };

  const toggleActive = async () => {
    const med = medication;
    if (!med || busy) return;
    const stopping = med.isActive;
    const ok = await confirm(
      stopping
        ? {
            title: i18n.t('ui.medicines.confirm.stopTitle', { name: med.name }),
            message: i18n.t('ui.medicines.confirm.stopMessage'),
            confirmLabel: i18n.t('ui.medicines.detail.stop'),
            tone: 'warning',
            icon: CirclePause,
          }
        : {
            title: i18n.t('ui.medicines.confirm.resumeTitle', { name: med.name }),
            message: i18n.t(
              med.isPrn
                ? 'ui.medicines.confirm.resumeMessagePrn'
                : 'ui.medicines.confirm.resumeMessage'
            ),
            confirmLabel: i18n.t('ui.medicines.detail.resume'),
            icon: CirclePlay,
          }
    );
    if (!ok) return;
    setBusy(true);
    try {
      await applyActive(med, !stopping);
      toast.show(
        stopping
          ? {
              title: i18n.t('ui.medicines.toast.stopped', { name: med.name }),
              message: i18n.t('ui.medicines.toast.stoppedMessage'),
              icon: CirclePause,
              action: {
                label: i18n.t('ui.common.undo'),
                onPress: () => {
                  applyActive({ ...med, isActive: false }, true).catch((e) =>
                    console.error('Failed to undo stop:', e)
                  );
                },
              },
            }
          : {
              title: i18n.t('ui.medicines.toast.resumed', { name: med.name }),
              tone: 'success',
            }
      );
    } catch (error) {
      console.error('Failed to update medication:', error);
      await showError(i18n.t('ui.safety.couldNotSave'));
    } finally {
      setBusy(false);
    }
  };

  const deleteMed = async () => {
    const med = medication;
    if (!med || busy) return;
    const ok = await confirm({
      title: i18n.t('ui.medicines.confirm.deleteTitle', { name: med.name }),
      message: i18n.t('ui.medicines.confirm.deleteMessage'),
      confirmLabel: i18n.t('ui.medicines.detail.delete'),
      tone: 'danger',
      icon: Trash2,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await removeMedicine(med, profileId);
      goBackOrHome();
      toast.show({ title: i18n.t('ui.medicines.toast.deleted', { name: med.name }) });
    } catch (error) {
      console.error('Failed to delete medication:', error);
      setBusy(false);
      await showError(i18n.t('ui.safety.couldNotDelete'));
    }
  };

  const header = (
    <NavHeader
      right={
        medication ? (
          <Button
            label={i18n.t('ui.common.edit')}
            variant="plain"
            size="md"
            onPress={() => router.push(`/medication/edit/${medication.id}`)}
          />
        ) : null
      }
    />
  );

  if (loading) {
    return (
      <Screen header={header} scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          accessible
          accessibilityLabel={i18n.t('ui.common.loading')}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </Screen>
    );
  }

  if (!medication) {
    return (
      <Screen header={header} scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={SearchX}
            tone="default"
            title={i18n.t('ui.medicines.detail.notFoundTitle')}
            message={i18n.t('ui.medicines.detail.notFound')}
            action={{ label: i18n.t('ui.medicines.detail.goBack'), onPress: goBackOrHome }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen header={header}>
      <MedicineDetailContent
        medication={medication}
        lastTaken={lastTaken}
        busy={busy}
        onLogDose={() =>
          router.push({ pathname: '/log/as-needed', params: { medicationId: medication.id } })
        }
        onUpdateSupply={() => setSupplyOpen(true)}
        onSeeJournal={() =>
          router.push({ pathname: '/(tabs)/history', params: { medicationId: medication.id } })
        }
        onToggleActive={toggleActive}
        onDelete={deleteMed}
      />
      <SupplySheet
        visible={supplyOpen}
        medication={medication}
        onClose={() => setSupplyOpen(false)}
        onSave={(newCount) => saveSupply(medication, newCount, profileId)}
        onSaved={(newCount) => {
          load();
          toast.show({
            title: i18n.t('ui.medicines.toast.supplyUpdated'),
            message: i18n.t('ui.medicines.toast.supplyNow', {
              amount: formatDose(newCount, medication.dosageUnit),
            }),
            tone: 'success',
            icon: PackageCheck,
          });
        }}
      />
    </Screen>
  );
}
