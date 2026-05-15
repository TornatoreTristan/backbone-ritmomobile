import { useColors } from '@/hooks/use-theme-color';
import { Radius } from '@/constants/theme';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Stretch to fill parent width. */
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export function Button({
  variant = 'default',
  size = 'default',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  full,
  style,
  textStyle,
  children,
  ...rest
}: ButtonProps) {
  const colors = useColors();

  const palette = {
    default: { bg: colors.primary, fg: colors.primaryForeground, border: 'transparent' },
    outline: { bg: colors.background, fg: colors.foreground, border: colors.border },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground, border: 'transparent' },
    ghost: { bg: 'transparent', fg: colors.foreground, border: 'transparent' },
    destructive: { bg: colors.destructive, fg: colors.destructiveForeground, border: 'transparent' },
    link: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }[variant];

  const sizing = SIZE_STYLES[size];
  const labelSize = LABEL_SIZE[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizing,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        full && styles.full,
        variant === 'link' && styles.link,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {leftIcon}
          {typeof children === 'string' ? (
            <Text
              style={[
                styles.label,
                labelSize,
                { color: palette.fg },
                variant === 'link' && styles.linkLabel,
                textStyle,
              ]}>
              {children}
            </Text>
          ) : (
            children
          )}
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

const SIZE_STYLES: Record<ButtonSize, ViewStyle> = {
  default: { height: 44, paddingHorizontal: 18, borderRadius: Radius.md },
  sm: { height: 36, paddingHorizontal: 14, borderRadius: Radius.sm },
  lg: { height: 52, paddingHorizontal: 22, borderRadius: Radius.lg },
  icon: { width: 40, height: 40, borderRadius: Radius.md, paddingHorizontal: 0 },
};

const LABEL_SIZE: Record<ButtonSize, TextStyle> = {
  default: { fontSize: 15 },
  sm: { fontSize: 13 },
  lg: { fontSize: 16 },
  icon: { fontSize: 15 },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  full: { alignSelf: 'stretch' },
  link: { paddingHorizontal: 0, height: undefined },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  label: { fontWeight: '600', textAlign: 'center' },
  linkLabel: { fontWeight: '500', textDecorationLine: 'underline' },
});
