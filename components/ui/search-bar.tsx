import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/hooks/use-theme-color';
import { Pressable, StyleSheet, View } from 'react-native';

export interface SearchBarProps {
  value: string;
  onChangeText: (next: string) => void;
  onClear: () => void;
  placeholder: string;
  accessibilityLabel?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder,
  accessibilityLabel,
  autoFocus,
}: SearchBarProps) {
  const colors = useColors();
  const hasValue = value.length > 0;
  return (
    <View style={styles.wrapper}>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        style={hasValue ? styles.inputWithClear : undefined}
      />
      {hasValue ? (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
          style={styles.clear}>
          <ThemedText style={[styles.clearLabel, { color: colors.mutedForeground }]}>
            ×
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithClear: {
    paddingRight: 36,
  },
  clear: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearLabel: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '400',
  },
});
