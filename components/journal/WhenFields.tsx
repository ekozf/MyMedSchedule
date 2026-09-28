/**
 * "When?" as two separate rows — date, then time — that edit one Date. (A single `datetime`
 * picker is not supported on Android.) Shows a gentle error when the result lies in the future.
 *
 * @example
 * <WhenFields value={when} onChange={setWhen} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { DateTimeField, Icon, Text } from '@/components/ds';
import { isInFuture, withDay, withTime } from './utils';

export interface WhenFieldsProps {
  value: Date;
  onChange: (date: Date) => void;
  /** Used for the "future" check. Default: now. */
  now?: Date;
}

export function WhenFields({ value, onChange, now }: WhenFieldsProps) {
  const future = isInFuture(value, now ?? new Date());
  return (
    <View style={{ gap: 10 }}>
      <DateTimeField
        mode="date"
        label={i18n.t('ui.journal.when.date')}
        value={value}
        maximumDate={now ?? new Date()}
        onChange={(d) => onChange(withDay(value, d))}
      />
      <DateTimeField
        mode="time"
        label={i18n.t('ui.journal.when.time')}
        value={value}
        onChange={(t) => onChange(withTime(value, t))}
      />
      {future ? (
        <View
          accessible
          accessibilityLiveRegion="polite"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
          <Icon as={CircleAlert} size={16} tone="danger" />
          <Text variant="footnote" tone="danger" style={{ flex: 1 }}>
            {i18n.t('ui.journal.when.future')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
