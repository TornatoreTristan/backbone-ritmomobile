import { useColors } from '@/hooks/use-theme-color';
import { Radius } from '@/constants/theme';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

export type BadgeTone =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info'
  | 'destructive'
  | 'muted';

export interface BadgeProps extends ViewProps {
  tone?: BadgeTone;
  /** Override colors with a custom hex (kept for legacy status palettes). */
  color?: string;
  children?: React.ReactNode;
}

export function Badge({ tone = 'default', color, style, children, ...rest }: BadgeProps) {
  const colors = useColors();

  const palette = (() => {
    if (color) return { bg: hexAlpha(color, 0.15), fg: color, border: 'transparent' };
    switch (tone) {
      case 'default':
        return { bg: colors.primary, fg: colors.primaryForeground, border: 'transparent' };
      case 'secondary':
        return { bg: colors.secondary, fg: colors.secondaryForeground, border: 'transparent' };
      case 'outline':
        return { bg: 'transparent', fg: colors.foreground, border: colors.border };
      case 'muted':
        return { bg: colors.muted, fg: colors.mutedForeground, border: 'transparent' };
      case 'success':
        return { bg: hexAlpha(colors.success, 0.15), fg: colors.success, border: 'transparent' };
      case 'warning':
        return { bg: hexAlpha(colors.warning, 0.18), fg: colors.warning, border: 'transparent' };
      case 'info':
        return { bg: hexAlpha(colors.info, 0.15), fg: colors.info, border: 'transparent' };
      case 'destructive':
        return {
          bg: hexAlpha(colors.destructive, 0.15),
          fg: colors.destructive,
          border: 'transparent',
        };
    }
  })();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: tone === 'outline' ? 1 : 0,
        },
        style,
      ]}
      {...rest}>
      {typeof children === 'string' ? (
        <Text style={[styles.label, { color: palette.fg }]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

function hexAlpha(hex: string, alpha: number): string {
  // Accept 3- or 6-digit hex; fall back to the input if it's not parseable.
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (full.length !== 6) return hex;
  const a = Math.max(0, Math.min(1, alpha));
  const aa = Math.round(a * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${full}${aa}`;
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
