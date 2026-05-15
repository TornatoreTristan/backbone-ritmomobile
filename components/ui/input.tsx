import { useColors } from '@/hooks/use-theme-color';
import { Radius } from '@/constants/theme';
import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

export interface InputProps extends TextInputProps {
  error?: boolean;
  containerStyle?: ViewStyle;
}

export function Input({ error, style, containerStyle, ...rest }: InputProps) {
  const colors = useColors();
  return (
    <View style={[{ width: '100%' }, containerStyle]}>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            color: colors.foreground,
            backgroundColor: colors.background,
            borderColor: error ? colors.destructive : colors.border,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    fontSize: 15,
  },
});
