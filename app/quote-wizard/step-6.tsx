import { ThemedText } from '@/components/themed-text';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { Radius } from '@/constants/theme';
import { useOrganization } from '@/contexts/organization-context';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import { useColors } from '@/hooks/use-theme-color';
import {
  PROJECT_TYPE_TO_TRANSACTION,
  YEAR_RANGE_MAP,
  calculateGridTotal,
  countGridDiagnostics,
  gridCategoryFor,
  normalizePropertyType,
  suggestDiagnostics,
  type SuggestionsResult,
} from '@/services/quote-wizard';
import { describeWizardError, reportWizardError } from '@/services/quote-wizard-errors';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Step6Screen() {
  const router = useRouter();
  const { state, addDependance, removeDependance, updateDependance, setSuggestions, setGridTotal } =
    useQuoteWizard();
  const colors = useColors();
  const { isStaff, currentOrganization } = useOrganization();
  const staffOrgId = isStaff ? (currentOrganization?.id ?? undefined) : undefined;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNext() {
    const emptyDeps = state.dependances.filter((d) => d.nom.trim() === '');
    emptyDeps.forEach((d) => removeDependance(d.id));

    setIsLoading(true);
    setError(null);

    const transactionType = PROJECT_TYPE_TO_TRANSACTION[state.projectType!];
    const propertyType = normalizePropertyType(state.propertyType ?? '');

    const parsedYear = state.exactYear.trim()
      ? parseInt(state.exactYear, 10)
      : state.yearRange
        ? YEAR_RANGE_MAP[state.yearRange]
        : NaN;
    // Une saisie illisible (ex. « , ») donne NaN, sérialisé en `null` par JSON
    // et rejeté en 422 : on omet le champ plutôt que de bloquer le partenaire.
    const constructionYear = Number.isFinite(parsedYear) ? parsedYear : undefined;
    const parsedSurface = parseFloat(state.surfaceArea);
    const surfaceArea = Number.isFinite(parsedSurface) ? parsedSurface : undefined;

    const suggestPayload = {
      postalCode: state.postalCode,
      propertyType,
      transactionType,
      ...(constructionYear !== undefined ? { constructionYear } : {}),
      ...(surfaceArea !== undefined ? { surfaceArea } : {}),
      hasGas: state.hasGas === 'oui',
      hasElectricity: true,
    };

    let suggestions: SuggestionsResult;
    try {
      suggestions = await suggestDiagnostics(suggestPayload, staffOrgId);
    } catch (err) {
      reportWizardError(err, 'step-6', 'suggest', suggestPayload);
      setError(
        describeWizardError(err, 'Impossible de récupérer les diagnostics. Réessayez dans quelques instants.'),
      );
      setIsLoading(false);
      return;
    }

    const selectedIds = setSuggestions(suggestions);

    // Compter TOUTES les suggestions (pas seulement les obligatoires) filtrées
    // sur la sélection réelle : à la reprise d'un brouillon, des facultatifs
    // peuvent être re-sélectionnés par setSuggestions.
    const gridCount = countGridDiagnostics(
      [...suggestions.obligatoire, ...suggestions.facultatif],
      selectedIds,
    );

    const gridCategory = gridCategoryFor(state.projectType);

    if (gridCount > 0) {
      const gridPayload = {
        postalCode: state.postalCode,
        propertyType,
        diagnosticCount: gridCount,
        ...(surfaceArea !== undefined ? { surfaceArea } : {}),
        ...(gridCategory ? { gridCategory } : {}),
      };
      try {
        setGridTotal(await calculateGridTotal(gridPayload, staffOrgId), gridCount);
      } catch (err) {
        // Non bloquant : l'étape 7 recalcule le prix grille dès qu'il manque,
        // affiche l'erreur avec un bouton « Réessayer » et empêche l'envoi sans prix.
        reportWizardError(err, 'step-6', 'calculate-grid-total', gridPayload);
        setGridTotal(null, 0);
      }
    } else {
      // Aucun diagnostic grille : pas d'appel (l'API exige diagnosticCount >= 1),
      // le total se limite aux produits à prix fixe.
      setGridTotal(null, 0);
    }

    setIsLoading(false);
    router.push('/quote-wizard/step-7');
  }

  return (
    <>
      <WizardScreen
        title="Dépendances"
        subtitle="Ajoutez les dépendances du bien (caves, garages, etc.) si nécessaire.">
        {state.dependances.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              { borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
            ]}>
            <ThemedText style={styles.emptyText}>Aucune dépendance ajoutée</ThemedText>
            <ThemedText type="muted" style={styles.emptyHint}>
              Appuyez sur « Ajouter » pour en ajouter une.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.depList}>
            {state.dependances.map((dep) => (
              <View
                key={dep.id}
                style={[
                  styles.depCard,
                  { borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
                ]}>
                <View style={styles.depCardHeader}>
                  <ThemedText style={styles.depCardTitle}>Dépendance</ThemedText>
                  <Pressable
                    onPress={() => removeDependance(dep.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Supprimer cette dépendance"
                    hitSlop={12}
                    style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.5 }]}>
                    <ThemedText style={styles.deleteIcon}>✕</ThemedText>
                  </Pressable>
                </View>
                <View style={styles.depRow}>
                  <WizardField
                    label="Nom"
                    value={dep.nom}
                    onChangeText={(t) => updateDependance(dep.id, { nom: t })}
                    placeholder="Cave, Garage…"
                    accessibilityLabel="Nom de la dépendance"
                    containerStyle={styles.flex}
                  />
                  <WizardField
                    label="Surface (m²)"
                    value={dep.superficie}
                    onChangeText={(t) => updateDependance(dep.id, { superficie: t })}
                    keyboardType="decimal-pad"
                    placeholder="15"
                    accessibilityLabel="Surface de la dépendance en m²"
                    containerStyle={styles.smallField}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable
          onPress={() => addDependance({ id: generateId(), nom: '', superficie: '' })}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une dépendance"
          style={({ pressed }) => [
            styles.addButton,
            { borderColor: colors.foreground, opacity: pressed ? 0.65 : 1 },
          ]}>
          <ThemedText style={[styles.addButtonText, { color: colors.foreground }]}>
            + Ajouter une dépendance
          </ThemedText>
        </Pressable>

        {error ? (
          <View
            style={[
              styles.errorContainer,
              {
                backgroundColor: colors.destructive + '18',
                borderColor: colors.destructive,
              },
            ]}>
            <ThemedText style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </ThemedText>
            <Pressable
              onPress={handleNext}
              accessibilityRole="button"
              accessibilityLabel="Réessayer"
              style={[styles.retryButton, { borderColor: colors.foreground }]}>
              <ThemedText style={[styles.retryText, { color: colors.foreground }]}>
                Réessayer
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={handleNext}
        loading={isLoading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    padding: 24,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 6,
  },
  emptyText: { fontSize: 14, opacity: 0.7 },
  emptyHint: { fontSize: 13, textAlign: 'center' },
  depList: { gap: 12 },
  depCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  depCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  depCardTitle: { fontSize: 13, fontWeight: '600', opacity: 0.65 },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: { fontSize: 14, opacity: 0.6 },
  depRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  flex: { flex: 1 },
  smallField: { width: 110 },
  addButton: {
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  addButtonText: { fontSize: 15, fontWeight: '500' },
  errorContainer: {
    gap: 10,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  retryText: { fontSize: 14, fontWeight: '500' },
});
