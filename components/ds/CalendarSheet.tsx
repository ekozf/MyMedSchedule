/**
 * Month calendar in a Sheet. Week starts per locale (Sunday for en, Monday for nl/tr).
 * Selecting a day calls `onChange(day)` and then `onClose()`.
 *
 * @example
 * <CalendarSheet
 *   visible={open}
 *   onClose={() => setOpen(false)}
 *   value={selectedDay}
 *   onChange={setSelectedDay}
 *   renderDayDot={(d) => (hasLate(d) ? 'warning' : allTaken(d) ? 'success' : null)}
 * />
 */
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { useTheme } from '@/lib/theme';
import { haptics } from '@/lib/ui/haptics';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { Button } from './Button';

export type DayDotTone = 'success' | 'warning' | 'danger' | 'accent' | null;

export interface CalendarSheetProps {
  visible: boolean;
  onClose: () => void;
  value: Date;
  onChange: (date: Date) => void;
  renderDayDot?: (date: Date) => DayDotTone;
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
  /** Called when the visible month changes (e.g. to load dots). */
  onMonthChange?: (month: Date) => void;
}

const CELL = 44;

export function getWeekStartsOn(): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return (getDateFnsLocale().options?.weekStartsOn ?? 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function CalendarSheet({
  visible,
  onClose,
  value,
  onChange,
  renderDayDot,
  minimumDate,
  maximumDate,
  title,
  onMonthChange,
}: CalendarSheetProps) {
  const { colors } = useTheme();
  const [month, setMonth] = React.useState(() => startOfMonth(value));

  React.useEffect(() => {
    if (visible) setMonth(startOfMonth(value));
  }, [visible, value]);

  const changeMonth = (delta: number) => {
    haptics.tap();
    const next = addMonths(month, delta);
    setMonth(next);
    onMonthChange?.(next);
  };

  const locale = getDateFnsLocale();
  const weekStartsOn = getWeekStartsOn();
  const today = new Date();
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn });
  const days: Date[] = [];
  for (let d = gridStart; !isAfter(d, gridEnd); d = addDays(d, 1)) days.push(d);
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const monthLabel = format(month, 'LLLL yyyy', { locale });
  const monthTitle =
    monthLabel.charAt(0).toLocaleUpperCase(getCurrentLocale()) + monthLabel.slice(1);
  const prevDisabled = !!minimumDate && !isAfter(startOfMonth(month), startOfMonth(minimumDate));
  const nextDisabled = !!maximumDate && !isBefore(startOfMonth(month), startOfMonth(maximumDate));
  const showToday = !isSameMonth(month, today);

  const outOfRange = (d: Date) =>
    (!!minimumDate && isBefore(d, startOfDay(minimumDate))) ||
    (!!maximumDate && isAfter(startOfDay(d), startOfDay(maximumDate)));

  return (
    <Sheet visible={visible} onClose={onClose} title={title} scrollable={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text variant="title3" style={{ flex: 1 }} accessibilityRole="header">
          {monthTitle}
        </Text>
        {showToday ? (
          <Button
            label={i18n.t('ui.common.today')}
            variant="plain"
            size="sm"
            haptic="tap"
            onPress={() => {
              const m = startOfMonth(today);
              setMonth(m);
              onMonthChange?.(m);
            }}
          />
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, marginLeft: 4 }}>
          <IconButton
            icon={ChevronLeft}
            variant="tinted"
            haptic="none"
            disabled={prevDisabled}
            accessibilityLabel={i18n.t('ui.common.a11y.previousMonth')}
            onPress={() => changeMonth(-1)}
          />
          <IconButton
            icon={ChevronRight}
            variant="tinted"
            haptic="none"
            disabled={nextDisabled}
            accessibilityLabel={i18n.t('ui.common.a11y.nextMonth')}
            onPress={() => changeMonth(1)}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        {weeks[0].map((d) => (
          <View key={d.toISOString()} style={{ width: CELL, alignItems: 'center' }}>
            <Text variant="footnote" tone="tertiary" weight="600">
              {format(d, 'EEEEE', { locale }).toLocaleUpperCase(getCurrentLocale())}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 4, paddingBottom: 8 }}>
        {weeks.map((week) => (
          <View
            key={week[0].toISOString()}
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {week.map((d) => {
              const inMonth = isSameMonth(d, month);
              if (!inMonth)
                return <View key={d.toISOString()} style={{ width: CELL, height: CELL + 6 }} />;
              const selected = isSameDay(d, value);
              const isToday = isSameDay(d, today);
              const disabled = outOfRange(d);
              const dot = renderDayDot?.(d) ?? null;
              return (
                <Pressable
                  key={d.toISOString()}
                  disabled={disabled}
                  onPress={() => {
                    haptics.tap();
                    onChange(d);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={format(d, 'PPPP', { locale })}
                  accessibilityState={{ selected, disabled }}
                  style={{ width: CELL, height: CELL + 6, alignItems: 'center' }}>
                  <View
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: CELL / 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? colors.accent : 'transparent',
                      borderWidth: isToday && !selected ? 2 : 0,
                      borderColor: colors.accent,
                      opacity: disabled ? 0.35 : 1,
                    }}>
                    <Text
                      variant="body"
                      weight={selected || isToday ? '700' : '400'}
                      tone={selected ? 'onAccent' : isToday ? 'accent' : 'primary'}
                      tabular>
                      {format(d, 'd')}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      marginTop: 1,
                      backgroundColor: dot ? colors[dot] : 'transparent',
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </Sheet>
  );
}
