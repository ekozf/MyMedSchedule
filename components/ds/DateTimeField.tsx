/**
 * Field showing a formatted date or time, styled like `TextField` (field fill, radius 18, 68 tall,
 * 22/600 value, label 16/700 ink2), with a leading clock / calendar icon and a trailing chevron
 * (the same treatment as the add-medicine time rows). iOS: opens a Sheet with a spinner + Done.
 * Android: opens the native dialog directly. Time respects the profile's 24h setting.
 *
 * @example
 * <DateTimeField mode="time" label="Time" value={time} onChange={setTime} />
 * <DateTimeField mode="date" label="Expires" value={expiry} onChange={setExpiry}
 *   placeholder="No expiry date" minimumDate={new Date()} />
 */
import * as React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar, ChevronRight, Clock } from 'lucide-react-native';
import { format } from 'date-fns';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { radii, useTheme } from '@/lib/theme';
import { useTimeFormat } from '@/lib/ui/format';
import { PressableScale } from './PressableScale';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { Text } from './Text';
import { Icon } from './Icon';

export interface DateTimeFieldProps {
  mode: 'date' | 'time';
  value: Date | null;
  onChange: (date: Date) => void;
  label?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Sheet title on iOS. Defaults to "Choose a date/time". */
  sheetTitle?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function formatDateValue(date: Date): string {
  return format(date, 'd MMMM yyyy', { locale: getDateFnsLocale() });
}

function pickerLocale(is24h: boolean): string {
  const l = getCurrentLocale();
  if (l === 'nl') return is24h ? 'nl-NL' : 'en-US';
  if (l === 'tr') return is24h ? 'tr-TR' : 'en-US';
  return is24h ? 'en-GB' : 'en-US';
}

export function DateTimeField({
  mode,
  value,
  onChange,
  label,
  placeholder,
  minimumDate,
  maximumDate,
  sheetTitle,
  disabled,
  style,
}: DateTimeFieldProps) {
  const { colors, isDark } = useTheme();
  const { is24h, formatTime } = useTimeFormat();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Date>(value ?? new Date());

  const display = value ? (mode === 'time' ? formatTime(value) : formatDateValue(value)) : null;
  const defaultTitle = i18n.t(
    mode === 'time' ? 'ui.common.date.selectTime' : 'ui.common.date.selectDate'
  );

  const openPicker = () => {
    const initial = value ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode,
        is24Hour: is24h,
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(date);
        },
      });
      return;
    }
    if (Platform.OS === 'web') return; // not supported by the native picker
    setDraft(initial);
    setOpen(true);
  };

  return (
    <View style={[{ gap: 8 }, style]}>
      {label ? (
        <Text variant="subhead" weight="700" tone="secondary" style={{ paddingHorizontal: 4 }}>
          {label}
        </Text>
      ) : null}
      <PressableScale
        onPress={openPicker}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={[label, display ?? placeholder ?? defaultTitle]
          .filter(Boolean)
          .join(', ')}
        style={{
          minHeight: 68,
          borderRadius: radii.field,
          backgroundColor: colors.field,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 18,
          gap: 12,
          opacity: disabled ? 0.5 : 1,
        }}>
        <Icon as={mode === 'time' ? Clock : Calendar} size={24} tone="secondary" />
        <Text
          variant={display ? 'title3' : 'body'}
          weight={display ? '600' : '400'}
          tone={display ? 'primary' : 'secondary'}
          tabular={mode === 'time'}
          style={[{ flex: 1 }, display ? { letterSpacing: 0 } : null]}>
          {display ?? placeholder ?? defaultTitle}
        </Text>
        <Icon as={ChevronRight} size={24} tone="secondary" />
      </PressableScale>

      {Platform.OS === 'ios' ? (
        <Sheet
          visible={open}
          onClose={() => setOpen(false)}
          title={sheetTitle ?? defaultTitle}
          scrollable={false}
          footer={
            <Button
              label={i18n.t('ui.common.done')}
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            />
          }>
          <View style={{ alignItems: 'center' }}>
            <DateTimePicker
              value={draft}
              mode={mode}
              display="spinner"
              locale={pickerLocale(is24h)}
              is24Hour={is24h}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              themeVariant={isDark ? 'dark' : 'light'}
              textColor={colors.ink}
              onChange={(_e, date) => {
                if (date) setDraft(date);
              }}
            />
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}
