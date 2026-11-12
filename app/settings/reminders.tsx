/**
 * Settings → Reminders: whether reminders can show ("On" / "Not allowed yet" / "Blocked by your
 * phone"), the next planned one ("Next: Metformin at 20:00"), one primary action that fits the
 * status ("Allow reminders" asks the phone; "Open phone settings" when blocked) and a secondary
 * "Send a test reminder" (a local notification 5 seconds from now).
 * Android 12+ only: an "On-time reminders" card (exact alarms, "On" / "Off") with "Turn on", which
 * opens the phone's "Alarms & reminders" page.
 */
import * as React from 'react';
import { View } from 'react-native';
import { isSameDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import { Button, Card, NavHeader, Screen, Text, useTheme, useToast } from '@/components/ds';
import { formatDayLabel, useTimeFormat } from '@/lib/ui/format';
import { openAppSettings, useNotificationPermission } from '@/lib/notifications/use-permission';
import { scheduleTestReminder } from '@/lib/notifications/test-reminder';
import { allowAndPlanReminders, nextReminder } from '@/components/you/reminders';
import { useExactAlarmPermission } from '@/lib/notifications/use-exact-alarm';
import { openExactAlarmSettingsSafely } from '@/lib/notifications/exact-alarm-prompt';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.you.reminders.${key}`, opts);

export default function RemindersRoute() {
  const { colors } = useTheme();
  const toast = useToast();
  const { formatTime } = useTimeFormat();
  const { state } = useNotificationPermission();
  const exactAlarm = useExactAlarmPermission();
  const medications = useStore((s) => s.medications);
  const [busy, setBusy] = React.useState<'allow' | 'test' | null>(null);

  const now = new Date();
  const next = nextReminder(medications, now);
  const nextText = next
    ? isSameDay(next.time, now)
      ? t('next', { name: next.name, time: formatTime(next.time) })
      : t('nextDay', {
          name: next.name,
          day: formatDayLabel(next.time, now),
          time: formatTime(next.time),
        })
    : t('noneNext');

  const status =
    state === 'granted'
      ? { label: t('statusOn'), explain: t('explainOn'), color: colors.doneInk, bg: colors.done }
      : state === 'denied'
        ? {
            label: t('statusBlocked'),
            explain: t('explainBlocked'),
            color: colors.ink,
            bg: colors.field,
          }
        : { label: t('statusAsk'), explain: t('explainAsk'), color: colors.ink, bg: colors.field };

  const allow = async () => {
    if (busy) return;
    setBusy('allow');
    try {
      await allowAndPlanReminders();
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    if (busy) return;
    setBusy('test');
    try {
      const ok = await scheduleTestReminder(t('testBody'));
      toast.show({ title: ok ? t('testSent') : t('testNeedsAllow') });
    } catch (error) {
      console.warn('Failed to send a test reminder:', error);
      toast.show({ title: t('testFailed') });
    } finally {
      setBusy(null);
    }
  };

  const granted = state === 'granted';

  return (
    <Screen
      header={<NavHeader />}
      footer={
        <View style={{ gap: 10 }}>
          {state === 'undetermined' ? (
            <Button
              label={t('allow')}
              loading={busy === 'allow'}
              disabled={!!busy}
              onPress={allow}
            />
          ) : null}
          {state === 'denied' ? (
            <Button label={t('openSettings')} onPress={() => void openAppSettings()} />
          ) : null}
          <Button
            variant="secondary"
            label={t('test')}
            loading={busy === 'test'}
            disabled={!granted || !!busy}
            onPress={sendTest}
          />
          {!granted && state !== null ? (
            <Text variant="footnote" tone="secondary" align="center">
              {t('testNeedsAllow')}
            </Text>
          ) : null}
        </View>
      }>
      <View style={{ gap: 8, paddingTop: 8, marginBottom: 24 }}>
        <Text variant="title1">{t('title')}</Text>
        <Text variant="body" tone="secondary">
          {t('body')}
        </Text>
      </View>
      <Card>
        <View style={{ gap: 12 }} accessible accessibilityLiveRegion="polite">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Text variant="headline" style={{ flexShrink: 1 }}>
              {t('statusLabel')}
            </Text>
            {state !== null ? (
              <View
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  backgroundColor: granted ? status.bg : colors.bg,
                }}>
                <Text variant="callout" weight="700" color={status.color}>
                  {status.label}
                </Text>
              </View>
            ) : null}
          </View>
          {state !== null ? (
            <Text variant="body" tone="secondary">
              {status.explain}
            </Text>
          ) : null}
        </View>
      </Card>
      <Text variant="callout" weight="600" tabular style={{ marginTop: 20, paddingHorizontal: 4 }}>
        {nextText}
      </Text>
      {exactAlarm.supported ? (
        <Card style={{ marginTop: 24 }}>
          <View style={{ gap: 12 }}>
            <View
              style={{ gap: 12 }}
              accessible
              accessibilityLiveRegion="polite"
              accessibilityLabel={`${i18n.t('ui.alarms.settings.title')}: ${i18n.t(
                exactAlarm.granted ? 'ui.alarms.settings.on' : 'ui.alarms.settings.off'
              )}. ${i18n.t(
                exactAlarm.granted
                  ? 'ui.alarms.settings.explainOn'
                  : 'ui.alarms.settings.explainOff'
              )}`}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Text variant="headline" style={{ flexShrink: 1 }}>
                  {i18n.t('ui.alarms.settings.title')}
                </Text>
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    backgroundColor: exactAlarm.granted ? colors.done : colors.bg,
                  }}>
                  <Text
                    variant="callout"
                    weight="700"
                    color={exactAlarm.granted ? colors.doneInk : colors.ink}>
                    {i18n.t(
                      exactAlarm.granted ? 'ui.alarms.settings.on' : 'ui.alarms.settings.off'
                    )}
                  </Text>
                </View>
              </View>
              <Text variant="body" tone="secondary">
                {i18n.t(
                  exactAlarm.granted
                    ? 'ui.alarms.settings.explainOn'
                    : 'ui.alarms.settings.explainOff'
                )}
              </Text>
            </View>
            {exactAlarm.granted ? null : (
              <Button
                label={i18n.t('ui.alarms.settings.turnOn')}
                variant="secondary"
                size="sm"
                onPress={() => void openExactAlarmSettingsSafely(exactAlarm.openSettings)}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: colors.bg,
                  paddingHorizontal: 20,
                }}
              />
            )}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
