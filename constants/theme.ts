/**
 * Design tokens — aligned with the SaaS web *partner portal* DA.
 *
 * Web reference: backbone-ritmo/inertia/css/app.css → `.partner-theme`
 * (applied by inertia/components/layouts/partner-layout.tsx). The partner portal
 * starts from the shadcn neutral `:root` preset and overrides only the brand:
 *   --primary: #1f4332 (forest green) · --background: #fffdf6 (cool ivory) · --ring: #1f4332.
 * Light mode below mirrors that exactly. oklch neutrals are converted to their
 * sRGB hex equivalents. The web portal is light-only; dark mode here keeps the
 * brand coherent by shifting the green to a lighter, dark-readable tint (#56a681,
 * the landing/brand green).
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
    // Surfaces — partner portal: cool ivory background, white cards
    background: '#fffdf6',
    foreground: '#252525',
    card: '#ffffff',
    cardForeground: '#252525',
    popover: '#ffffff',
    popoverForeground: '#252525',

    // Brand — partner forest green
    primary: '#1f4332',
    primaryForeground: '#ffffff',

    // Neutrals (shadcn neutral preset)
    secondary: '#f7f7f7',
    secondaryForeground: '#343434',
    muted: '#f7f7f7',
    mutedForeground: '#8e8e8e',
    accent: '#f7f7f7',
    accentForeground: '#343434',

    // States
    destructive: '#d4183d',
    destructiveForeground: '#ffffff',
    success: '#16a34a',
    warning: '#f59e0b',
    info: '#2563eb',

    // Lines & focus — focus ring on brand green
    border: '#ebebeb',
    input: '#ebebeb',
    ring: '#1f4332',

    // Surface variants
    surfaceSubtle: '#faf8f0',
    surfaceOverlay: 'rgba(31, 67, 50, 0.04)',

    // Legacy aliases
    text: '#252525',
    tint: '#1f4332',
    icon: '#8e8e8e',
    tabIconDefault: '#a3a3a3',
    tabIconSelected: '#1f4332',
  },
  dark: {
    // Surfaces
    background: '#0a0a0a',
    foreground: '#fafafa',
    card: '#171717',
    cardForeground: '#fafafa',
    popover: '#262626',
    popoverForeground: '#fafafa',

    // Brand — lighter green so it stays readable on dark surfaces
    primary: '#56a681',
    primaryForeground: '#0a0a0a',

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

    // Lines & focus — focus ring on brand green
    border: '#262626',
    input: '#404040',
    ring: '#56a681',

    // Surface variants
    surfaceSubtle: '#141414',
    surfaceOverlay: 'rgba(86, 166, 129, 0.08)',

    // Legacy aliases
    text: '#fafafa',
    tint: '#56a681',
    icon: '#a3a3a3',
    tabIconDefault: '#737373',
    tabIconSelected: '#56a681',
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
