/**
 * "Calm" design tokens (see docs/DESIGN.md §2.1).
 *
 * JS side of the token system: use for gradients, icons, SVG, Switch colours and anything that
 * can't take a NativeWind className. The same tokens are exposed as CSS variables in
 * `global.css` and as Tailwind colours in `tailwind.config.js` (`bg-surface`, `text-ink`, …).
 *
 * @example
 * const { colors, isDark } = useTheme();
 * <Icon as={Pill} color={colors.accent} />
 */
import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import { createContext, createElement, useContext, type ReactNode } from 'react';

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  bgTop: string;
  bgMid: string;
  bgBottom: string;
  surface: string;
  surfaceSolid: string;
  surfaceSunken: string;
  stroke: string;
  separator: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  onAccent: string;
  /** Sheet / dialog backdrop. */
  backdrop: string;
  /** Soft card shadow colour (light only; transparent in dark). */
  shadow: string;
}

export type PaletteToken = keyof Palette;

export const palette: Record<ColorScheme, Palette> = {
  light: {
    bgTop: '#D9E9FB',
    bgMid: '#EAF3FB',
    bgBottom: '#E1F3EA',
    surface: 'rgba(255,255,255,0.78)',
    surfaceSolid: '#FFFFFF',
    surfaceSunken: 'rgba(15,27,45,0.05)',
    stroke: 'rgba(255,255,255,0.9)',
    separator: 'rgba(15,27,45,0.08)',
    ink: '#0F1B2D',
    inkSecondary: '#5B6B7F',
    inkTertiary: '#94A3B5',
    accent: '#2F7FEA',
    accentSoft: '#E2EDFD',
    success: '#12A594',
    successSoft: '#DAF3EF',
    warning: '#E08A00',
    warningSoft: '#FDF0D9',
    danger: '#E5484D',
    dangerSoft: '#FDE6E6',
    onAccent: '#FFFFFF',
    backdrop: 'rgba(8,15,30,0.35)',
    shadow: 'rgba(30,60,90,1)',
  },
  dark: {
    bgTop: '#0A1322',
    bgMid: '#0D1A2C',
    bgBottom: '#0B2023',
    surface: 'rgba(255,255,255,0.07)',
    surfaceSolid: '#152235',
    surfaceSunken: 'rgba(255,255,255,0.05)',
    stroke: 'rgba(255,255,255,0.08)',
    separator: 'rgba(255,255,255,0.08)',
    ink: '#F2F6FB',
    inkSecondary: '#A5B3C5',
    inkTertiary: '#6B7A8F',
    accent: '#5AA2FF',
    accentSoft: 'rgba(90,162,255,0.16)',
    success: '#2DD4BF',
    successSoft: 'rgba(45,212,191,0.16)',
    warning: '#FBBF24',
    warningSoft: 'rgba(251,191,36,0.16)',
    danger: '#FF7A73',
    dangerSoft: 'rgba(255,122,115,0.16)',
    onAccent: '#06121F',
    backdrop: 'rgba(0,0,0,0.5)',
    shadow: 'transparent',
  },
};

/** Medicine tint palette (DESIGN.md §2.1). Tile background = tint at 14% opacity. */
export const medTints = [
  '#2F7FEA', // blue
  '#12A594', // teal
  '#7C66DC', // violet
  '#E5484D', // coral
  '#E08A00', // amber
  '#D6409F', // pink
  '#3E63DD', // indigo
  '#30A46C', // green
] as const;

/** Semantic tones shared by Text, Icon, StatusChip, Card, … */
export type Tone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'onAccent';

export function toneColor(colors: Palette, tone: Tone): string {
  switch (tone) {
    case 'primary':
      return colors.ink;
    case 'secondary':
      return colors.inkSecondary;
    case 'tertiary':
      return colors.inkTertiary;
    case 'accent':
      return colors.accent;
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    case 'onAccent':
      return colors.onAccent;
  }
}

/** Status tones (for chips, cards, toasts): strong + soft colours. */
export type StatusTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export function statusColors(colors: Palette, tone: StatusTone): { fg: string; bg: string } {
  switch (tone) {
    case 'accent':
      return { fg: colors.accent, bg: colors.accentSoft };
    case 'success':
      return { fg: colors.success, bg: colors.successSoft };
    case 'warning':
      return { fg: colors.warning, bg: colors.warningSoft };
    case 'danger':
      return { fg: colors.danger, bg: colors.dangerSoft };
    default:
      return { fg: colors.inkSecondary, bg: colors.surfaceSunken };
  }
}

/** Append an alpha (0..1) to a `#RRGGBB` colour. Returns the input unchanged for non-hex colours. */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/** Radii (DESIGN.md §2.3). */
export const radii = { card: 24, row: 20, input: 16, sheet: 32, pill: 999 } as const;

/** Spacing constants (DESIGN.md §2.3). */
export const spacing = { gutter: 20, cardPadding: 16, cardGap: 10 } as const;

/** Default spring (DESIGN.md §2.5). */
export const SPRING = { damping: 18, stiffness: 180, mass: 1 } as const;

const ThemeScopeContext = createContext<ColorScheme | null>(null);

/**
 * Forces a colour scheme for the design-system components below it (JS-token based components
 * only; NativeWind classNames still follow the global scheme). Mostly useful for previews.
 */
export function ThemeScope({ scheme, children }: { scheme: ColorScheme; children: ReactNode }) {
  return createElement(ThemeScopeContext.Provider, { value: scheme }, children);
}

export interface ThemeValue {
  scheme: ColorScheme;
  colors: Palette;
  isDark: boolean;
}

/** Current colour scheme + resolved palette. */
export function useTheme(): ThemeValue {
  const { colorScheme } = useColorScheme();
  const scoped = useContext(ThemeScopeContext);
  const scheme: ColorScheme = scoped ?? (colorScheme === 'dark' ? 'dark' : 'light');
  return { scheme, colors: palette[scheme], isDark: scheme === 'dark' };
}

/**
 * Legacy token names used by the pre-redesign screens, now mapped onto the new palette.
 * @deprecated use `palette` / `useTheme()`.
 */
export const THEME = {
  light: {
    background: palette.light.bgMid,
    foreground: palette.light.ink,
    card: palette.light.surfaceSolid,
    border: '#DCE4EE',
    primary: palette.light.accent,
    destructive: palette.light.danger,
  },
  dark: {
    background: palette.dark.bgMid,
    foreground: palette.dark.ink,
    card: palette.dark.surfaceSolid,
    border: '#22324A',
    primary: palette.dark.accent,
    destructive: palette.dark.danger,
  },
};

export const NAV_THEME: Record<ColorScheme, Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
