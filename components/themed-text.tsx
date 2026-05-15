import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import type { ColorTokenName } from '@/constants/theme';

export type ThemedTextVariant =
  | 'default'
  | 'defaultSemiBold'
  | 'title'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'subtitle'
  | 'body'
  | 'small'
  | 'muted'
  | 'label'
  | 'caption'
  | 'link';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemedTextVariant;
  /**
   * Pick a semantic token directly (overrides type-driven color).
   * Examples: 'mutedForeground', 'destructive', 'primary'.
   */
  tone?: ColorTokenName;
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  tone,
  ...rest
}: ThemedTextProps) {
  const baseColor = useThemeColor({ light: lightColor, dark: darkColor }, 'foreground');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const primaryColor = useThemeColor({}, 'primary');
  const tokenColor = useThemeColor({}, tone ?? 'foreground');

  const variantStyle = VARIANT_STYLES[type];
  const variantColor =
    tone !== undefined
      ? tokenColor
      : type === 'muted' || type === 'caption' || type === 'label'
        ? mutedColor
        : type === 'link'
          ? primaryColor
          : baseColor;

  return <Text style={[{ color: variantColor }, variantStyle, style]} {...rest} />;
}

const VARIANT_STYLES: Record<ThemedTextVariant, TextStyle> = StyleSheet.create({
    default: { fontSize: 15, lineHeight: 22 },
    defaultSemiBold: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
    body: { fontSize: 15, lineHeight: 22 },
    small: { fontSize: 13, lineHeight: 18 },
    muted: { fontSize: 14, lineHeight: 20 },
    label: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.2 },
    caption: { fontSize: 12, lineHeight: 16 },
    title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
    h1: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4 },
    h2: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.2 },
    h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
    subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
    link: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  } satisfies Record<ThemedTextVariant, TextStyle>);
