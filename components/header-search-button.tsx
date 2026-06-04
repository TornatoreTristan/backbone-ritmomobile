import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

export type SearchTargetType = 'folders' | 'interventions';

interface HeaderSearchButtonProps {
  type: SearchTargetType;
  accessibilityLabel?: string;
}

export function HeaderSearchButton({ type, accessibilityLabel }: HeaderSearchButtonProps) {
  const router = useRouter();
  const colors = useColors();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/search', params: { type } })}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Rechercher'}
      style={styles.button}>
      <IconSymbol name="magnifyingglass" size={22} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
