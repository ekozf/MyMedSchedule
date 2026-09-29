/**
 * Labelled text input on a sunken field with an accent focus ring.
 *
 * @example
 * const nameRef = useRef<TextInput>(null);
 * <TextField ref={nameRef} label="Name" value={name} onChangeText={setName} placeholder="e.g. Metformin" />
 * <TextField size="lg" value={name} onChangeText={setName} autoFocus />   // wizard hero input
 * <TextField label="Notes" multiline value={notes} onChangeText={setNotes} helper="Only you see this" />
 * <TextField label="Max per day" keyboardType="decimal-pad" error="Must be more than 0" trailing={<Text tone="secondary">pills</Text>} />
 */
import * as React from 'react';
import {
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { radii, useTheme } from '@/lib/theme';
import { Text, typography } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  helper?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** 'lg' = 28pt text for big single inputs. Default 'md'. */
  size?: 'md' | 'lg';
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  ref?: React.Ref<TextInput>;
}

export function TextField({
  label,
  error,
  helper,
  leading,
  trailing,
  size = 'md',
  containerStyle,
  inputStyle,
  multiline,
  editable = true,
  onFocus,
  onBlur,
  accessibilityLabel,
  ref,
  ...inputProps
}: TextFieldProps) {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const borderColor = error ? colors.danger : focused ? colors.accent : 'transparent';
  const minHeight = size === 'lg' ? 72 : 56;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <Text variant="subhead" tone="secondary" style={{ paddingHorizontal: 4 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          minHeight,
          borderRadius: radii.input,
          backgroundColor: focused ? colors.surfaceSolid : colors.surfaceSunken,
          borderWidth: 2,
          borderColor,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          paddingHorizontal: 14,
          gap: 10,
          opacity: editable ? 1 : 0.6,
        }}>
        {leading}
        <TextInput
          ref={ref}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={colors.inkTertiary}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={error ?? helper}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            size === 'lg'
              ? { ...typography.title1, fontWeight: '600' }
              : { fontSize: typography.body.fontSize },
            {
              flex: 1,
              color: colors.ink,
              paddingVertical: multiline ? 14 : 0,
              minHeight: multiline ? 96 : minHeight - 4,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            inputStyle,
          ]}
          {...inputProps}
        />
        {trailing}
      </View>
      {error ? (
        <Text
          variant="footnote"
          tone="danger"
          style={{ paddingHorizontal: 4 }}
          accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="footnote" tone="tertiary" style={{ paddingHorizontal: 4 }}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
