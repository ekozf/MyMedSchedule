/**
 * PIN entry: dots + large round keypad. Shakes with an error haptic when `error` becomes true
 * (clear `error` on the next `onChange` to re-arm it).
 *
 * @example
 * const [pin, setPin] = useState('');
 * const [wrong, setWrong] = useState(false);
 * <PinPad
 *   value={pin}
 *   onChange={(v) => { setPin(v); setWrong(false); }}
 *   autoSubmitAt={storedPinLength}
 *   onSubmit={verify}
 *   error={wrong}
 *   leftKey={<IconButton icon={ScanFace} variant="plain" accessibilityLabel="Use Face ID" onPress={bio} />}
 * />
 * // Setting a new 4–6 digit PIN:
 * <PinPad value={pin} onChange={setPin} showSubmitKey onSubmit={next} />
 */
import * as React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Delete } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { haptics } from '@/lib/ui/haptics';
import { Text } from './Text';
import { Icon } from './Icon';
import { Button } from './Button';

export interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  /** Default 6. */
  maxLength?: number;
  /** Minimum length for the submit key. Default 4. */
  minLength?: number;
  /** Call `onSubmit` automatically once this many digits are entered. */
  autoSubmitAt?: number;
  onSubmit?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  /** Bottom-left key (e.g. biometric button). */
  leftKey?: React.ReactNode;
  /** Show a "Confirm" button under the keypad (enabled from `minLength`). */
  showSubmitKey?: boolean;
  submitLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const KEY = 76;

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
  showSubmitKey = false,
  submitLabel,
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
    haptics.tap();
    const next = value + digit;
    onChange(next);
    if (autoSubmitAt && next.length === autoSubmitAt) onSubmit?.(next);
  };
  const backspace = () => {
    if (disabled || value.length === 0) return;
    haptics.tap();
    onChange(value.slice(0, -1));
  };

  const dotCount = autoSubmitAt ?? Math.max(minLength, Math.min(maxLength, value.length));

  const digitKey = (d: string) => (
    <Pressable
      key={d}
      disabled={disabled}
      onPress={() => press(d)}
      accessibilityRole="button"
      accessibilityLabel={d}
      style={({ pressed }) => ({
        width: KEY,
        height: KEY,
        borderRadius: KEY / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.accentSoft : colors.surface,
        borderWidth: 1,
        borderColor: colors.stroke,
        opacity: disabled ? 0.5 : 1,
      })}>
      <Text variant="title1" weight="500" tabular>
        {d}
      </Text>
    </Pressable>
  );

  const empty = <View style={{ width: KEY, height: KEY }} />;
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <View style={[{ alignItems: 'center', gap: 28 }, style]}>
      <Animated.View
        accessible
        accessibilityLabel={i18n.t('ui.common.a11y.pinEntered', {
          count: value.length,
          max: dotCount,
        })}
        style={[{ flexDirection: 'row', gap: 16, minHeight: 20, alignItems: 'center' }, dotsStyle]}>
        {Array.from({ length: dotCount }).map((_, i) => {
          const filled = i < value.length;
          const c = error ? colors.danger : colors.accent;
          return (
            <View
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: filled ? c : 'transparent',
                borderWidth: 2,
                borderColor: filled ? c : colors.inkTertiary,
              }}
            />
          );
        })}
      </Animated.View>

      <View style={{ gap: 16 }}>
        {rows.map((row) => (
          <View key={row.join('')} style={{ flexDirection: 'row', gap: 24 }}>
            {row.map(digitKey)}
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 24 }}>
          <View style={{ width: KEY, height: KEY, alignItems: 'center', justifyContent: 'center' }}>
            {leftKey ?? null}
          </View>
          {digitKey('0')}
          {value.length > 0 ? (
            <Pressable
              onPress={backspace}
              onLongPress={() => !disabled && onChange('')}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('ui.common.a11y.deleteDigit')}
              style={({ pressed }) => ({
                width: KEY,
                height: KEY,
                borderRadius: KEY / 2,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.5 : 1,
              })}>
              <Icon as={Delete} size={28} tone="secondary" />
            </Pressable>
          ) : (
            empty
          )}
        </View>
      </View>

      {showSubmitKey ? (
        <Button
          label={submitLabel ?? i18n.t('ui.common.confirm')}
          size="md"
          disabled={disabled || value.length < minLength}
          onPress={() => onSubmit?.(value)}
          style={{ alignSelf: 'center', minWidth: 160 }}
        />
      ) : null}
    </View>
  );
}
