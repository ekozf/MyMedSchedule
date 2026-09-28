/**
 * Seven day capsules for the selected week. Past days and today carry a tiny progress ring
 * (taken ÷ scheduled). The selected day sits on an accent capsule that springs between days.
 * Swipe horizontally to page to the previous / next week.
 *
 * @example
 * <WeekStrip days={week} selected={day} today={today} onSelect={setDay} onChangeWeek={shiftWeek} />
 */
import * as React from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { format, isAfter, isSameDay, startOfDay } from 'date-fns';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { PressableScale, Text, SPRING, haptics, useTheme, withAlpha } from '@/components/ds';
import { formatLongDate } from '@/lib/ui/format';
import { MiniRing } from './MiniRing';

export interface WeekDay {
  date: Date;
  total: number;
  /** taken + partial */
  done: number;
  /** taken + partial + skipped */
  handled: number;
}

export interface WeekStripProps {
  days: WeekDay[];
  selected: Date;
  today: Date;
  onSelect: (date: Date) => void;
  /** Swipe paged to another week. */
  onChangeWeek: (delta: 1 | -1) => void;
}

const CAPSULE_HEIGHT = 76;
const RING = 36;
const SWIPE_DISTANCE = 0.22; // of the strip width
const SWIPE_VELOCITY = 500;

export function WeekStrip({ days, selected, today, onSelect, onChangeWeek }: WeekStripProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = React.useState(0);
  const cell = width / 7;
  const selectedIndex = days.findIndex((d) => isSameDay(d.date, selected));

  // Sliding selection capsule
  const indicatorX = useSharedValue(0);
  const firstLayout = React.useRef(true);
  React.useEffect(() => {
    if (!cell || selectedIndex < 0) return;
    const target = selectedIndex * cell;
    if (firstLayout.current || reduceMotion) {
      indicatorX.value = target;
      firstLayout.current = false;
    } else {
      indicatorX.value = withSpring(target, SPRING);
    }
  }, [cell, selectedIndex, reduceMotion, indicatorX]);

  // Week paging
  const tx = useSharedValue(0);
  const weekKey = days[0]?.date.getTime() ?? 0;
  const prevWeekKey = React.useRef(weekKey);
  React.useLayoutEffect(() => {
    const prev = prevWeekKey.current;
    prevWeekKey.current = weekKey;
    if (prev === weekKey || !width) return;
    if (reduceMotion) {
      tx.value = 0;
      return;
    }
    // New week slides in from the side it came from.
    const dir = weekKey > prev ? 1 : -1;
    tx.value = dir * width * 0.6;
    tx.value = withSpring(0, SPRING);
    // Selection capsule jumps with the content instead of sliding across.
    if (cell && selectedIndex >= 0) indicatorX.value = selectedIndex * cell;
  }, [weekKey, width, reduceMotion, tx, cell, selectedIndex, indicatorX]);

  const commitSwipe = React.useCallback(
    (delta: 1 | -1) => {
      haptics.tap();
      onChangeWeek(delta);
    },
    [onChangeWeek]
  );

  const pan = Gesture.Pan()
    .enabled(width > 0)
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      tx.value = e.translationX;
    })
    .onEnd((e) => {
      const far = Math.abs(e.translationX) > width * SWIPE_DISTANCE;
      const fast = Math.abs(e.velocityX) > SWIPE_VELOCITY;
      if ((far || fast) && Math.sign(e.translationX) === Math.sign(e.velocityX || e.translationX)) {
        const delta: 1 | -1 = e.translationX < 0 ? 1 : -1;
        tx.value = withTiming(
          -delta * width * 0.6,
          { duration: 140, easing: Easing.in(Easing.quad) },
          (finished) => {
            if (finished) scheduleOnRN(commitSwipe, delta);
          }
        );
      } else {
        tx.value = withSpring(0, SPRING);
      }
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    opacity: width ? interpolate(Math.abs(tx.value), [0, width * 0.6], [1, 0.15], 'clamp') : 1,
  }));
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const locale = getDateFnsLocale();
  const todayStart = startOfDay(today);

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={onLayout}
        accessibilityLabel={
          days[0] ? i18n.t('ui.today.a11y.week', { date: formatLongDate(days[0].date) }) : undefined
        }
        accessibilityHint={i18n.t('ui.today.a11y.weekHint')}
        style={{ minHeight: CAPSULE_HEIGHT, marginHorizontal: -4 }}>
        <Animated.View style={[{ flexDirection: 'row' }, contentStyle]}>
          {cell > 0 && selectedIndex >= 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: cell,
                  paddingHorizontal: 4,
                },
                indicatorStyle,
              ]}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 999,
                  backgroundColor: colors.accent,
                  shadowColor: colors.accent,
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                }}
              />
            </Animated.View>
          ) : null}
          {days.map((d, i) => {
            const isSelected = i === selectedIndex;
            const isToday = isSameDay(d.date, today);
            const inFuture = isAfter(startOfDay(d.date), todayStart);
            const showRing = !inFuture && d.total > 0;
            const allDone = d.total > 0 && d.handled >= d.total;
            const ringColor = isSelected
              ? colors.onAccent
              : allDone
                ? colors.success
                : colors.accent;
            const trackColor = isSelected ? withAlpha(colors.onAccent, 0.3) : colors.separator;
            const initial = format(d.date, 'EEEEE', { locale }).toLocaleUpperCase(
              getCurrentLocale()
            );
            const labelParts = [formatLongDate(d.date)];
            if (d.total === 0) labelParts.push(i18n.t('ui.today.a11y.noDoses'));
            else if (!inFuture)
              labelParts.push(
                i18n.t('ui.today.a11y.dayProgress', { taken: d.done, total: d.total })
              );
            return (
              <PressableScale
                key={d.date.toISOString()}
                haptic="none"
                activeScale={0.94}
                onPress={() => {
                  if (!isSelected) haptics.tap();
                  onSelect(d.date);
                }}
                accessibilityRole="button"
                accessibilityLabel={labelParts.join(', ')}
                accessibilityState={{ selected: isSelected }}
                style={{
                  flex: 1,
                  minHeight: CAPSULE_HEIGHT,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 8,
                  gap: 4,
                }}>
                <Text
                  variant="footnote"
                  weight="600"
                  tone={isSelected ? 'onAccent' : isToday ? 'accent' : 'tertiary'}>
                  {initial}
                </Text>
                <MiniRing
                  size={RING}
                  progress={showRing ? (d.total ? d.done / d.total : 0) : null}
                  color={ringColor}
                  track={trackColor}>
                  <Text
                    variant="headline"
                    tabular
                    weight={isSelected || isToday ? '700' : '500'}
                    tone={isSelected ? 'onAccent' : isToday ? 'accent' : 'primary'}>
                    {format(d.date, 'd')}
                  </Text>
                </MiniRing>
              </PressableScale>
            );
          })}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
