import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import type { ColorTokenName } from '@/constants/theme';

export type ThemedViewVariant = 'background' | 'card' | 'muted' | 'popover' | 'transparent';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  /** Surface variant — defaults to "background". */
  variant?: ThemedViewVariant;
  /** Override with a specific token (takes precedence over variant). */
  tone?: ColorTokenName;
};

const VARIANT_TOKEN: Record<Exclude<ThemedViewVariant, 'transparent'>, ColorTokenName> = {
  background: 'background',
  card: 'card',
  muted: 'muted',
  popover: 'popover',
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  variant = 'background',
  tone,
  ...otherProps
}: ThemedViewProps) {
  const token: ColorTokenName =
    tone ?? (variant === 'transparent' ? 'background' : VARIANT_TOKEN[variant]);
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, token);

  if (variant === 'transparent') {
    return <View style={style} {...otherProps} />;
  }
  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
