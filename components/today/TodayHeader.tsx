/**
 * Top of Today (docs/DESIGN.md §5.2): "**Monday** 9 November" with a labelled "Another day" chip
 * (calendar icon + words, opens the day picker), the time-aware greeting (`title1`, kept on one
 * line: it shrinks to 75 % before it would wrap) and the status line ("**2 of 5** taken · 3 more to go today.").
 * With several people in the app a small person chip (Avatar 32 + "Tom ▾", opens Settings) sits
 * under the greeting; the date row stays free of chips. The date never wraps; at large
 * text sizes (font scale ≥ 1.3) the day-picker chip collapses to its calendar icon.
 * On another day the bold part becomes "Yesterday" / "Tomorrow" / the weekday.
 *
 * @example
 * <TodayHeader date={selected} now={now} name="Margaret" status={statusLine(stats, kind)} onPickDay={open} />
 */
import * as React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { format, isSameDay, isSameYear } from 'date-fns';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { Chip, IconButton, Text } from '@/components/ds';
import { PersonChip } from '@/components/shell/ProfileChip';
import { formatDayLabel, formatLongDate } from '@/lib/ui/format';
import { greetingKey, splitBold } from './logic';

export interface TodayHeaderProps {
  date: Date;
  now: Date;
  name?: string;
  /** From `statusLine()`; `<b>…</b>` is shown bold. */
  status: string;
  onPickDay: () => void;
}

function capitalise(s: string): string {
  return s.length ? s.charAt(0).toLocaleUpperCase(getCurrentLocale()) + s.slice(1) : s;
}

export function TodayHeader({ date, now, name, status, onPickDay }: TodayHeaderProps) {
  const { fontScale } = useWindowDimensions();
  const compactPicker = fontScale >= 1.3;
  const isToday = isSameDay(date, now);
  const locale = getDateFnsLocale();
  const weekday = capitalise(format(date, 'EEEE', { locale }));
  const label = formatDayLabel(date, now); // Today / Yesterday / Tomorrow / weekday
  const bold = isToday ? weekday : label;
  const rest = format(date, isSameYear(date, now) ? 'd MMMM' : 'd MMMM yyyy', { locale });

  const greeting = i18n.t(greetingKey(now, isToday));
  const title = name?.trim()
    ? i18n.t('ui.today.greeting.withName', { greeting, name: name.trim() })
    : greeting;

  return (
    <View style={{ gap: 6, paddingTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
        <Text
          variant="body"
          style={{ flex: 1, flexShrink: 1 }}
          numberOfLines={1}
          accessibilityRole="header"
          accessibilityLabel={formatLongDate(date, now)}>
          <Text variant="body" weight="700">
            {bold}
          </Text>{' '}
          {rest}
        </Text>
        {compactPicker ? (
          <IconButton
            icon={CalendarDays}
            accessibilityLabel={i18n.t('ui.today.a11y.chooseDay')}
            onPress={onPickDay}
          />
        ) : (
          <Chip
            size="sm"
            icon={CalendarDays}
            label={i18n.t('ui.today.dayPicker.title')}
            accessibilityLabel={i18n.t('ui.today.a11y.chooseDay')}
            onPress={onPickDay}
            style={{ paddingHorizontal: 16 }}
          />
        )}
      </View>
      <Text
        variant="title1"
        accessibilityRole="header"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}>
        {title}
      </Text>
      <PersonChip />
      <Text variant="callout" tone="secondary">
        {splitBold(status).map((p, i) =>
          p.bold ? (
            <Text key={i} variant="callout" weight="800" tone="primary">
              {p.text}
            </Text>
          ) : (
            <React.Fragment key={i}>{p.text}</React.Fragment>
          )
        )}
      </Text>
    </View>
  );
}
