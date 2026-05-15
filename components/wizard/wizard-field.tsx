import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

export interface WizardFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  optional?: boolean;
  required?: boolean;
  error?: string | null;
  multiline?: boolean;
  containerStyle?: ViewStyle;
}

export function WizardField({
  label,
  optional,
  required,
  error,
  multiline,
  containerStyle,
  ...inputProps
}: WizardFieldProps) {
  const colors = useColors();
  const hasError = !!error;

  return (
    <View style={containerStyle}>
      {label ? (
        <ThemedText style={styles.label}>
          {label}
          {optional ? (
            <ThemedText style={styles.optionalHint}>{' (optionnel)'}</ThemedText>
          ) : null}
          {required ? (
            <ThemedText style={[styles.requiredHint, { color: colors.destructive }]}>
              {' *'}
            </ThemedText>
          ) : null}
        </ThemedText>
      ) : null}
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        numberOfLines={multiline ? 4 : undefined}
        {...inputProps}
        style={[
          multiline ? styles.inputMultiline : styles.input,
          {
            borderColor: hasError ? colors.destructive : colors.border,
            backgroundColor: colors.surfaceSubtle,
            color: colors.foreground,
          },
        ]}
      />
      {hasError ? (
        <ThemedText style={[styles.errorText, { color: colors.destructive }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  optionalHint: { fontSize: 13, opacity: 0.45, fontWeight: '400' },
  requiredHint: { fontSize: 13, fontWeight: '600' },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 100,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});
