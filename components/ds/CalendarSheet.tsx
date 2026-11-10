/**
 * Month calendar (docs/DESIGN.md §4): month title 20/800 with 44 px round prev/next, weekday
 * headers 13/700, 46-tall day cells; selected = accent fill with `onAccent` text, today = 2 px
 * accent outline with ink text, days with entries = `field`, `markedDays` = a small dot under the
 * number (e.g. days with journal entries), other-month days in `line2`. Week
 * starts per locale. The month title ("November 2026 ▾") opens a month/year picker in place: a
 * year with ‹ › arrows and the twelve months, so far-away dates are a few taps away.
 *
 * `Calendar` is the bare grid; `CalendarSheet` puts it in a Sheet and closes after a pick.
 *
 * @example
 * <CalendarSheet
 *   visible={open}
 *   onClose={() => setOpen(false)}
 *   title="Another day"
 *   value={day}
 *   onChange={setDay}
 *   markedDays={(d) => loggedDays.has(startOfDay(d).getTime())}
 *   footer={<Button variant="quiet" label="Back to today" onPress={…} />}
 * />
 */
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react-native';
import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { radii, useTheme } from '@/lib/theme';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { IconButton } from './IconButton';

export interface CalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  /** Days that have entries get a `field` fill. */
  hasEntries?: (date: Date) => boolean;
  /** Days that get a small dot under the number. Default: none. */
  markedDays?: (date: Date) => boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Called when the visible month changes (e.g. to load entries). */
  onMonthChange?: (month: Date) => void;
}

export interface CalendarSheetProps extends CalendarProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Sticky footer under the grid (e.g. a quiet "Back to today"). */
  footer?: React.ReactNode;
}

const CELL_H = 46;

