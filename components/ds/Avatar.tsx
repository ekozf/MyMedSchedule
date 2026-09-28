/**
 * Profile avatar: photo, or initials on a tint derived from the name.
 *
 * @example
 * <Avatar name="Emma de Vries" uri={profile.avatarUri} size="md" ring />
 */
import * as React from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { medTints, useTheme, withAlpha } from '@/lib/theme';
import { hashString } from '@/lib/ui/hash';
import { Text } from './Text';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export const AVATAR_SIZES: Record<AvatarSize, number> = { sm: 32, md: 44, lg: 64, xl: 104 };

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: AvatarSize | number;
  /** Accent ring (active profile). */
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toLocaleUpperCase();
}

export function Avatar({ name, uri, size = 'md', ring = false, style }: AvatarProps) {
  const { colors } = useTheme();
  const d = typeof size === 'number' ? size : AVATAR_SIZES[size];
  const tint = medTints[hashString(name || '?') % medTints.length];
  const ringGap = ring ? Math.max(2, Math.round(d * 0.05)) : 0;
  const outer = d + ringGap * 4;

  const inner = uri ? (
    <Image
      source={{ uri }}
      style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: colors.surfaceSunken }}
      accessibilityIgnoresInvertColors
    />
  ) : (
    <View
      style={{
        width: d,
        height: d,
        borderRadius: d / 2,
        backgroundColor: withAlpha(tint, 0.18),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text
        color={tint}
        weight="700"
        allowFontScaling={false}
        style={{ fontSize: Math.round(d * 0.38), lineHeight: Math.round(d * 0.46) }}>
        {getInitials(name)}
      </Text>
    </View>
  );

  if (!ring) {
    return (
      <View style={style} accessible accessibilityRole="image" accessibilityLabel={name}>
        {inner}
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[
        {
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: ringGap,
          borderColor: colors.accent,
          padding: ringGap,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      {inner}
    </View>
  );
}
