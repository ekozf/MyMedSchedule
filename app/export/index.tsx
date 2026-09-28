/**
 * Export a PDF report (modal, single screen): what's inside, risks, acknowledgement, then
 * Save to device / Share. Replaces the old two-step warning → destination routes.
 */
import * as React from 'react';
import { UserRound } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import { generatePDFReport, savePDFReportLocally, sharePDFReport } from '@/lib/export/pdf';
import {
  EmptyState,
  NavHeader,
  Screen,
  goBackOrHome,
  haptics,
  useToast,
  type ToastApi,
} from '@/components/ds';
import { ModalScope, MODAL_SAFE_TOP } from '@/components/you/ModalScope';
import { ExportActions, ExportBody, type ExportBusy } from '@/components/you/ExportView';
import { firstName } from '@/components/you/profile-actions';
import { relayToast } from '@/components/you/toast-relay';

export default function ExportRoute() {
  const rootToast = useToast();
  return (
    <ModalScope>
      <ExportScreen rootToast={rootToast} />
    </ModalScope>
  );
}

function ExportScreen({ rootToast }: { rootToast: ToastApi }) {
  const toast = useToast();
  const activeProfile = useStore((s) => s.activeProfile);
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [busy, setBusy] = React.useState<ExportBusy>(null);
  const busyRef = React.useRef(false);

  const close = goBackOrHome;
  const header = <NavHeader backIcon="close" onBack={busy ? () => {} : close} />;

  if (!activeProfile) {
    return (
      <Screen safeTop={MODAL_SAFE_TOP} header={header}>
        <EmptyState
          icon={UserRound}
          title={i18n.t('ui.you.export.noProfile')}
          message={i18n.t('ui.you.export.noProfileMessage')}
          action={{ label: i18n.t('ui.common.close'), onPress: close }}
        />
      </Screen>
    );
  }

  const run = async (kind: 'save' | 'share') => {
    if (!acknowledged || busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    try {
      const uri = await generatePDFReport(activeProfile.id);
      if (kind === 'save') {
        const message = await savePDFReportLocally(uri, activeProfile.name);
        haptics.success();
        relayToast({ title: message, tone: 'success' }, rootToast);
      } else {
        await sharePDFReport(uri);
      }
      close();
    } catch (error) {
      // Android: closing the folder picker without choosing one isn't an error.
      const cancelled =
        error instanceof Error && error.message === i18n.t('export.permissionDenied');
      if (!cancelled) {
        console.error(`Failed to ${kind} PDF:`, error);
        haptics.error();
        toast.show({
          title: i18n.t(kind === 'save' ? 'export.saveError' : 'export.shareError'),
          message: i18n.t('ui.you.export.tryAgain'),
          tone: 'danger',
        });
      }
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  return (
    <Screen
      safeTop={MODAL_SAFE_TOP}
      header={header}
      footer={
        <ExportActions
          acknowledged={acknowledged}
          busy={busy}
          onSave={() => run('save')}
          onShare={() => run('share')}
        />
      }>
      <ExportBody
        profileName={firstName(activeProfile.name)}
        acknowledged={acknowledged}
        onAcknowledgedChange={setAcknowledged}
        disabled={busy !== null}
      />
    </Screen>
  );
}
