/**
 * Today banner, quieter than "Reminders are off": reminders are allowed but Android may deliver
 * them late because the app may not set exact alarms. `field` fill, "Reminders may arrive late"
 * and a "Fix" button that opens the phone's "Alarms & reminders" page. Never shown together with
 * `RemindersOffBanner` (see `showLateRemindersBanner`).
 *
 * @example
 * <LateRemindersBanner onFix={() => openExactAlarmSettingsSafely(openSettings)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { Button, Text, radii, useTheme } from '@/components/ds';

export function LateRemindersBanner({ onFix }: { onFix: () => void }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="summary"
      style={{
        backgroundColor: colors.field,
        borderRadius: radii.card,
        paddingVertical: 12,
        paddingLeft: 16,
        paddingRight: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
      }}>
      <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
        <Text variant="headline">{i18n.t('ui.alarms.banner.title')}</Text>
        <Text variant="footnote" tone="secondary">
          {i18n.t('ui.alarms.banner.body')}
        </Text>
      </View>
      <Button
        label={i18n.t('ui.alarms.banner.fix')}
        variant="secondary"
        size="sm"
        onPress={onFix}
        style={{ backgroundColor: colors.bg, paddingHorizontal: 18 }}
      />
    </View>
  );
}
