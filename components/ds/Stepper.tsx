/**
 * Big −/+ stepper around a large number. Tap the number to type a value. Long-press −/+ repeats.
 *
 * @example
 * <Stepper value={amount} onChange={setAmount} min={0.5} max={20} step={0.5} unit={formatUnit(amount, 'pills')} />
 * <Stepper value={count} onChange={setCount} min={0} max={9999} />
 */
import * as React from 'react';
import { Pressable, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { haptics } from '@/lib/ui/haptics';
import { formatNumber } from '@/lib/ui/format';
import { IconButton } from './IconButton';
import { Text, typography } from './Text';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Default 1. Supports fractions such as 0.5. */
  step?: number;
  /** Unit label under the number (already localized, e.g. "pills"). */
  unit?: string;
  /** Allow decimals when typing. Default: true when `step` is fractional. */
  allowDecimal?: boolean;
  /** Allow typing the value by tapping the number. Default true. */
  editable?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function Stepper({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  unit,
  allowDecimal,
  editable = true,
  disabled = false,
  accessibilityLabel,
  style,
}: StepperProps) {
  const { colors } = useTheme();
  const decimals = allowDecimal ?? step % 1 !== 0;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const valueRef = React.useRef(value);
  valueRef.current = value;
  const repeat = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const clamp = React.useCallback(
    (n: number) => Math.min(max, Math.max(min, round(n))),
    [min, max]
  );

  const bump = React.useCallback(
    (dir: 1 | -1) => {
      const next = clamp(valueRef.current + dir * step);
      if (next !== valueRef.current) {
        valueRef.current = next;
        haptics.tap();
        onChange(next);
        return true;
      }
      return false;
    },
    [clamp, onChange, step]
  );

  const stopRepeat = () => {
    if (repeat.current) clearInterval(repeat.current);
    repeat.current = null;
  };
  React.useEffect(() => stopRepeat, []);

  const startRepeat = (dir: 1 | -1) => {
    stopRepeat();
    let ticks = 0;
    repeat.current = setInterval(() => {
      ticks += 1;
      // accelerate after ~1.5s
      const times = ticks > 15 ? 5 : 1;
      for (let i = 0; i < times; i++) {
        if (!bump(dir)) {
          stopRepeat();
          break;
        }
      }
    }, 100);
  };

  const commitDraft = () => {
    setEditing(false);
    const parsed = parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      const next = clamp(decimals ? parsed : Math.round(parsed));
      if (next !== value) onChange(next);
    }
  };

  const atMin = value <= min;
  const atMax = value >= max;

  const sideButton = (dir: 1 | -1) => (
    <IconButton
      icon={dir === 1 ? Plus : Minus}
      variant="tinted"
      size="lg"
      haptic="none"
      disabled={disabled || (dir === 1 ? atMax : atMin)}
      accessibilityLabel={i18n.t(dir === 1 ? 'ui.common.a11y.increase' : 'ui.common.a11y.decrease')}
      onPress={() => bump(dir)}
      onLongPress={() => startRepeat(dir)}
      delayLongPress={350}
      onPressOut={stopRepeat}
    />
  );

  return (
    <View
      accessible={false}
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
        style,
      ]}>
      {sideButton(-1)}
      <View style={{ flex: 1, alignItems: 'center', minHeight: 72, justifyContent: 'center' }}>
        {editing ? (
          <TextInput
            autoFocus
            value={draft}
            onChangeText={(t) => setDraft(t.replace(decimals ? /[^0-9.,]/g : /[^0-9]/g, ''))}
            onBlur={commitDraft}
            onSubmitEditing={commitDraft}
            keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
            returnKeyType="done"
            selectTextOnFocus
            selectionColor={colors.accent}
            style={[
              typography.title1,
              {
                fontSize: 40,
                lineHeight: 48,
                color: colors.ink,
                textAlign: 'center',
                minWidth: 96,
                borderBottomWidth: 2,
                borderBottomColor: colors.accent,
                paddingVertical: 0,
                fontVariant: ['tabular-nums'],
              },
            ]}
          />
        ) : (
          <Pressable
            disabled={!editable || disabled}
            onPress={() => {
              setDraft(formatNumber(value));
              setEditing(true);
            }}
            accessibilityRole="adjustable"
            accessibilityLabel={accessibilityLabel}
            accessibilityValue={{ text: `${formatNumber(value)}${unit ? ` ${unit}` : ''}` }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'increment') bump(1);
              if (e.nativeEvent.actionName === 'decrement') bump(-1);
            }}
            style={{ minWidth: 96, alignItems: 'center', paddingVertical: 4 }}>
            <Text
              variant="title1"
              tabular
              style={{ fontSize: 40, lineHeight: 48 }}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {formatNumber(value)}
            </Text>
          </Pressable>
        )}
        {unit ? (
          <Text variant="subhead" tone="secondary" numberOfLines={1}>
            {unit}
          </Text>
        ) : null}
      </View>
      {sideButton(1)}
    </View>
  );
}
