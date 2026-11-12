/**
 * Settings › Your data › Delete everything. Explains exactly what goes (people, medicines,
 * journal, photos, reminders, PIN / app lock, settings) and that it can't be undone, offers
 * "Export a report first", then: danger confirm → confirmIdentity (biometrics, or the PIN sheet)
 * → deleteAllData() → back to Welcome with a clean history. If the new empty database couldn't be
 * opened, the app reloads itself instead.
 */
import * as React from 'react';
import { BackHandler, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { reloadAppAsync } from 'expo';
import i18n from '@/lib/i18n';
import { confirmIdentity } from '@/lib/auth';
import { deleteAllData } from '@/lib/data/wipe';
import { Button, Card, NavHeader, Screen, Text, useConfirm, useToast } from '@/components/ds';
import { LegalBody } from '@/components/legal/LegalDocument';
import { PinConfirmSheet } from '@/components/legal/PinConfirmSheet';
import { YOU_ROUTES } from '@/components/you/routes';

const WELCOME = '/(onboarding)/welcome' as Href;
const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(`ui.about.deleteAll.${key}`, opts);

export default function DeleteDataRoute() {
  const confirm = useConfirm();
  const toast = useToast();
  const [askPin, setAskPin] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const busyRef = React.useRef(false);

  // No going back half-way through.
  useFocusEffect(
    React.useCallback(() => {
      if (!deleting) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, [deleting])
  );

  const wipe = async () => {
    setDeleting(true);
    try {
      const result = await deleteAllData();
      if (!result.databaseReady) {
        toast.show({ title: t('restartNeeded') });
        try {
          await reloadAppAsync('Delete everything: reopen the database');
          return;
        } catch (error) {
          console.error('Could not reload the app:', error);
          toast.show({ title: t('failed') });
          busyRef.current = false;
          setDeleting(false);
          return;
        }
      }
      if (result.errors.length)
        console.warn('Delete everything finished with errors:', result.errors);
      // Clear the history so Back can't return to screens of the deleted data.
      if (router.canDismiss()) router.dismissAll();
      router.replace(WELCOME);
      toast.show({ title: result.ok ? t('done') : t('partial') });
    } catch (error) {
      console.error('Delete everything failed:', error);
      toast.show({ title: t('failed') });
      busyRef.current = false;
      setDeleting(false);
    }
  };

  const start = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const ok = await confirm({
        title: t('confirmTitle'),
        message: t('confirmMessage'),
        confirmLabel: t('confirmAction'),
        cancelLabel: i18n.t('ui.common.cancel'),
        tone: 'danger',
      });
      if (!ok) {
        busyRef.current = false;
        return;
      }
      const identity = await confirmIdentity({
        promptMessage: t('identityPrompt'),
        cancelLabel: i18n.t('ui.common.cancel'),
      });
      if (identity === 'confirmed') {
        await wipe();
      } else if (identity === 'needs-pin') {
        setAskPin(true); // busy until the sheet closes
      } else {
        if (identity === 'failed') toast.show({ title: t('identityFailed') });
        busyRef.current = false;
      }
    } catch (error) {
      console.error('Delete everything could not start:', error);
      toast.show({ title: t('identityFailed') });
      busyRef.current = false;
    }
  };

  return (
    <Screen
      header={<NavHeader hideBack={deleting} />}
      footer={
        <Button
          label={deleting ? t('deleting') : t('action')}
          variant="danger"
          loading={deleting}
          disabled={deleting}
          onPress={start}
        />
      }>
      <View style={{ gap: 8, paddingTop: 8, marginBottom: 24 }}>
        <Text variant="title1" accessibilityRole="header">
          {t('title')}
        </Text>
      </View>
      <View style={{ gap: 24 }}>
        <View style={{ gap: 12 }}>
          <Text variant="body">{t('intro')}</Text>
          <LegalBody body={t('items')} />
        </View>
        <Text variant="headline">{t('cantUndo')}</Text>
        <Text variant="body" tone="secondary">
          {t('exportedNote')}
        </Text>
        <Card>
          <View style={{ gap: 12 }}>
            <Text variant="title3" accessibilityRole="header">
              {t('exportTitle')}
            </Text>
            <Text variant="body">{t('exportBody')}</Text>
            <Button
              label={t('exportFirst')}
              variant="secondary"
              disabled={deleting}
              onPress={() => router.push(YOU_ROUTES.export)}
            />
          </View>
        </Card>
      </View>
      <PinConfirmSheet
        visible={askPin}
        title={t('pinTitle')}
        subtitle={t('pinSubtitle')}
        onClose={() => setAskPin(false)}
        onConfirmed={wipe}
        onCancelled={() => {
          busyRef.current = false;
        }}
      />
    </Screen>
  );
}
