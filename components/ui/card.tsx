import { useColors } from '@/hooks/use-theme-color';
import { Radius } from '@/constants/theme';
import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  /** When true, renders without internal padding (you control spacing). */
  noPadding?: boolean;
  /** When true, applies a slightly muted surface (useful on cards-on-cards). */
  subtle?: boolean;
}

export function Card({ style, noPadding, subtle, ...rest }: CardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: subtle ? colors.surfaceSubtle : colors.card,
          borderColor: colors.border,
        },
        !noPadding && styles.padding,
        style,
      ]}
      {...rest}
    />
  );
}

export interface PressableCardProps extends Omit<PressableProps, 'children' | 'style'> {
  noPadding?: boolean;
  subtle?: boolean;
  style?: PressableProps['style'];
  children?: React.ReactNode;
}

export function PressableCard({
  noPadding,
  subtle,
  style,
  children,
  ...rest
}: PressableCardProps) {
  const colors = useColors();

  return (
    <Pressable
      style={(state) => [
        styles.card,
        {
          backgroundColor: subtle ? colors.surfaceSubtle : colors.card,
          borderColor: colors.border,
        },
        !noPadding && styles.padding,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {children}
    </Pressable>
  );
}

export function CardHeader({ style, ...rest }: ViewProps) {
  return <View style={[styles.section, style]} {...rest} />;
}

export function CardContent({ style, ...rest }: ViewProps) {
  return <View style={[styles.section, style]} {...rest} />;
}

export function CardFooter({ style, ...rest }: ViewProps) {
  return <View style={[styles.footer, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padding: {
    padding: 16,
    gap: 8,
  },
  section: {
    gap: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  pressed: { opacity: 0.85 },
});
