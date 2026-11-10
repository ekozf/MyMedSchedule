/**
 * Today banner when reminders are off and there is at least one scheduled medicine:
 * `now` fill, "Reminders are off" and a "Turn on" button. `blocked` (phone settings only):
 * "Your phone is blocking them." Otherwise (not asked yet): "Allow them so you get a nudge…";
 * the parent's `onTurnOn` then shows "Allow reminders?" before the OS dialog.
 *
 * @example
 * <RemindersOffBanner blocked={state === 'denied'} onTurnOn={turnOnReminders} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { Button, Text, radii, useTheme } from '@/components/ds';

export function RemindersOffBanner({
  blocked,
  onTurnOn,
}: {
  blocked: boolean;
  onTurnOn: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="summary"
      style={{
        backgroundColor: colors.now,
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
        <Text variant="headline" color={colors.nowInk}>
          {i18n.t('ui.today.reminders.offTitle')}
        </Text>
        <Text variant="footnote" color={colors.nowInk}>
          {i18n.t(blocked ? 'ui.today.reminders.offBody' : 'ui.today.reminders.offBodyAsk')}
        </Text>
      </View>
      <Button
        label={i18n.t('ui.today.reminders.turnOn')}
        variant="secondary"
        size="sm"
        onPress={onTurnOn}
        style={{ backgroundColor: colors.bg, paddingHorizontal: 18 }}
      />
    </View>
  );
}
