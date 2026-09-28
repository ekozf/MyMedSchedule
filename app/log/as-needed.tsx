/**
 * PLACEHOLDER — owned by the Journal/logging feature.
 * Contract: optional search param `medicationId` (preselects that as-needed medicine).
 */
import * as React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import i18n from '@/lib/i18n';
import { Sheet, Text } from '@/components/ds';

export default function LogAsNeededScreen() {
  const { medicationId } = useLocalSearchParams<{ medicationId?: string }>();
  const [visible, setVisible] = React.useState(true);
  return (
    <Sheet
      visible={visible}
      onClose={() => setVisible(false)}
      onDismissed={() => router.back()}
      title={i18n.t('ui.shell.quickAdd.logAsNeeded')}>
      <Text tone="secondary">
        {i18n.t('ui.common.comingSoon')}
        {medicationId ? ` (${medicationId})` : ''}
      </Text>
    </Sheet>
  );
}
