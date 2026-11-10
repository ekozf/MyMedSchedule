/**
 * "Pill Box" design tokens (docs/DESIGN.md §3).
 *
 * JS side of the token system: use for icons, SVG, Switch colours and anything that can't take a
 * NativeWind className. The same tokens are CSS variables in `global.css` and Tailwind colours in
 * `tailwind.config.js` (`bg-field`, `text-ink2`, …). Never hard-code a hex in a screen.
 *
 * @example
 * const { colors } = useTheme();
 * <Icon as={Pill} color={colors.ink2} />
 * <Text style={type.title3}>Metformin</Text>
 */
import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import { createContext, createElement, useContext, type ReactNode } from 'react';
import type { TextStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';

/** The §3.3 tokens. */
export interface CorePalette {
  /** Screen background (flat). */
  bg: string;
  /** Cards, grouped rows, grey buttons, compartments. */
  field: string;
  /** Progress track, pressed state of `field`. */
  field2: string;
  ink: string;
  ink2: string;
  /** Hairline separators. */
  line: string;
  /** Radio / checkbox borders, dashed empty compartment. */
  line2: string;
  accent: string;
  onAccent: string;
  done: string;
  doneInk: string;
  now: string;
  nowInk: string;
  late: string;
  danger: string;
  dangerSoft: string;
  inverse: string;
  onInverse: string;
  /** Sheet scrim. */
  backdrop: string;
}

export type Palette = CorePalette;
export type PaletteToken = keyof CorePalette;

const core: Record<ColorScheme, CorePalette> = {
  light: {
    bg: '#FFFFFF',
    field: '#F1F3F2',
    field2: '#E6EAE8',
    ink: '#141A17',
    ink2: '#4F5955',
    line: '#E2E6E4',
    line2: '#B5BDB9',
    accent: '#1B5E4A',
    onAccent: '#FFFFFF',
    done: '#D7EBDD',
    doneInk: '#175239',
    now: '#FFF1D6',
    nowInk: '#7A4B00',
    late: '#B4530A',
    danger: '#A4342A',
    dangerSoft: '#FBE6E3',
    inverse: '#141A17',
    onInverse: '#FFFFFF',
    backdrop: 'rgba(20,20,20,0.42)',
  },
  dark: {
    bg: '#0F1412',
    field: '#19201D',
    field2: '#222B27',
    ink: '#EEF3F0',
    ink2: '#9AA8A1',
    line: '#2F3A35',
    line2: '#52605A',
    accent: '#7ED3B2',
    onAccent: '#0F1412',
    done: '#173327',
    doneInk: '#9EE0C2',
    now: '#3A2A0E',
    nowInk: '#F5C06A',
    late: '#F0A05C',
    danger: '#F08A79',
    dangerSoft: '#3A1A16',
    inverse: '#F1F3F2',
    onInverse: '#141A17',
    backdrop: 'rgba(0,0,0,0.6)',
  },
};

export const palette: Record<ColorScheme, Palette> = {
  light: core.light,
  dark: core.dark,
};

// ---------------------------------------------------------------------------------------------
// Typeface (§3.1)

/**
 * Font family per weight. Android can't synthesise weights for custom fonts, so `Text` picks the
 * family from the weight and never sets `fontWeight` together with one of these.
 */
export const fontFamily = {
  regular: 'AtkinsonHyperlegibleNext_400Regular',
  medium: 'AtkinsonHyperlegibleNext_500Medium',
  semibold: 'AtkinsonHyperlegibleNext_600SemiBold',
  bold: 'AtkinsonHyperlegibleNext_700Bold',
  extrabold: 'AtkinsonHyperlegibleNext_800ExtraBold',
} as const;

export type FontWeight = '400' | '500' | '600' | '700' | '800';

const FAMILY_BY_WEIGHT: Record<FontWeight, string> = {
  '400': fontFamily.regular,
  '500': fontFamily.medium,
  '600': fontFamily.semibold,
  '700': fontFamily.bold,
  '800': fontFamily.extrabold,
};

let fontsReady = false;

/** Called by the root layout once the fonts loaded (false = fall back to the system font). */
export function setFontsLoaded(ready: boolean) {
  fontsReady = ready;
}

/** Normalises any RN fontWeight to one of the five bundled weights. */
export function normalizeWeight(weight: TextStyle['fontWeight'] | undefined): FontWeight {
  if (weight == null || weight === 'normal') return '400';
  if (weight === 'bold') return '700';
  const n = typeof weight === 'number' ? weight : parseInt(String(weight), 10);
  if (!Number.isFinite(n) || n <= 400) return '400';
  if (n <= 500) return '500';
  if (n <= 600) return '600';
  if (n <= 700) return '700';
  return '800';
}

/**
 * Style for a weight: the Atkinson family when loaded, else system font with `fontWeight`.
 * Use this in TextInput styles; `Text` does it for you.
 */
export function fontForWeight(weight: TextStyle['fontWeight'] | undefined): TextStyle {
  const w = normalizeWeight(weight);
  return fontsReady
    ? { fontFamily: FAMILY_BY_WEIGHT[w], fontWeight: 'normal' }
    : { fontWeight: w };
}

// ---------------------------------------------------------------------------------------------
// Type scale (§3.2)

export type TypeRole =
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption';

export interface TypeSpec {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
  letterSpacing: number;
}

/** letterSpacing in RN is points: em × fontSize. */
const em = (size: number, value: number) => Math.round(size * value * 100) / 100;

export const type: Record<TypeRole, TypeSpec> = {
  display: { fontSize: 46, lineHeight: 48, fontWeight: '800', letterSpacing: em(46, -0.03) },
  title1: { fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: em(34, -0.02) },
  title2: { fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: em(28, -0.02) },
  title3: { fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: em(22, -0.015) },
  headline: { fontSize: 19, lineHeight: 25, fontWeight: '700', letterSpacing: 0 },
  body: { fontSize: 18, lineHeight: 25, fontWeight: '400', letterSpacing: 0 },
  callout: { fontSize: 17, lineHeight: 23, fontWeight: '500', letterSpacing: 0 },
  subhead: { fontSize: 16, lineHeight: 22, fontWeight: '600', letterSpacing: 0 },
  footnote: { fontSize: 15, lineHeight: 20, fontWeight: '500', letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0 },
};

// ---------------------------------------------------------------------------------------------
// Tones (Text / Icon colour shortcuts)

export type Tone =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'onAccent'
  | 'done'
  | 'now'
  | 'late'
  | 'danger'
  | 'onInverse';

export function toneColor(colors: Palette, tone: Tone): string {
  switch (tone) {
    case 'primary':
      return colors.ink;
    case 'secondary':
      return colors.ink2;
    case 'accent':
      return colors.accent;
    case 'onAccent':
      return colors.onAccent;
    case 'done':
      return colors.doneInk;
    case 'now':
      return colors.nowInk;
    case 'late':
      return colors.late;
    case 'danger':
      return colors.danger;
    case 'onInverse':
      return colors.onInverse;
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

// ---------------------------------------------------------------------------------------------
// Shape & space (§3.4)

export const radii = {
  /** Compartments and cards. */
  card: 22,
  /** List groups. */
  group: 20,
  /** Text fields, toast. */
  field: 18,
  /** Buttons. */
  button: 16,
  /** Small inner tiles, segmented track. */
  tile: 14,
  /** Bottom sheet top corners. */
  sheet: 28,
  /** Chips, pills, round buttons. */
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  /** Screen side padding. */
  gutter: 20,
  /** Gap between cards. */
  cardGap: 12,
} as const;

/** Soft spring, settles in well under 300 ms (§3.5). */
export const SPRING = { damping: 22, stiffness: 260, mass: 1 } as const;

/** The only shadow in the app: under the toast (§3.4). */
export const TOAST_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.2,
  shadowRadius: 30,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
} as const;

/** Durations (§3.5). Use 1 ms under Reduce Motion. */
export const DURATION = { sheet: 320, scrim: 240, toast: 260, take: 300, toastHold: 3200 } as const;

// ---------------------------------------------------------------------------------------------
// Theme hook

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

export const NAV_THEME: Record<ColorScheme, Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: core.light.bg,
      border: core.light.line,
      card: core.light.bg,
      notification: core.light.danger,
      primary: core.light.accent,
      text: core.light.ink,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: core.dark.bg,
      border: core.dark.line,
      card: core.dark.bg,
      notification: core.dark.danger,
      primary: core.dark.accent,
      text: core.dark.ink,
    },
  },
};
