/**
 * Medicine page (docs/DESIGN.md §5.3), full page without the tab bar. Loads the medicine + its logs on focus (so returning
 * from edit, the supply sheet or the as-needed sheet shows fresh data) and owns the actions:
 * update supply, stop/resume, delete, open Journal, log an as-needed dose.
 */
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { isSameDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import {
  getIntakeLogsByMedication,
  getLatestInventoryAdjustment,
  getMedicationById,
  type InventoryAdjustment,
} from '@/lib/db/operations';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import { undoIntakeLog } from '@/lib/ui/dose-actions';
import {
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
import {
  removeMedicine,
  saveSupply,
  setMedicineActive,
  useLogAsNeeded,
} from '@/components/medicines/actions';
import { AsNeededDoseSheet } from '@/components/today/AsNeededDoseSheet';
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
  const [logs, setLogs] = React.useState<IntakeLog[]>([]);
  const [lastChange, setLastChange] = React.useState<InventoryAdjustment | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [supplyOpen, setSupplyOpen] = React.useState(false);
  const [prnOpen, setPrnOpen] = React.useState(false);
  // What to open once the as-needed sheet has finished closing.
  const afterPrn = React.useRef<'pastDose' | 'supply' | null>(null);
  // "Update supply first": close the as-needed sheet, then show the supply sheet.
  const onUpdateSupplyFirst = React.useCallback(() => {
    afterPrn.current = 'supply';
    setPrnOpen(false);
  }, []);
  const logAsNeeded = useLogAsNeeded({ onUpdateSupply: onUpdateSupplyFirst });
  const { formatTime } = useTimeFormat();

  const load = React.useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const [med, logs, change] = await Promise.all([
        getMedicationById(id),
        getIntakeLogsByMedication(id),
        // "Last change" is a nicety: never let it break loading the page.
        getLatestInventoryAdjustment(id).catch(() => null),
      ]);
      setMedication(med);
      setLogs(logs);
      setLastChange(change);
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

  const lastTaken = React.useMemo(() => findLastTaken(logs), [logs]);
  const todayLogs = React.useMemo(() => {
    const now = new Date();
    return logs.filter((l) => isSameDay(new Date(l.actualTime), now));
  }, [logs]);

  // --- as-needed sheet (same sheet as Today) --------------------------------------------------
  const onPrnDismissed = () => {
    const next = afterPrn.current;
    afterPrn.current = null;
    if (next === 'supply') setSupplyOpen(true);
    else if (next === 'pastDose' && medication) {
      router.push({ pathname: '/log/past', params: { medicationId: medication.id } });
    }
  };
  const onPrnLogged = (m: Medication, log: IntakeLog, amount: number) => {
    setPrnOpen(false);
    load();
    toast.show({
      title: i18n.t('ui.today.asNeededSheet.logged', { name: m.name }),
      message: i18n.t('ui.today.asNeededSheet.loggedDetail', {
        amount: formatDose(amount, m.dosageUnit),
        time: formatTime(new Date(log.actualTime)),
      }),
      action: {
        label: i18n.t('ui.common.undo'),
        onPress: async () => {
          try {
            await undoIntakeLog(log);
            if (profileId) await useStore.getState().loadMedications(profileId);
            await load();
            toast.show({ title: i18n.t('ui.today.asNeededSheet.undone') });
          } catch (error) {
            console.error('Failed to undo as-needed dose:', error);
            toast.show({ title: i18n.t('ui.safety.couldNotDelete') });
          }
        },
      },
    });
  };

  const showError = (message: string) =>
    confirm({
      title: i18n.t('ui.common.somethingWentWrong'),
      message,
      confirmLabel: i18n.t('ui.common.close'),
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
          }
        : {
            title: i18n.t('ui.medicines.confirm.resumeTitle', { name: med.name }),
            message: i18n.t(
              med.isPrn
                ? 'ui.medicines.confirm.resumeMessagePrn'
                : 'ui.medicines.confirm.resumeMessage'
            ),
            confirmLabel: i18n.t('ui.medicines.detail.resume'),
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
              action: {
                label: i18n.t('ui.common.undo'),
                onPress: () => {
                  applyActive({ ...med, isActive: false }, true).catch((e) =>
                    console.error('Failed to undo stop:', e)
                  );
                },
              },
            }
          : { title: i18n.t('ui.medicines.toast.resumed', { name: med.name }) }
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

  const openSection = (section: 'supply' | 'note' | 'limits' | 'expiry') => {
    if (!medication) return;
    router.push({
      pathname: '/medication/edit/[id]/[section]',
      params: { id: medication.id, section },
    });
  };

  const header = (
    <NavHeader
      rightAction={
        medication
          ? {
              label: i18n.t('ui.common.edit'),
              onPress: () => router.push(`/medication/edit/${medication.id}`),
            }
          : undefined
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
        logs={logs}
        busy={busy}
        onLogDose={() => setPrnOpen(true)}
        onUpdateSupply={() => setSupplyOpen(true)}
        onStartTracking={() => setSupplyOpen(true)}
        lastChange={lastChange}
        onEditRefill={() => openSection('supply')}
        onAddNote={() => openSection('note')}
        onAddLimits={() => openSection('limits')}
        onEditExpiry={() => openSection('expiry')}
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
        onSave={(newCount, change) => saveSupply(medication, newCount, profileId, change)}
        onSaved={(newCount) => {
          load();
          toast.show({
            title: i18n.t('ui.medicines.toast.supplyUpdated'),
            message: i18n.t('ui.medicines.toast.supplyNow', {
              amount: formatDose(newCount, medication.dosageUnit),
            }),
          });
        }}
      />
      <AsNeededDoseSheet
        visible={prnOpen}
        onClose={() => setPrnOpen(false)}
        onDismissed={onPrnDismissed}
        medication={medication}
        todayLogs={todayLogs}
        lastLog={lastTaken}
        onLog={logAsNeeded}
        handlesShortSupply
        onLogged={onPrnLogged}
        onOtherTime={() => {
          afterPrn.current = 'pastDose';
          setPrnOpen(false);
        }}
        onUpdateSupply={onUpdateSupplyFirst}
      />
    </Screen>
  );
}
