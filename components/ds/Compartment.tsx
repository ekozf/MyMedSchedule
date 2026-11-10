/**
 * One day slot of the pill box (docs/DESIGN.md §4): 150 min height, radius 22, label 17/700,
 * big number in `display` with a small 20/600 part, sub line 15/500 (wraps; at most two lines with
 * an ellipsis on a pending slot).
 * Not finished: the count still to take, then "dose(s) to take" ("1 dose to take"); never a big "0", whose
 * slashed zero reads as a letter at display size. Finished (`done`): "taken/total" ("2/2"), or a
 * 40 px check in `doneInk` when only partial doses were taken. Finished with nothing taken (only
 * skipped, `skipped`): neutral `field` fill, no check, the word "Skipped" in title3 `ink2`.
 * States: `default` (field; with doses still to take and `onPress`, a 2 px `accent` 50 % outline
 * and a 20 px `ink2` chevron top-right beside the label so a pending, not-yet-due slot reads as tappable), `now` (now fill + 2 px nowInk border), `done` (done fill, animates in
 * over 300 ms), `skipped` (field), `empty` (2 px dashed `line` border, quieter subhead label,
 * `emptyText` directly under the label, top aligned, instead of a count). An empty tile with `minHeight` under 100 (the Today tray's
 * compact row of two empty slots, 84) centres its two lines instead of spreading them.
 *
 * @example
 * <Compartment label="Morning" taken={2} total={2} sub="All taken" state="done" onPress={open} />
 * <Compartment label="Evening" taken={0} total={2} toTake={2} sub="From 20:00" state="now" onPress={open} />
 * <Compartment label="Night" state="empty" emptyText="Nothing tonight" />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Check, ChevronRight } from 'lucide-react-native';
import { DURATION, radii, useTheme, withAlpha } from '@/lib/theme';
import { compartmentA11yLabel, compartmentFigure } from './compartment-label';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type CompartmentState = 'default' | 'now' | 'done' | 'skipped' | 'empty';

export interface CompartmentProps {
  label: string;
  state: CompartmentState;
  taken?: number;
  total?: number;
  /** Doses still to take, shown big when not `done`. Default `total - taken`. */
  toTake?: number;
  /** "All taken", "Due at 10:00", "2 late"… */
  sub?: string;
  /** Shown instead of the count when `state="empty"` ("Nothing tonight"). */
  emptyText?: string;
  onPress?: () => void;
  /** Minimum tile height. Default 150 (smaller only for illustrations, e.g. the Welcome pill box). */
  minHeight?: number;
  /**
   * Default: "Morning, 2 of 2 doses taken, All taken" / "Morning, 1 dose to take, Due at 20:00" /
   * "Morning, none taken, 1 skipped".
   */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Compartment({
  label,
  state,
  taken = 0,
  total = 0,
  toTake,
  sub,
  emptyText,
  onPress,
  minHeight = 150,
  accessibilityLabel,
  style,
}: CompartmentProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const done = useSharedValue(state === 'done' ? 1 : 0);

  React.useEffect(() => {
    done.value = withTiming(state === 'done' ? 1 : 0, {
      duration: reduceMotion ? 1 : DURATION.take,
    });
  }, [state, reduceMotion, done]);

  const base = state === 'now' ? colors.now : state === 'empty' ? colors.bg : colors.field;
  const doneFill = colors.done;
  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(done.value, [0, 1], [base, doneFill]),
  }));

  const ink = state === 'done' ? colors.doneInk : state === 'now' ? colors.nowInk : colors.ink;
  const labelInk =
    state === 'done' ? colors.doneInk : state === 'now' ? colors.nowInk : colors.ink2;

  const finished = state === 'done';
  const left = toTake ?? Math.max(0, total - taken);
  const figure = compartmentFigure(state, taken, total, left);
  // Doses still to take but not due yet: a soft accent outline and a chevron say "tap to open".
  const pending = state === 'default' && left > 0 && !!onPress;

  const a11y =
    accessibilityLabel ??
    compartmentA11yLabel({ label, state, taken, total, left, sub, emptyText });

  const content = (
    <Animated.View
      style={[
        {
          // Grow to the row's height so both tiles in a tray row match when text wraps.
          flexGrow: 1,
          minHeight,
          borderRadius: radii.card,
          padding: 16,
          // Empty slots stay light (2 px dashed hairline colour) so the filled ones lead.
          borderWidth: 2,
          borderStyle: state === 'empty' ? 'dashed' : 'solid',
          borderColor:
            state === 'now'
              ? colors.nowInk
              : state === 'empty'
                ? colors.line
                : pending
                  ? withAlpha(colors.accent, 0.5)
                  : 'transparent',
          // Empty: the message sits right under the label (where a sibling's number starts), or
          // both lines are centred in the compact 84-tall row.
          justifyContent:
            state === 'empty' ? (minHeight < 100 ? 'center' : 'flex-start') : 'space-between',
          gap: state === 'empty' ? (minHeight < 100 ? 2 : 8) : 8,
        },
        fillStyle,
      ]}>
      {state === 'empty' ? (
        <Text variant="subhead" color={colors.ink2}>
          {label}
        </Text>
      ) : pending ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="callout" weight="700" color={labelInk} style={{ flex: 1 }}>
            {label}
          </Text>
          <Icon as={ChevronRight} size={20} color={colors.ink2} />
        </View>
      ) : (
        <Text variant="callout" weight="700" color={labelInk}>
          {label}
        </Text>
      )}
      {state === 'empty' ? (
        <Text variant="footnote" color={colors.ink2}>
          {emptyText}
        </Text>
      ) : (
        <View>
          {figure.kind === 'check' ? (
            <Icon as={Check} size={40} strokeWidth={2.5} color={colors.doneInk} />
          ) : figure.kind === 'word' ? (
            <Text variant="title3" color={colors.ink2}>
              {figure.text}
            </Text>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                columnGap: finished ? 0 : 6,
              }}>
              <Text variant="display" tabular color={ink}>
                {figure.big}
              </Text>
              <Text tabular weight="600" color={ink} style={{ fontSize: 20, lineHeight: 26 }}>
                {figure.small}
              </Text>
            </View>
          )}
          {sub ? (
            <Text
              variant="footnote"
              color={state === 'default' || state === 'skipped' ? colors.ink2 : ink}
              numberOfLines={pending ? 2 : undefined}
              ellipsizeMode="tail">
              {sub}
            </Text>
          ) : null}
        </View>
      )}
    </Animated.View>
  );

  if (!onPress) {
    return (
      <View style={[{ alignSelf: 'stretch' }, style]} accessible accessibilityLabel={a11y}>
        {content}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={[{ alignSelf: 'stretch' }, style]}>
      {content}
    </PressableScale>
  );
}
