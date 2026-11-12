/**
 * "Let reminders arrive on time" (Android 12+): shown once on Today right after reminders were
 * allowed, when the app may not set exact alarms yet. Primary "Allow on-time reminders" opens the
 * phone's "Alarms & reminders" page once the sheet is gone; quiet "Not now" just closes. Settings ›
 * Reminders and Today's "Reminders may arrive late" banner stay available afterwards.
 *
 * @example
 * <ExactAlarmSheet visible={askExact} onClose={hide} onAnswer={(allow) => allow && openIt()} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { Button, Sheet, Text } from '@/components/ds';

export interface ExactAlarmSheetProps {
  visible: boolean;
  onClose: () => void;
  /** After the sheet has animated away: true for "Allow on-time reminders". */
  onAnswer: (allow: boolean) => void;
}

export function ExactAlarmSheet({ visible, onClose, onAnswer }: ExactAlarmSheetProps) {
  const choice = React.useRef<'allow' | 'notNow'>('notNow');
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={() => {
        onAnswer(choice.current === 'allow');
        choice.current = 'notNow';
      }}
      title={i18n.t('ui.alarms.sheet.title')}
      scrollable={false}>
      <View style={{ gap: 20, paddingTop: 4 }}>
        <Text variant="body" tone="secondary">
          {i18n.t('ui.alarms.sheet.body')}
        </Text>
        <View style={{ gap: 4 }}>
          <Button
            label={i18n.t('ui.alarms.sheet.allow')}
            onPress={() => {
              choice.current = 'allow';
              onClose();
            }}
          />
          <Button
            label={i18n.t('ui.alarms.sheet.notNow')}
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
