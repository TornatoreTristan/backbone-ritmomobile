import { ThemedText } from '@/components/themed-text';
import { WizardField } from '@/components/wizard/wizard-field';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

interface ManualRdvInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

/** Returns true when `s` is a non-empty string that parses to a valid Date. */
function isValidIso(s: string): boolean {
  if (s === '') return false;
  return !isNaN(new Date(s).getTime());
}

/**
 * Fallback manual ISO date-time input.
 * Accepts any ISO 8601 string (e.g. 2026-06-10T09:00:00.000Z).
 * MIN-3: only propagates the value upstream when it parses to a valid Date;
 * otherwise it keeps the raw draft locally and shows an inline error hint.
 */
export function ManualRdvInput({ value, onChangeText }: ManualRdvInputProps) {
  const colors = useColors();

  // Local draft: the text the user is currently typing (may be invalid)
  const [draft, setDraft] = useState(value);
  const [touched, setTouched] = useState(false);

  const showError = touched && draft !== '' && !isValidIso(draft);

  function handleChange(raw: string) {
    const trimmed = raw.trim();
    setDraft(trimmed);
    setTouched(true);
    if (trimmed === '' || isValidIso(trimmed)) {
      // Only forward valid (or cleared) values to the parent / wizard state
      onChangeText(trimmed);
    }
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
      ]}>
      <ThemedText style={[styles.title, { color: colors.foreground }]}>
        Saisie manuelle de la date
      </ThemedText>
      <WizardField
        label="Date et heure"
        optional
        value={draft}
        onChangeText={handleChange}
        placeholder="2026-06-10T09:00:00.000Z"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="default"
        accessibilityLabel="Date et heure du rendez-vous au format ISO 8601"
      />
      {showError ? (
        <ThemedText style={[styles.errorHint, { color: colors.destructive }]}>
          Date invalide — utilisez le format ISO 8601, ex : 2026-06-10T09:00:00.000Z
        </ThemedText>
      ) : (
        <ThemedText style={[styles.hint, { color: colors.mutedForeground }]}>
          Format ISO 8601 — ex : 2026-06-10T09:00:00.000Z
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    padding: 14,
    gap: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginTop: -4,
  },
  errorHint: {
    fontSize: 12,
    marginTop: -4,
    fontWeight: '500',
  },
});
