/**
 * PIN entry (docs/DESIGN.md §4): 18 px dots (4 by default, grows to 6 while typing) above a 3×4
 * grid of 76-tall `field` keys with 30/700 digits. Bottom row: "Clear" (or `leftKey`, e.g. "Use
 * fingerprint") and backspace as quiet keys. When `error` turns true the dots shake once (not
 * under Reduce Motion) and turn `danger`; the screen clears the entry and `error` after ~600 ms.
 * `status` renders directly under the dots (e.g. "That's not it. Try again."), so the message
 * sits where the eyes already are.
 *
 * @example
 * <PinPad value={pin} onChange={(v) => { setPin(v); setWrong(false); }}
 *   autoSubmitAt={storedPinLength} onSubmit={verify} error={wrong}
 *   leftKey={{ label: 'Use fingerprint', onPress: bio }} />
 * <PinPad value={pin} onChange={setPin} />   // choosing a new 4–6 digit PIN; screen has its own Next
 */
import * as React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Delete } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { radii, useTheme } from '@/lib/theme';
import { haptics } from '@/lib/ui/haptics';
import { Text } from './Text';
import { Icon } from './Icon';

export interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  /** Default 6. */
  maxLength?: number;
  /** Minimum length (dots shown before typing, submit key enabled). Default 4. */
  minLength?: number;
  /** Call `onSubmit` automatically once this many digits are entered (also fixes the dot count). */
  autoSubmitAt?: number;
  onSubmit?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  /** Replaces "Clear" in the bottom-left: a quiet text key, or any node. */
  leftKey?: { label: string; onPress: () => void } | React.ReactNode;
  /** Shown directly under the dots (a status / error line). */
  status?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const KEY_H = 76;
const DOT = 18;

function isKeySpec(k: PinPadProps['leftKey']): k is { label: string; onPress: () => void } {
  return !!k && typeof k === 'object' && 'label' in k && 'onPress' in k && !React.isValidElement(k);
}

export function PinPad({
  value,
  onChange,
  maxLength = 6,
  minLength = 4,
  autoSubmitAt,
  onSubmit,
  error = false,
  disabled = false,
  leftKey,
  status,
  style,
}: PinPadProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const shake = useSharedValue(0);

  React.useEffect(() => {
    if (!error) return;
    haptics.error();
    if (reduceMotion) return;
    shake.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 70 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 50 })
    );
  }, [error, reduceMotion, shake]);

  const dotsStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const press = (digit: string) => {
    if (disabled || value.length >= maxLength) return;
    const next = value + digit;
    onChange(next);
    if (autoSubmitAt && next.length === autoSubmitAt) onSubmit?.(next);
  };
  const backspace = () => {
    if (disabled || value.length === 0) return;
    onChange(value.slice(0, -1));
  };
  const clear = () => {
    if (disabled || value.length === 0) return;
    onChange('');
  };

  const dotCount = autoSubmitAt ?? Math.max(minLength, Math.min(maxLength, value.length));

  const digitKey = (d: string) => (
    <PinKey key={d} disabled={disabled} onPress={() => press(d)} accessibilityLabel={d}>
      <Text tabular style={{ fontSize: 30, lineHeight: 36 }} weight="700">
        {d}
      </Text>
    </PinKey>
  );

  const quietTextKey = (label: string, onPress: () => void, a11y?: string) => (
    <PinKey quiet disabled={disabled} onPress={onPress} accessibilityLabel={a11y ?? label}>
      <Text variant="callout" weight="700" tone="secondary" align="center">
        {label}
      </Text>
    </PinKey>
  );

  let left: React.ReactNode;
  if (isKeySpec(leftKey)) left = quietTextKey(leftKey.label, leftKey.onPress);
  else if (leftKey) left = <View style={[styles.key, disabled && styles.disabled]}>{leftKey}</View>;
  else left = quietTextKey(i18n.t('ui.common.clear'), clear);

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <View style={[{ alignItems: 'stretch', gap: 24 }, style]}>
      <View style={{ gap: 10 }}>
        <Animated.View
          accessible
          accessibilityLabel={i18n.t('ui.common.a11y.pinEntered', {
            count: value.length,
            max: dotCount,
          })}
          style={[
            {
              flexDirection: 'row',
              gap: 18,
              minHeight: DOT + 4,
              alignItems: 'center',
              justifyContent: 'center',
            },
            dotsStyle,
          ]}>
          {Array.from({ length: dotCount }).map((_, i) => {
            const filled = i < value.length;
            const c = error ? colors.danger : colors.ink;
            return (
              <View
                key={i}
                style={{
                  width: DOT,
                  height: DOT,
                  borderRadius: DOT / 2,
                  backgroundColor: filled ? c : 'transparent',
                  borderWidth: 2,
                  borderColor: filled || error ? c : colors.line2,
                }}
              />
            );
          })}
        </Animated.View>
        {status}
      </View>

      <View style={{ gap: 12 }}>
        {rows.map((row) => (
          <View key={row.join('')} style={{ flexDirection: 'row', gap: 12 }}>
            {row.map(digitKey)}
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {left}
          {digitKey('0')}
          <PinKey
            quiet
            onPress={backspace}
            onLongPress={clear}
            disabled={disabled}
            accessibilityLabel={i18n.t('ui.common.a11y.deleteDigit')}>
            <Icon as={Delete} size={30} tone="secondary" />
          </PinKey>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  key: {
    flex: 1,
    // minHeight so a two-line quiet label ("Forgot PIN?") at large text grows the key, not clips.
    minHeight: KEY_H,
    paddingHorizontal: 4,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
});

/**
 * One key. Pressed state lives in React state because function `style` props are dropped by the
 * NativeWind css-interop in this project. Digit keys sit on `field`; quiet keys are transparent
 * and only show `field` while pressed.
 */
function PinKey({
  quiet = false,
  disabled,
  onPress,
  onLongPress,
  accessibilityLabel,
  children,
}: {
  quiet?: boolean;
  disabled?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const [pressed, setPressed] = React.useState(false);
  const backgroundColor = quiet
    ? pressed
      ? colors.field
      : 'transparent'
    : pressed
      ? colors.field2
      : colors.field;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.key, { backgroundColor }, disabled && styles.disabled]}>
      {children}
    </Pressable>
  );
}
