/**
 * Text field (docs/DESIGN.md §4): `field` fill, radius 18, 68 min height, 22/600 text; focused =
 * `bg` fill with 2 px `accent` border. Multiline: 110 min height, 18/400. Label above 16/700 ink2.
 *
 * @example
 * <TextField label="Your name" value={name} onChangeText={setName} />
 * <TextField label="Note" multiline value={note} onChangeText={setNote} placeholder='Like "take with food"' />
 * <TextField label="Name" error="Add a name to continue." … />
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
import { fontForWeight, radii, type, useTheme } from '@/lib/theme';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  /** Hint under the field (15, ink2). */
  helper?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
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
  const minHeight = multiline ? 110 : 68;
  const textStyle: TextStyle = multiline
    ? { fontSize: type.body.fontSize, lineHeight: type.body.lineHeight, ...fontForWeight('400') }
    : { fontSize: 22, ...fontForWeight('600') };

  return (
    // Keep the input's native parents stable when editable changes during a
    // screen's exit transition. Fabric reparenting can crash Android otherwise.
    <View collapsable={false} style={[{ gap: 8 }, containerStyle]}>
      {label ? (
        <Text variant="subhead" weight="700" tone="secondary" style={{ paddingHorizontal: 4 }}>
          {label}
        </Text>
      ) : null}
      <View
        collapsable={false}
        style={{
          minHeight,
          borderRadius: radii.field,
          backgroundColor: focused ? colors.bg : colors.field,
          borderWidth: 2,
          borderColor,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          paddingHorizontal: 18,
          gap: 10,
          opacity: editable ? 1 : 0.6,
        }}>
        {leading}
        <TextInput
          ref={ref}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={colors.ink2}
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
            textStyle,
            {
              flex: 1,
              color: colors.ink,
              paddingVertical: multiline ? 16 : 0,
              minHeight: minHeight - 4,
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
        <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 4 }}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
