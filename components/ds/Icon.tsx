/**
 * Lucide icon tinted with a theme token (raw lucide icons don't pick up classNames).
 *
 * @example
 * <Icon as={Pill} />                     // 22pt, ink
 * <Icon as={Check} tone="success" size={18} />
 * <Icon as={Pill} color={getMedTint('Metformin')} />
 */
import type { LucideIcon } from 'lucide-react-native';
import { toneColor, useTheme, type Tone } from '@/lib/theme';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

// Icons are decorative (their pressable parent carries the label). RN-web doesn't know these props.
const NATIVE_HIDDEN =
  Platform.OS === 'web'
    ? {}
    : ({ accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const);

export interface IconProps {
  as: LucideIcon;
  /** Default 22 (rows); 24 in the tab bar. */
  size?: number;
  tone?: Tone;
  /** Explicit colour, wins over `tone`. */
  color?: string;
  strokeWidth?: number;
  fill?: string;
  style?: StyleProp<ViewStyle>;
}

export function Icon({
  as: IconComponent,
  size = 22,
  tone = 'primary',
  color,
  strokeWidth = 2,
  fill,
  style,
}: IconProps) {
  const { colors } = useTheme();
  return (
    <IconComponent
      size={size}
      color={color ?? toneColor(colors, tone)}
      strokeWidth={strokeWidth}
      fill={fill ?? 'none'}
      style={style as never}
      {...NATIVE_HIDDEN}
    />
  );
}
