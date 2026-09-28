/**
 * Medicine visual: photo, or a pill icon on a tile tinted by the medicine's name.
 *
 * @example
 * <MedTile name={med.name} imageUri={med.imageUri} size="md" />
 * const tint = getMedTint(med.name); // "#12A594"
 */
import * as React from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { Pill, type LucideIcon } from 'lucide-react-native';
import { medTints, useTheme, withAlpha } from '@/lib/theme';
import { hashString } from '@/lib/ui/hash';
import { Icon } from './Icon';

export type MedTileSize = 'sm' | 'md' | 'lg' | 'xl';
export const MED_TILE_SIZES: Record<MedTileSize, number> = { sm: 40, md: 48, lg: 72, xl: 112 };

/** Deterministic tint for a medicine name (from `medTints`). */
export function getMedTint(name: string): string {
  return medTints[hashString(name || '?') % medTints.length];
}

export interface MedTileProps {
  name: string;
  imageUri?: string | null;
  size?: MedTileSize;
  /** Icon when no image. Default Pill. */
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function MedTile({ name, imageUri, size = 'md', icon = Pill, style }: MedTileProps) {
  const { colors, isDark } = useTheme();
  const d = MED_TILE_SIZES[size];
  const radius = Math.round(d * 0.3);
  const tint = getMedTint(name);

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        accessibilityIgnoresInvertColors
        style={[
          { width: d, height: d, borderRadius: radius, backgroundColor: colors.surfaceSunken },
          style as never,
        ]}
      />
    );
  }
  return (
    <View
      style={[
        {
          width: d,
          height: d,
          borderRadius: radius,
          backgroundColor: withAlpha(tint, isDark ? 0.22 : 0.14),
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      <Icon as={icon} size={Math.round(d * 0.46)} color={tint} />
    </View>
  );
}
