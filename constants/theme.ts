/**
 * Design tokens — aligned with the SaaS web frontend (shadcn/ui neutral preset).
 *
 * Web reference: backbone-ritmo/inertia/css/app.css (Tailwind v4 + shadcn).
 * oklch values converted to sRGB hex equivalents close to Tailwind v4 neutral.
 *
 * Color tokens follow shadcn semantic naming:
 *   background, foreground, card, cardForeground, popover, popoverForeground,
 *   primary, primaryForeground, secondary, secondaryForeground,
 *   muted, mutedForeground, accent, accentForeground,
 *   destructive, destructiveForeground, border, input, ring.
 *
 * Legacy aliases (`tint`, `icon`, `tabIconDefault`, `tabIconSelected`, `text`)
 * are kept for backwards compatibility with screens that still read them.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Surfaces
    background: '#faf6ee',
    foreground: '#0a0a0a',
    card: '#ffffff',
    cardForeground: '#0a0a0a',
    popover: '#ffffff',
    popoverForeground: '#0a0a0a',

    // Brand
    primary: '#171717',
    primaryForeground: '#fafafa',

    // Neutrals
    secondary: '#f5f5f5',
    secondaryForeground: '#171717',
    muted: '#f5f5f5',
    mutedForeground: '#737373',
    accent: '#f5f5f5',
    accentForeground: '#171717',

    // States
    destructive: '#d4183d',
    destructiveForeground: '#ffffff',
    success: '#16a34a',
    warning: '#f59e0b',
    info: '#2563eb',

    // Lines & focus
    border: '#e5e5e5',
    input: '#e5e5e5',
    ring: '#a3a3a3',

    // Surface variants
    surfaceSubtle: '#fafafa',
    surfaceOverlay: 'rgba(0, 0, 0, 0.04)',

    // Legacy aliases
    text: '#0a0a0a',
    tint: '#171717',
    icon: '#737373',
    tabIconDefault: '#a3a3a3',
    tabIconSelected: '#171717',
  },
  dark: {
    // Surfaces
    background: '#0a0a0a',
    foreground: '#fafafa',
    card: '#171717',
    cardForeground: '#fafafa',
    popover: '#262626',
    popoverForeground: '#fafafa',

    // Brand
    primary: '#fafafa',
    primaryForeground: '#171717',

    // Neutrals
    secondary: '#262626',
    secondaryForeground: '#fafafa',
    muted: '#262626',
    mutedForeground: '#a3a3a3',
    accent: '#404040',
    accentForeground: '#fafafa',

    // States
    destructive: '#f87171',
    destructiveForeground: '#fafafa',
    success: '#22c55e',
    warning: '#fbbf24',
    info: '#60a5fa',

    // Lines & focus
    border: '#262626',
    input: '#404040',
    ring: '#737373',

    // Surface variants
    surfaceSubtle: '#141414',
    surfaceOverlay: 'rgba(255, 255, 255, 0.06)',

    // Legacy aliases
    text: '#fafafa',
    tint: '#fafafa',
    icon: '#a3a3a3',
    tabIconDefault: '#737373',
    tabIconSelected: '#fafafa',
  },
} as const;

export const Radius = {
  none: 0,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  full: 9999,
} as const;

export const Spacing = {
  px: 1,
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const FontSize = {
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export type ColorTokens = { [K in keyof typeof Colors.light]: string };
export type ColorTokenName = keyof ColorTokens;
