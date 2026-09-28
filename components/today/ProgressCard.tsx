/**
 * Day summary: progress ring (taken + partial ÷ scheduled) + one line of context
 * ("Next: Metformin at 20:00" · "1 dose is late" · "All done for today" · "5 doses planned").
 *
 * @example
 * <ProgressCard stats={computeDayStats(entries)} dayKind="today" firstTime={entries[0]?.dose.time} />
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import {
  Bell,
  CalendarClock,
  Check,
  CircleAlert,
  Clock,
  MoonStar,
  type LucideIcon,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Card, Icon, ProgressRing, Text, type Tone } from '@/components/ds';
import { useTimeFormat } from '@/lib/ui/format';
import type { DayStats } from './logic';

export type DayKind = 'past' | 'today' | 'future';

export interface ProgressCardProps {
  stats: DayStats;
  dayKind: DayKind;
  /** First dose of the day (future days: "First one at 08:00"). */
  firstTime?: Date;
}

interface Context {
  icon: LucideIcon;
  tone: Tone;
  text: string;
}

export function ProgressCard({ stats, dayKind, firstTime }: ProgressCardProps) {
  const { formatTime } = useTimeFormat();
  const reduceMotion = useReducedMotion();
  const { total, done, handled, skipped, late, missed, due, next } = stats;

  const future = dayKind === 'future';
  const allHandled = total > 0 && handled >= total;
  const complete = !future && allHandled;

  let title: string;
  let context: Context | null = null;

  if (future) {
    title = i18n.t('ui.today.progress.planned', { count: total });
    if (firstTime)
      context = {
        icon: CalendarClock,
        tone: 'secondary',
        text: i18n.t('ui.today.progress.firstAt', { time: formatTime(firstTime) }),
      };
  } else {
    title = i18n.t('ui.today.progress.takenOf', { taken: done, total });
    if (late > 0) {
      context = {
        icon: CircleAlert,
        tone: 'warning',
        text: i18n.t('ui.today.progress.late', { count: late }),
      };
    } else if (missed > 0) {
      context = {
        icon: CircleAlert,
        tone: 'warning',
        text: i18n.t('ui.today.progress.notLogged', { count: missed }),
      };
    } else if (complete) {
      context = {
        icon: Check,
        tone: 'success',
        text: i18n.t(
          dayKind === 'today' ? 'ui.today.progress.allDone' : 'ui.today.progress.allDonePast'
        ),
      };
    } else if (due) {
      context = {
        icon: Bell,
        tone: 'accent',
        text: i18n.t('ui.today.progress.due', { name: due.dose.medicationName }),
      };
    } else if (next) {
      context = {
        icon: Clock,
        tone: 'secondary',
        text: i18n.t('ui.today.progress.next', {
          name: next.dose.medicationName,
          time: formatTime(next.dose.time),
        }),
      };
    } else {
      context = {
        icon: MoonStar,
        tone: 'secondary',
        text: i18n.t('ui.today.progress.nextTomorrow'),
      };
    }
  }

  const progress = future ? 0 : total ? done / total : 0;

  return (
    <Card
      tone={complete ? 'success' : 'default'}
      accessible
      accessibilityLabel={[title, context?.text].filter(Boolean).join(', ')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <ProgressRing
          progress={complete ? 1 : progress}
          size={76}
          strokeWidth={9}
          tone={complete ? 'success' : 'accent'}>
          {complete ? (
            <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(300)}>
              <Icon as={Check} size={30} tone="success" strokeWidth={3} />
            </Animated.View>
          ) : future ? (
            <Icon as={CalendarClock} size={26} tone="accent" />
          ) : (
            <Text variant="headline" tabular>
              {done}/{total}
            </Text>
          )}
        </ProgressRing>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title3">{title}</Text>
          {context ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon as={context.icon} size={16} tone={context.tone} strokeWidth={2.4} />
              <Text
                variant="subhead"
                tone={context.tone}
                weight={context.tone === 'secondary' ? undefined : '600'}
                style={{ flex: 1 }}>
                {context.text}
              </Text>
            </View>
          ) : null}
          {!future && skipped > 0 ? (
            <Text variant="footnote" tone="tertiary">
              {i18n.t('ui.today.progress.skipped', { count: skipped })}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
