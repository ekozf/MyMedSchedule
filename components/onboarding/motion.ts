/**
 * Gentle staggered entrance for onboarding content: fade + small rise, or a plain fade when
 * Reduce Motion is on.
 *
 * @example
 * const enter = useEnter();
 * <Animated.View entering={enter(0)}>…</Animated.View>
 * <Animated.View entering={enter(1)}>…</Animated.View>
 */
import { useCallback } from 'react';
import { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';

const STAGGER = 90;

export function useEnter(baseDelay: number = 0) {
  const reduceMotion = useReducedMotion();
  return useCallback(
    (index: number) => {
      const delay = baseDelay + index * STAGGER;
      return reduceMotion
        ? FadeIn.duration(250).delay(delay)
        : FadeInDown.delay(delay).springify().damping(18).stiffness(140);
    },
    [baseDelay, reduceMotion]
  );
}
