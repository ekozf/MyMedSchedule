/**
 * Stepper (docs/DESIGN.md §4): `field` card radius 22, 64 px round −/+ buttons on `bg` with accent
 * glyphs, value in `display`, unit 17/600 below. Decimal steps (0.5), min/max, long-press −/+
 * repeats (and speeds up). Tap the number to type a value: it looks editable (a dotted 2 px
 * `line2` underline and a small pencil after it), so no "tap the number" footnote is needed.
 *
 * @example
 * <Stepper value={amount} onChange={setAmount} min={0.5} step={0.5} unit={formatUnit(amount, 'pills')} />
 * <Stepper label="Every … days" value={n} onChange={setN} min={2} max={30} unit="days" />
 * <Stepper value={count} onChange={setCount} min={0} card={false} />   // inside another card
 */
import * as React from 'react';
import { Pressable, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Minus, Pencil, Plus } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { fontForWeight, radii, type, useTheme } from '@/lib/theme';
import { formatNumber } from '@/lib/ui/format';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Default 1. Supports fractions such as 0.5. */
  step?: number;
  /** Unit label under the number (already localized, e.g. "pills"). */
  unit?: string;
  /** Optional small line under the unit (15, ink2), e.g. "usual dose". */
  hint?: string;
  /** Allow decimals when typing. Default: true when `step` is fractional. */
  allowDecimal?: boolean;
  /** Allow typing the value by tapping the number. Default true. */
  editable?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Label above the card (16/700 ink2). Also used as the accessibility label. */
  label?: string;
  /** Render on a `field` card. Default true; false when already inside a card. */
  card?: boolean;
  /**
   * Open the number for typing on mount (keyboard up, caret after the value; the field looks the
   * same as the display with its dotted underline), e.g. a first count. Waits
   * `autoFocusDelay` ms (default 350) so a sheet can finish sliding in first.
   */
  autoFocusEdit?: boolean;
  autoFocusDelay?: number;
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
  hint,
  allowDecimal,
  editable = true,
  disabled = false,
  accessibilityLabel,
  label,
  card = true,
  autoFocusEdit = false,
  autoFocusDelay = 350,
  style,
}: StepperProps) {
  const { colors } = useTheme();
  const decimals = allowDecimal ?? step % 1 !== 0;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  // Opened by `autoFocusEdit` (not a tap): caret at the end, styled like the display.
  const [autoEditing, setAutoEditing] = React.useState(false);
  const inputRef = React.useRef<TextInput>(null);
  const valueRef = React.useRef(value);
  valueRef.current = value;
  const repeat = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Open for typing on mount when asked.
  React.useEffect(() => {
    if (!autoFocusEdit || !editable || disabled) return;
    const id = setTimeout(() => {
      setDraft(formatNumber(valueRef.current));
      setAutoEditing(true);
      setEditing(true);
    }, autoFocusDelay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A value set from outside while typing (a quick chip) replaces the draft, so blurring the
  // field afterwards doesn't write the old typed number back.
  React.useEffect(() => {
    if (!editing) return;
    const parsed = parseFloat(draft.replace(',', '.'));
    if (!Number.isFinite(parsed) || clamp(decimals ? parsed : Math.round(parsed)) !== value) {
      if (Number.isFinite(parsed) || value !== 0) setDraft(formatNumber(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = React.useCallback(
    (n: number) => Math.min(max, Math.max(min, round(n))),
    [min, max]
  );

  const bump = React.useCallback(
    (dir: 1 | -1) => {
      const next = clamp(valueRef.current + dir * step);
      if (next !== valueRef.current) {
        valueRef.current = next;
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
    setAutoEditing(false);
    const parsed = parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      const next = clamp(decimals ? parsed : Math.round(parsed));
      if (next !== valueRef.current) {
        valueRef.current = next;
        onChange(next);
      }
    }
  };

  const onType = (t: string) => {
    const cleaned = t.replace(decimals ? /[^0-9.,]/g : /[^0-9]/g, '');
    setDraft(cleaned);
    // Commit valid values live so a Save/Log tap right after typing never misses them.
    const parsed = parseFloat(cleaned.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      const next = clamp(decimals ? parsed : Math.round(parsed));
      if (next !== valueRef.current) {
        valueRef.current = next;
        onChange(next);
      }
    }
  };

  const atMin = value <= min;
  const atMax = value >= max;

  const sideButton = (dir: 1 | -1) => (
    <IconButton
      icon={dir === 1 ? Plus : Minus}
      variant={card ? 'bg' : 'field'}
      tone="accent"
      size="lg"
      disabled={disabled || (dir === 1 ? atMax : atMin)}
      disabledLook="solid"
      accessibilityLabel={i18n.t(dir === 1 ? 'ui.common.a11y.increase' : 'ui.common.a11y.decrease')}
      onPress={() => bump(dir)}
      onLongPress={() => startRepeat(dir)}
      delayLongPress={350}
      onPressOut={stopRepeat}
    />
  );

  const a11yLabel = accessibilityLabel ?? label;
  const canType = editable && !disabled;

  const body = (
    <View
      accessible={false}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
        card ? { backgroundColor: colors.field, borderRadius: radii.card, padding: 16 } : null,
        label ? null : style,
      ]}>
      {sideButton(-1)}
      <View style={{ flex: 1, alignItems: 'center', minHeight: 80, justifyContent: 'center' }}>
        {editing && autoEditing ? (
          <View style={{ minWidth: 96, alignItems: 'center', paddingVertical: 4 }}>
            <View style={{ alignItems: 'stretch', maxWidth: '100%' }}>
              <TextInput
                ref={inputRef}
                autoFocus
                value={draft}
                onChangeText={onType}
                onFocus={() => {
                  // Caret after the number, nothing selected.
                  const end = draft.length;
                  requestAnimationFrame(() => inputRef.current?.setSelection(end, end));
                }}
                onBlur={commitDraft}
                onSubmitEditing={commitDraft}
                keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
                returnKeyType="done"
                accessibilityLabel={a11yLabel}
                selectionColor={colors.accent}
                cursorColor={colors.accent}
                underlineColorAndroid="transparent"
                style={{
                  fontSize: type.display.fontSize,
                  lineHeight: type.display.lineHeight,
                  letterSpacing: type.display.letterSpacing,
                  ...fontForWeight('800'),
                  color: colors.ink,
                  textAlign: 'center',
                  minWidth: 48,
                  backgroundColor: 'transparent',
                  padding: 0,
                  margin: 0,
                  borderWidth: 0,
                  includeFontPadding: false,
                  textAlignVertical: 'center',
                  fontVariant: ['tabular-nums'],
                }}
              />
              <DottedUnderline color={colors.line2} />
            </View>
          </View>
        ) : editing ? (
          <TextInput
            autoFocus
            value={draft}
            onChangeText={onType}
            onBlur={commitDraft}
            onSubmitEditing={commitDraft}
            keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
            returnKeyType="done"
            selectTextOnFocus={!autoEditing}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            style={[
              {
                fontSize: type.display.fontSize,
                lineHeight: type.display.lineHeight,
                letterSpacing: type.display.letterSpacing,
                ...fontForWeight('800'),
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
            accessibilityLabel={a11yLabel}
            accessibilityHint={canType ? i18n.t('ui.common.a11y.typeNumberHint') : undefined}
            accessibilityValue={{
              text: `${formatNumber(value)}${unit ? ` ${unit}` : ''}${hint ? `, ${hint}` : ''}`,
            }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'increment') bump(1);
              if (e.nativeEvent.actionName === 'decrement') bump(-1);
            }}
            style={{ minWidth: 96, alignItems: 'center', paddingVertical: 4 }}>
            <View style={{ alignItems: 'stretch', maxWidth: '100%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  variant="display"
                  tabular
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ flexShrink: 1 }}>
                  {formatNumber(value)}
                </Text>
                {canType ? <Icon as={Pencil} size={16} color={colors.ink2} /> : null}
              </View>
              {canType ? <DottedUnderline color={colors.line2} /> : null}
            </View>
          </Pressable>
        )}
        {unit ? (
          <Text variant="callout" weight="600" tone="secondary" align="center">
            {unit}
          </Text>
        ) : null}
        {hint ? (
          <Text variant="footnote" tone="secondary" align="center">
            {hint}
          </Text>
        ) : null}
      </View>
      {sideButton(1)}
    </View>
  );

  if (!label) return body;
  return (
    <View style={[{ gap: 8 }, style]}>
      <Text variant="subhead" weight="700" tone="secondary" style={{ paddingHorizontal: 4 }}>
        {label}
      </Text>
      {body}
    </View>
  );
}

/**
 * 2 px dotted line. A one-sided dotted border doesn't draw reliably on every platform, so this
 * clips the top edge of a fully dotted box.
 */
function DottedUnderline({ color }: { color: string }) {
  return (
    <View style={{ height: 2, overflow: 'hidden', marginTop: 2 }}>
      <View
        style={{
          height: 6,
          borderWidth: 2,
          borderStyle: 'dotted',
          borderColor: color,
          borderRadius: 1,
        }}
      />
    </View>
  );
}
