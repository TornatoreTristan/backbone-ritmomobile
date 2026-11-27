import { ThemedText } from '@/components/themed-text';
import { WizardField } from '@/components/wizard/wizard-field';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import { formatManualRdv, parseManualRdv } from '@/services/scheduling';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

interface ManualRdvInputProps {
  /** RDV courant du wizard (ISO 8601) ou chaîne vide. */
  value: string;
  /** Reçoit l'ISO du RDV saisi, ou une chaîne vide quand la saisie est vide ou invalide. */
  onChangeText: (iso: string) => void;
}

/**
 * Saisie manuelle du RDV au format « JJ/MM/AAAA HH:MM » (heure de Paris).
 *
 * Le champ ne laisse jamais un ancien RDV en place derrière une saisie
 * invalide : tant que le texte n'est pas une date valide, le RDV du wizard est
 * vidé. À l'inverse, un créneau choisi dans la grille se reflète dans le champ.
 */
export function ManualRdvInput({ value, onChangeText }: ManualRdvInputProps) {
  const colors = useColors();

  const [draft, setDraft] = useState(() => formatManualRdv(value));
  // Dernière valeur du wizard reflétée par `draft` : si `value` change sans
  // passer par ce champ (créneau choisi, RDV effacé), on resynchronise le texte.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(formatManualRdv(value));
  }

  const parsed = draft.trim() === '' ? null : parseManualRdv(draft);
  const error = parsed && 'error' in parsed ? parsed.error : null;

  function handleChange(raw: string) {
    setDraft(raw);
    const result = raw.trim() === '' ? null : parseManualRdv(raw);
    const iso = result && 'iso' in result ? result.iso : '';
    setSyncedValue(iso);
    onChangeText(iso);
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
        placeholder="10/06/2026 09:00"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel="Date et heure du rendez-vous, au format jour, mois, année, heure, minutes"
        error={error}
      />
      {error ? null : (
        <ThemedText style={[styles.hint, { color: colors.mutedForeground }]}>
          Format : JJ/MM/AAAA HH:MM (heure de Paris)
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
});
