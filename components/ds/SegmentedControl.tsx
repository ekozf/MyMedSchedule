/**
 * Sliding segmented control on a sunken track.
 *
 * @example
 * const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
 * <SegmentedControl
 *   value={range}
 *   onChange={setRange}
 *   options={[
 *     { value: '7d', label: '7 d' },
 *     { value: '30d', label: '30 d' },
 *     { value: '90d', label: '90 d' },
 *     { value: 'all', label: 'All' },
 *   ]}
 * />
 */
import * as React from 'react';
import {
  Pressable,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { SPRING, useTheme } from '@/lib/theme';
import { haptics } from '@/lib/ui/haptics';
import { Text } from './Text';
import { Icon } from './Icon';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  icon?: LucideIcon;
  accessibilityLabel?: string;
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'md' | 'lg';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PAD = 3;

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  disabled,
  style,
}: SegmentedControlProps<T>) {
  const { colors, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = React.useState(0);
  const height = size === 'lg' ? 52 : 44;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const segW = width > 0 ? (width - PAD * 2) / options.length : 0;
  const x = useSharedValue(0);

  React.useEffect(() => {
    const target = index * segW;
    x.value =
      reduceMotion || segW === 0 ? withTiming(target, { duration: 0 }) : withSpring(target, SPRING);
  }, [index, segW, reduceMotion, x]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: colors.surfaceSunken,
          padding: PAD,
          flexDirection: 'row',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      {segW > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: PAD,
              left: PAD,
              width: segW,
              height: height - PAD * 2,
              borderRadius: (height - PAD * 2) / 2,
              backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : colors.surfaceSolid,
              shadowColor: '#0F1B2D',
              shadowOpacity: isDark ? 0 : 0.1,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: isDark ? 0 : 1,
            },
            thumbStyle,
          ]}
        />
      ) : null}
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !!disabled }}
            accessibilityLabel={opt.accessibilityLabel ?? opt.label}
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={() => {
              if (!selected) {
                haptics.tap();
                onChange(opt.value);
              }
            }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              paddingHorizontal: 6,
            }}>
            {opt.icon ? (
              <Icon as={opt.icon} size={18} tone={selected ? 'primary' : 'secondary'} />
            ) : null}
            <Text
              variant={size === 'lg' ? 'callout' : 'subhead'}
              weight="600"
              tone={selected ? 'primary' : 'secondary'}
              numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
