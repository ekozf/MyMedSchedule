/**
 * `/log/as-needed[?medicationId=]` — transparent modal route that shows the as-needed dose sheet
 * over the previous screen. Without `medicationId` and with several as-needed medicines, the
 * sheet starts with a picker. Closing goes back; a logged dose shows a toast with Undo.
 */
import * as React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import { undoIntakeLog } from '@/lib/ui/dose-actions';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import { OverlayScope, goBackOrHome, useToast } from '@/components/ds';
import { AsNeededSheet, type AsNeededResult } from '@/components/medicines/AsNeededSheet';
import { useLogAsNeeded } from '@/components/medicines/actions';

export default function LogAsNeededScreen() {
  const { medicationId } = useLocalSearchParams<{ medicationId?: string }>();
  const medications = useStore((s) => s.medications);
  const [visible, setVisible] = React.useState(true);
  const logAsNeeded = useLogAsNeeded();
  const toast = useToast();
  const { formatTime } = useTimeFormat();

  const onDismissed = (result: AsNeededResult) => {
    goBackOrHome();
    if (result.type === 'addMedicine') {
      router.push('/medication/add');
      return;
    }
    if (result.type === 'updateSupply') {
      router.push({ pathname: '/medication/[id]', params: { id: result.medicationId } });
      return;
    }
    if (result.type !== 'logged') return;
    const { medication, log, amount } = result;
    toast.show({
      title: i18n.t('ui.medicines.toast.logged', { name: medication.name }),
      message: i18n.t('ui.medicines.toast.loggedDetail', {
        amount: formatDose(amount, medication.dosageUnit),
        time: formatTime(new Date(log.actualTime)),
      }),
      tone: 'success',
      icon: CircleCheck,
      action: {
        label: i18n.t('ui.common.undo'),
        onPress: async () => {
          try {
            await undoIntakeLog(log);
            const profileId = useStore.getState().activeProfile?.id;
            if (profileId) await useStore.getState().loadMedications(profileId);
            toast.show({ title: i18n.t('ui.medicines.toast.undone') });
          } catch (error) {
            console.error('Failed to undo as-needed dose:', error);
            toast.show({
              title: i18n.t('ui.common.somethingWentWrong'),
              message: i18n.t('ui.safety.couldNotDelete'),
              tone: 'danger',
            });
          }
        },
      },
    });
  };

  // A modal route: overlays opened while it is up are presented from it (see OverlayHost).
  return (
    <OverlayScope>
      <AsNeededSheet
        visible={visible}
        onClose={() => setVisible(false)}
        onDismissed={onDismissed}
        medications={medications}
        medicationId={medicationId}
        onLog={logAsNeeded}
      />
    </OverlayScope>
  );
}
