/**
 * Hairline separator and a fixed-size spacer.
 *
 * @example
 * <Divider inset={60} />
 * <Spacer size={24} />
 */
import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme';

export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, marginLeft: inset, backgroundColor: colors.separator },
        style,
      ]}
    />
  );
}

export function Spacer({ size = 16, horizontal = false }: { size?: number; horizontal?: boolean }) {
  return <View style={horizontal ? { width: size } : { height: size }} />;
}
