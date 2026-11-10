/**
 * Medicine picture: the photo when there is one, else a monochrome pill icon on a `field` tile.
 * With `initial`, the fallback is the first letter of the name in `accent` instead of the pill
 * (like the profile avatar). Sizes: sm 40 · md 52 · lg 64 · xl 92 (detail page) or any number.
 * Never tinted.
 *
 * @example
 * <MedIcon name={med.name} uri={med.imageUri} size="xl" />
 * <MedIcon name={med.name} uri={med.imageUri} size="lg" initial />
 */
import * as React from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { Pill } from 'lucide-react-native';
import { fontForWeight, useTheme } from '@/lib/theme';
import { getInitials } from './Avatar';
import { Icon } from './Icon';
import { Text } from './Text';

export type MedIconSize = 'sm' | 'md' | 'lg' | 'xl';
export const MED_ICON_SIZES: Record<MedIconSize, number> = { sm: 40, md: 52, lg: 64, xl: 92 };

export interface MedIconProps {
  name: string;
  uri?: string | null;
  size?: MedIconSize | number;
  /** Without a photo, show the name's first letter in `accent` instead of the pill. Default false. */
  initial?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function MedIcon({ name, uri, size = 'md', initial = false, style }: MedIconProps) {
  const { colors } = useTheme();
  const d = typeof size === 'number' ? size : MED_ICON_SIZES[size];
  const radius = d >= 80 ? 22 : d >= 60 ? 16 : 14;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[
        {
          width: d,
          height: d,
          borderRadius: radius,
          backgroundColor: colors.field,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: d, height: d }} accessibilityIgnoresInvertColors />
      ) : initial ? (
        <Text
          color={colors.accent}
          allowFontScaling={false}
          style={{
            fontSize: Math.round(d * 0.46),
            lineHeight: Math.round(d * 0.58),
            ...fontForWeight('800'),
          }}>
          {getInitials(name)}
        </Text>
      ) : (
        <Icon as={Pill} size={Math.round(d * 0.46)} tone="secondary" />
      )}
    </View>
  );
}
