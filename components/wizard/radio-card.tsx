import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import { Pressable, StyleSheet, View } from 'react-native';

interface RadioCardProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

export function RadioCard({ label, selected, onPress, accessibilityLabel }: RadioCardProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? colors.foreground : colors.border,
          backgroundColor: selected ? colors.muted : colors.card,
          borderWidth: selected ? 1.5 : 1,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View
        style={[
          styles.dot,
          {
            borderColor: selected ? colors.foreground : colors.input,
            backgroundColor: selected ? colors.foreground : 'transparent',
          },
        ]}>
        {selected ? <View style={[styles.dotInner, { backgroundColor: colors.background }]} /> : null}
      </View>
      <ThemedText
        style={[
          styles.label,
          selected && { fontWeight: '600' },
        ]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 15,
    flex: 1,
  },
});
