/**
 * "Up next" on Today, under the tray. Kept small so the amber compartment stays the one obvious
 * thing to press:
 *
 * - A dose is due or late: a compact banner in `now` fill with a 2 px `nowInk` border.
 *   Left: "Metformin · 4 hours late" (headline) and "1 pill · planned for 08:00" (footnote);
 *   tapping that text opens the compartment sheet. Right: one 56-tall primary "I took it".
 *   At large font sizes the button moves under the text, full width.
 * - The next dose isn't due yet: one tappable `field` row with a chevron, "Next: Metformin"
 *   (headline) over "1 pill at 20:00, in 7 hours" (footnote), that opens that compartment's sheet
 *   (where it can be taken early).
 *
 * - Nothing left today but a later dose exists (`later`, e.g. a medicine added after its times
 *   passed): the same row, not tappable and without a chevron, "Next: Metformin 500 mg" over
 *   "1 pill tomorrow at 08:00".
 *
 * Renders nothing when there is no next dose ("All done for today." is already the status line
 * under the greeting).
 *
 * @example
 * <UpNext entry={next} name="Metformin 500 mg" compartment="evening" now={now} onTake={take} onOpen={openSheet} />
 */
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Button, Icon, PressableScale, Text, radii, useTheme } from '@/components/ds';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import type { CompartmentId } from '@/types';
import { upNextIsDue, upNextWhen, type DoseEntry } from './logic';

export interface UpNextProps {
  entry: DoseEntry | null;
  /** Name plus strength ("Metformin 500 mg"); see `doseName`. */
  name?: string;
  /** Compartment of `entry` (the sheet to open). */
  compartment: CompartmentId | null;
  now: Date;
  busy?: boolean;
  onTake: () => void;
  onOpen: () => void;
  /** Shown when `entry` is null: the first dose on a later day. */
  later?: UpNextLater | null;
}

export interface UpNextLater {
  /** "Metformin 500 mg". */
  name: string;
  dose: ScheduledDose;
  /** "tomorrow at 08:00"; see `laterWhen`. */
  when: string;
}

/** Above this font scale the banner's button stacks under the text. */
const STACK_FONT_SCALE = 1.2;

export function UpNext({
  entry,
  name: displayName,
  compartment,
  now,
  busy = false,
  onTake,
  onOpen,
  later,
}: UpNextProps) {
  const { colors } = useTheme();
  const { formatTime } = useTimeFormat();
  const { fontScale } = useWindowDimensions();

  const rowStyle = {
    minHeight: 64,
    backgroundColor: colors.field,
    borderRadius: radii.group,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  };

  if (!entry) {
    if (!later) return null;
    const laterTitle = i18n.t('ui.today.upNext.nextTitle', { name: later.name });
    const laterDetail = i18n.t('ui.today.upNext.laterDetail', {
      dose: formatDose(later.dose.dosageAmount, later.dose.dosageUnit),
      when: later.when,
    });
    return (
      <View
        accessible
        accessibilityLabel={`${laterTitle}. ${laterDetail}`}
        style={[rowStyle, { paddingRight: 16 }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline">{laterTitle}</Text>
          <Text variant="footnote" tone="secondary" tabular>
            {laterDetail}
          </Text>
        </View>
      </View>
    );
  }

  const { dose } = entry;
  const name = displayName ?? dose.medicationName;
  const when = upNextWhen(entry, now);
  const amount = formatDose(dose.dosageAmount, dose.dosageUnit);
  const time = formatTime(dose.time);
  const openHint = compartment ? i18n.t(`ui.today.upNext.open.${compartment}`) : undefined;

  if (!upNextIsDue(entry)) {
    const nextTitle = i18n.t('ui.today.upNext.nextTitle', { name });
    const nextDetail = i18n.t('ui.today.upNext.nextDetail', { dose: amount, time, when });
    return (
      <PressableScale
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${nextTitle}. ${nextDetail}`}
        accessibilityHint={openHint}
        style={rowStyle}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline">{nextTitle}</Text>
          <Text variant="footnote" tone="secondary" tabular>
            {nextDetail}
          </Text>
        </View>
        <Icon as={ChevronRight} tone="secondary" />
      </PressableScale>
    );
  }

  const title = i18n.t('ui.today.upNext.bannerTitle', { name, when });
  const detail = i18n.t('ui.today.upNext.detail', { dose: amount, time });
  const stacked = fontScale > STACK_FONT_SCALE;

  return (
    <View
      style={{
        backgroundColor: colors.now,
        borderColor: colors.nowInk,
        borderWidth: 2,
        borderRadius: radii.card,
        paddingVertical: 12,
        paddingLeft: 16,
        paddingRight: stacked ? 16 : 12,
        flexDirection: stacked ? 'column' : 'row',
        alignItems: stacked ? 'stretch' : 'center',
        gap: 12,
      }}>
      <PressableScale
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${detail}`}
        accessibilityHint={openHint}
        style={{ flex: stacked ? undefined : 1, minHeight: 48, justifyContent: 'center' }}>
        <Text variant="headline" color={colors.nowInk} tabular>
          {title}
        </Text>
        <Text variant="footnote" color={colors.nowInk} tabular style={{ marginTop: 2 }}>
          {detail}
        </Text>
      </PressableScale>
      <Button
        label={i18n.t('ui.today.upNext.take')}
        loading={busy}
        onPress={onTake}
        fullWidth={stacked}
        accessibilityLabel={i18n.t('ui.today.dose.takeA11y', { name })}
        accessibilityHint={i18n.t('ui.today.a11y.takeHint')}
        style={{ minHeight: 56, paddingHorizontal: 18, alignSelf: stacked ? 'stretch' : 'center' }}
      />
    </View>
  );
}
