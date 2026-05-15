import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/hooks/use-theme-color';
import { Radius } from '@/constants/theme';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

export interface ListRowProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  subtitle?: string | null;
  /** Right-aligned text value (price, status badge, etc.). */
  trailing?: React.ReactNode;
  /** Left slot (icon container, avatar). */
  leading?: React.ReactNode;
  /** Card-like elevated row (border + background). Defaults to true. */
  bordered?: boolean;
  style?: PressableProps['style'];
}

export function ListRow({
  title,
  subtitle,
  trailing,
  leading,
  bordered = true,
  style,
  onPress,
  disabled,
  ...rest
}: ListRowProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={(state) => [
        styles.row,
        bordered && {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
        },
        state.pressed && onPress && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {leading}
      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="muted" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  pressed: { opacity: 0.85 },
});
