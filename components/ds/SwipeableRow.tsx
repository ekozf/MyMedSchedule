/**
 * Swipe shortcuts for a row (DESIGN.md §1.4: swipes are shortcuts — always offer the same
 * actions visibly in the sheet that opens on tap).
 * - `leftAction` is revealed by swiping right; a full swipe (past 35%) triggers it.
 * - `rightActions` are revealed by swiping left; tap one to run it.
 * The row closes itself after an action.
 *
 * @example
 * <SwipeableRow
 *   leftAction={{ label: 'Take', icon: Check, tone: 'success', onTrigger: take }}
 *   rightActions={[
 *     { label: 'Skip', icon: X, tone: 'danger', onPress: skip },
 *     { label: 'More', icon: Ellipsis, tone: 'default', onPress: openSheet },
 *   ]}>
 *   <DoseRow … />
 * </SwipeableRow>
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { LucideIcon } from 'lucide-react-native';
import { SPRING, radii, statusColors, useTheme, type StatusTone } from '@/lib/theme';
import { haptics } from '@/lib/ui/haptics';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { Icon } from './Icon';

export interface SwipeLeftAction {
  label: string;
  icon: LucideIcon;
  tone: StatusTone;
  onTrigger: () => void;
}

export interface SwipeRightAction {
  label: string;
  icon: LucideIcon;
  tone: StatusTone;
  onPress: () => void;
}

export interface SwipeableRowProps {
  children: React.ReactNode;
  leftAction?: SwipeLeftAction;
  rightActions?: SwipeRightAction[];
  enabled?: boolean;
  /** Corner radius of the action backgrounds (match the row). Default 24. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

const FULL_SWIPE = 0.35;
const RIGHT_ACTION_WIDTH = 76;
const GAP = 8;

export function SwipeableRow({
  children,
  leftAction,
  rightActions,
  enabled = true,
  radius = radii.card,
  style,
}: SwipeableRowProps) {
  const ref = React.useRef<SwipeableMethods>(null);
  const [width, setWidth] = React.useState(0);
  const threshold = width * FULL_SWIPE;

  const leftRef = React.useRef(leftAction);
  leftRef.current = leftAction;

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ReanimatedSwipeable
        ref={ref}
        enabled={enabled && width > 0}
        // The default `overflow: hidden` clips the card's soft shadow into a hard pale rectangle.
        containerStyle={{ overflow: 'visible' }}
        friction={1.4}
        leftThreshold={threshold || undefined}
        rightThreshold={40}
        overshootLeft={false}
        overshootRight={false}
        dragOffsetFromLeftEdge={12}
        dragOffsetFromRightEdge={12}
        renderLeftActions={
          leftAction
            ? (_progress, translation) => (
                <LeftPanel
                  action={leftAction}
                  width={width}
                  threshold={threshold}
                  translation={translation}
                  radius={radius}
                />
              )
            : undefined
        }
        renderRightActions={
          rightActions && rightActions.length
            ? (_progress, translation, methods) => (
                <RightPanel
                  actions={rightActions}
                  translation={translation}
                  radius={radius}
                  onDone={() => methods.close()}
                />
              )
            : undefined
        }
        onSwipeableOpen={(direction) => {
          // 'right' = the row moved right, i.e. the left action was fully swiped.
          if (direction === 'right' && leftRef.current) {
            haptics.success();
            leftRef.current.onTrigger();
            ref.current?.close();
          }
        }}>
        {children}
      </ReanimatedSwipeable>
    </View>
  );
}

function LeftPanel({
  action,
  width,
  threshold,
  translation,
  radius,
}: {
  action: SwipeLeftAction;
  width: number;
  threshold: number;
  translation: SharedValue<number>;
  radius: number;
}) {
  const { colors } = useTheme();
  const sc = statusColors(colors, action.tone);
  const bg = action.tone === 'default' ? colors.inkSecondary : sc.fg;

  useAnimatedReaction(
    () => translation.value > threshold,
    (armed, prev) => {
      if (prev !== null && armed !== prev) scheduleOnRN(haptics.medium);
    },
    [threshold]
  );

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(translation.value > threshold ? 1.15 : 1, SPRING) }],
  }));

  return (
    <View
      style={{
        width,
        backgroundColor: bg,
        borderRadius: radius,
        justifyContent: 'center',
        paddingLeft: 24,
      }}>
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, iconStyle]}>
        <Icon as={action.icon} size={24} color={colors.onAccent} strokeWidth={2.5} />
        <Text variant="headline" color={colors.onAccent}>
          {action.label}
        </Text>
      </Animated.View>
    </View>
  );
}

function RightPanel({
  actions,
  translation,
  radius,
  onDone,
}: {
  actions: SwipeRightAction[];
  translation: SharedValue<number>;
  radius: number;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const total = actions.length * (RIGHT_ACTION_WIDTH + GAP);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(translation.value) / (total * 0.6)),
  }));
  return (
    <Animated.View style={[{ flexDirection: 'row', paddingLeft: GAP, gap: GAP }, style]}>
      {actions.map((a) => {
        const sc = statusColors(colors, a.tone);
        const fg = a.tone === 'default' ? colors.ink : sc.fg;
        return (
          <PressableScale
            key={a.label}
            accessibilityLabel={a.label}
            onPress={() => {
              onDone();
              a.onPress();
            }}
            style={{
              width: RIGHT_ACTION_WIDTH,
              borderRadius: Math.min(radius, 20),
              backgroundColor: a.tone === 'default' ? colors.surfaceSolid : sc.bg,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}>
            <Icon as={a.icon} size={22} color={fg} />
            <Text variant="footnote" weight="600" color={fg} numberOfLines={1}>
              {a.label}
            </Text>
          </PressableScale>
        );
      })}
    </Animated.View>
  );
}