export function getWeekStartsOn(): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return (getDateFnsLocale().options?.weekStartsOn ?? 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function Calendar({
  value,
  onChange,
  hasEntries,
  markedDays,
  minimumDate,
  maximumDate,
  onMonthChange,
}: CalendarProps) {
  const { colors } = useTheme();
  const [month, setMonth] = React.useState(() => startOfMonth(value));
  const [picking, setPicking] = React.useState(false);

  const valueTime = value.getTime();
  React.useEffect(() => {
    setMonth(startOfMonth(new Date(valueTime)));
    setPicking(false);
  }, [valueTime]);

  const goToMonth = (next: Date) => {
    setMonth(next);
    onMonthChange?.(next);
  };
  const changeMonth = (delta: number) => goToMonth(addMonths(month, delta));

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

  const outOfRange = (d: Date) =>
    (!!minimumDate && isBefore(d, startOfDay(minimumDate))) ||
    (!!maximumDate && isAfter(startOfDay(d), startOfDay(maximumDate)));

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <PressableScale
          onPress={() => setPicking((p) => !p)}
          accessibilityRole="button"
          accessibilityLabel={
            picking
              ? i18n.t('ui.common.a11y.closeMonthPicker', { month: monthTitle })
              : i18n.t('ui.common.a11y.chooseMonth', { month: monthTitle })
          }
          accessibilityState={{ expanded: picking }}
          style={{
            flex: 1,
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
          }}>
          <Text
            variant="title3"
            weight="800"
            style={{ flexShrink: 1, fontSize: 20, lineHeight: 25 }}
            accessibilityRole="header">
            {monthTitle}
          </Text>
          <Icon as={picking ? ChevronUp : ChevronDown} size={22} tone="accent" />
        </PressableScale>
        {picking ? null : (
          <>
            <IconButton
              icon={ChevronLeft}
              size="sm"
              disabled={prevDisabled}
              accessibilityLabel={i18n.t('ui.common.a11y.previousMonth')}
              onPress={() => changeMonth(-1)}
            />
            <IconButton
              icon={ChevronRight}
              size="sm"
              disabled={nextDisabled}
              accessibilityLabel={i18n.t('ui.common.a11y.nextMonth')}
              onPress={() => changeMonth(1)}
            />
          </>
        )}
      </View>

      {picking ? (
        <MonthYearPicker
          month={month}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onPick={(m) => {
            goToMonth(m);
            setPicking(false);
          }}
        />
      ) : (
        <>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            {weeks[0].map((d) => (
              <View key={d.toISOString()} style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="caption" tone="secondary">
                  {format(d, 'EEEEEE', { locale })}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ gap: 4 }}>
            {weeks.map((week) => (
              <View key={week[0].toISOString()} style={{ flexDirection: 'row', gap: 4 }}>
                {week.map((d) => {
                  const inMonth = isSameMonth(d, month);
                  const selected = isSameDay(d, value);
                  const isToday = isSameDay(d, today);
                  const disabled = outOfRange(d);
                  const entries = hasEntries?.(d) ?? false;
                  const marked = inMonth && (markedDays?.(d) ?? false);
                  // Selected = accent fill; today (when not selected) = accent outline, ink text.
                  const bg = selected
                    ? colors.accent
                    : entries && inMonth
                      ? colors.field
                      : 'transparent';
                  const fg = selected
                    ? colors.onAccent
                    : inMonth || isToday
                      ? colors.ink
                      : colors.line2;
                  return (
                    <Pressable
                      key={d.toISOString()}
                      disabled={disabled}
                      onPress={() => onChange(d)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        marked
                          ? `${format(d, 'PPPP', { locale })}, ${i18n.t('ui.common.hasEntries')}`
                          : format(d, 'PPPP', { locale })
                      }
                      accessibilityState={{ selected, disabled }}
                      style={{
                        flex: 1,
                        height: CELL_H,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: bg,
                        borderWidth: 2,
                        borderColor: isToday && !selected ? colors.accent : 'transparent',
                        opacity: disabled ? 0.35 : 1,
                      }}>
                      <Text
                        variant="callout"
                        weight={isToday || selected ? '800' : '600'}
                        color={fg}
                        tabular>
                        {format(d, 'd')}
                      </Text>
                      {marked ? (
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 5,
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: selected ? colors.onAccent : colors.accent,
                          }}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

/** Year with ‹ › and a 3-column grid of the twelve months; out-of-range months are disabled. */
function MonthYearPicker({
  month,
  minimumDate,
  maximumDate,
  onPick,
}: {
  month: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onPick: (month: Date) => void;
}) {
  const { colors } = useTheme();
  const locale = getDateFnsLocale();
  const [year, setYear] = React.useState(() => startOfYear(month));
  const prevDisabled = !!minimumDate && isBefore(endOfYear(addYears(year, -1)), minimumDate);
  const nextDisabled = !!maximumDate && isAfter(addYears(year, 1), maximumDate);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(year, i));
  const rows = [0, 3, 6, 9].map((i) => months.slice(i, i + 3));
  const outOfRange = (m: Date) =>
    (!!minimumDate && isBefore(endOfMonth(m), startOfDay(minimumDate))) ||
    (!!maximumDate && isAfter(m, maximumDate));

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconButton
          icon={ChevronLeft}
          size="sm"
          disabled={prevDisabled}
          accessibilityLabel={i18n.t('ui.common.a11y.previousYear')}
          onPress={() => setYear((y) => addYears(y, -1))}
        />
        <Text
          variant="title3"
          weight="800"
          align="center"
          tabular
          style={{ flex: 1 }}
          accessibilityLiveRegion="polite">
          {format(year, 'yyyy')}
        </Text>
        <IconButton
          icon={ChevronRight}
          size="sm"
          disabled={nextDisabled}
          accessibilityLabel={i18n.t('ui.common.a11y.nextYear')}
          onPress={() => setYear((y) => addYears(y, 1))}
        />
      </View>
      {rows.map((row) => (
        <View key={row[0].toISOString()} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((m) => {
            const selected = isSameMonth(m, month);
            const disabled = outOfRange(m);
            const label = format(m, 'LLLL', { locale });
            const title = label.charAt(0).toLocaleUpperCase(getCurrentLocale()) + label.slice(1);
            return (
              <Pressable
                key={m.toISOString()}
                disabled={disabled}
                onPress={() => onPick(m)}
                accessibilityRole="button"
                accessibilityLabel={format(m, 'LLLL yyyy', { locale })}
                accessibilityState={{ selected, disabled }}
                style={{
                  flex: 1,
                  minHeight: 52,
                  borderRadius: radii.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                  backgroundColor: selected ? colors.accent : colors.field,
                  opacity: disabled ? 0.35 : 1,
                }}>
                <Text
                  variant="callout"
                  weight="700"
                  align="center"
                  color={selected ? colors.onAccent : colors.ink}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}>
                  {title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function CalendarSheet({
  visible,
  onClose,
  title,
  footer,
  onChange,
  ...rest
}: CalendarSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} scrollable={false} footer={footer}>
      <Calendar
        {...rest}
        onChange={(d) => {
          onChange(d);
          onClose();
        }}
      />
    </Sheet>
  );
}
