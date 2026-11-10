/**
 * Profile avatar (docs/DESIGN.md §4): round, `done` fill with a `doneInk` initial, or a photo.
 * Sizes: sm 40 · md 60 · lg 72 · xl 120 (or any number). `ring` = 3 px accent ring (selected).
 *
 * @example
 * <Avatar name="Margaret" uri={profile.avatarUri} size="lg" />
 * <Avatar name="Tom" size="md" ring />
 */
import * as React from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { fontForWeight, useTheme } from '@/lib/theme';
import { Text } from './Text';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export const AVATAR_SIZES: Record<AvatarSize, number> = { sm: 40, md: 60, lg: 72, xl: 120 };

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: AvatarSize | number;
  /** Accent ring (selected / active profile). */
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** First letter of the first name (one initial reads larger and calmer). */
export function getInitials(name: string): string {
  const first = name.trim().split(/\s+/).filter(Boolean)[0];
  return first ? first[0].toLocaleUpperCase() : '?';
}

export function Avatar({ name, uri, size = 'md', ring = false, style }: AvatarProps) {
  const { colors } = useTheme();
  const d = typeof size === 'number' ? size : AVATAR_SIZES[size];
  const ringW = ring ? 3 : 0;
  const gap = ring ? 3 : 0;
  const outer = d + (ringW + gap) * 2;

  const inner = uri ? (
    <Image
      source={{ uri }}
      style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: colors.field }}
      accessibilityIgnoresInvertColors
    />
  ) : (
    <View
      style={{
        width: d,
        height: d,
        borderRadius: d / 2,
        backgroundColor: colors.done,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text
        color={colors.doneInk}
        allowFontScaling={false}
        style={{
          fontSize: Math.round(d * 0.42),
          lineHeight: Math.round(d * 0.52),
          ...fontForWeight('800'),
        }}>
        {getInitials(name)}
      </Text>
    </View>
  );

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[
        ring
          ? {
              width: outer,
              height: outer,
              borderRadius: outer / 2,
              borderWidth: ringW,
              borderColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }
          : null,
        style,
      ]}>
      {inner}
    </View>
  );
}
