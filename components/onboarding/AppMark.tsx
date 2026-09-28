/**
 * The app mark: a soft accent→teal gradient circle with a pill, sitting in a pale halo. With
 * `breathing`, mark and halo slowly swell and settle (static when Reduce Motion is on).
 *
 * @example
 * <AppMark size={132} breathing />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Pill } from 'lucide-react-native';
import { Icon, useTheme } from '@/components/ds';

export interface AppMarkProps {
  /** Diameter of the gradient circle. Default 120. */
  size?: number;
  breathing?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BREATH_MS = 2600;

export function AppMark({ size = 120, breathing = false, style }: AppMarkProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(0);
  const animate = breathing && !reduceMotion;

  React.useEffect(() => {
    if (!animate) {
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => cancelAnimation(breath);
  }, [animate, breath]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.035 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + breath.value * 0.45,
    transform: [{ scale: 1 + breath.value * 0.08 }],
  }));

  const halo = Math.round(size * 1.45);

  return (
    <View
      style={[{ width: halo, height: halo, alignItems: 'center', justifyContent: 'center' }, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: halo,
            height: halo,
            borderRadius: halo / 2,
            backgroundColor: colors.accentSoft,
          },
          haloStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            shadowColor: colors.shadow,
            shadowOpacity: 0.18,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 10 },
          },
          markStyle,
        ]}>
        <LinearGradient
          colors={[colors.accent, colors.success]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon
            as={Pill}
            size={Math.round(size * 0.44)}
            color={colors.onAccent}
            strokeWidth={1.75}
            style={{ transform: [{ rotate: '-35deg' }] }}
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}
