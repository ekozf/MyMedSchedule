/**
 * Export a report (modal, spec §5.6): what's inside, before you share, the "isn't encrypted"
 * checkbox, then Save to phone / Share. PDF generation, saving and sharing are unchanged
 * (`lib/export/pdf`).
 */
import * as React from 'react';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import { generatePDFReport, savePDFReportLocally, sharePDFReport } from '@/lib/export/pdf';
import { EmptyState, NavHeader, Screen, goBackOrHome, useToast } from '@/components/ds';
import { ModalScope, MODAL_SAFE_TOP } from '@/components/you/ModalScope';
import { ExportActions, ExportBody, type ExportBusy } from '@/components/you/ExportView';
import { firstName } from '@/components/you/profile-actions';

export default function ExportRoute() {
  return (
    <ModalScope>
      <ExportScreen />
    </ModalScope>
  );
}

function ExportScreen() {
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
        // Moves to the screen underneath once this modal closes.
        toast.show({ title: message });
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
        toast.show({
          title: i18n.t(kind === 'save' ? 'ui.you.export.saveFailed' : 'ui.you.export.shareFailed'),
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
          onAcknowledgedChange={setAcknowledged}
          busy={busy}
          onSave={() => run('save')}
          onShare={() => run('share')}
        />
      }>
      <ExportBody profileName={firstName(activeProfile.name)} />
    </Screen>
  );
}
