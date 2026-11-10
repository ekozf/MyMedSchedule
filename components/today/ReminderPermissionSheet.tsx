/**
 * "Allow reminders?" (pre-permission step): shown on Today once there is a scheduled medicine and
 * the phone hasn't been asked yet. Explains what happens next ("To remind you at 08:00 and 20:00,
 * your phone will now ask for permission.") so the OS dialog never appears out of the blue.
 * Both buttons (and swipe / scrim) call `onClose`; once the sheet is gone `onAnswer(true)` follows
 * for "Continue" (the parent shows the OS dialog) and `onAnswer(false)` otherwise ("Not now").
 *
 * @example
 * <ReminderPermissionSheet visible={ask} times={['08:00', '20:00']} onClose={hide}
 *   onAnswer={(allow) => (allow ? askOs() : reminderPrompt.dismiss())} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { Button, Sheet, Text } from '@/components/ds';
import { joinList } from '@/components/editor/describe';

export interface ReminderPermissionSheetProps {
  visible: boolean;
  /** Formatted reminder times of today ("08:00"); listed when 1 to 4. */
  times: string[];
  onClose: () => void;
  onAnswer: (allow: boolean) => void;
}

const MAX_TIMES = 4;

export function ReminderPermissionSheet({
  visible,
  times,
  onClose,
  onAnswer,
}: ReminderPermissionSheetProps) {
  const choice = React.useRef<'continue' | 'notNow'>('notNow');
  const body =
    times.length > 0 && times.length <= MAX_TIMES
      ? i18n.t('ui.today.reminders.askBody', { times: joinList(times) })
      : i18n.t('ui.today.reminders.askBodyGeneric');

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={() => {
        onAnswer(choice.current === 'continue');
        choice.current = 'notNow';
      }}
      title={i18n.t('ui.today.reminders.askTitle')}
      scrollable={false}>
      <View style={{ gap: 20, paddingTop: 4 }}>
        <Text variant="body" tone="secondary" tabular>
          {body}
        </Text>
        <View style={{ gap: 4 }}>
          <Button
            label={i18n.t('ui.today.reminders.askContinue')}
            onPress={() => {
              choice.current = 'continue';
              onClose(); // the OS dialog follows once the sheet is gone
            }}
          />
          <Button
            label={i18n.t('ui.today.reminders.askNotNow')}
            variant="quiet"
            onPress={() => {
              choice.current = 'notNow';
              onClose();
            }}
          />
        </View>
      </View>
    </Sheet>
  );
}
