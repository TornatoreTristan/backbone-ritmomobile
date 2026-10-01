import { ThemedText } from '@/components/themed-text';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { Radius } from '@/constants/theme';
import { useOrganization } from '@/contexts/organization-context';
import { selectQuoteTotals, useQuoteWizard } from '@/contexts/quote-wizard-context';
import { useColors } from '@/hooks/use-theme-color';
import {
  calculateGridTotal,
  countGridDiagnostics,
  gridCategoryFor,
  normalizePropertyType,
  type SuggestedProduct,
} from '@/services/quote-wizard';
import { describeWizardError, reportWizardError } from '@/services/quote-wizard-errors';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

interface DiagnosticCardProps {
  suggestion: SuggestedProduct;
  checked: boolean;
  onToggle: () => void;
  isUpdating: boolean;
}

function DiagnosticCard({ suggestion, checked, onToggle, isUpdating }: DiagnosticCardProps) {
  const colors = useColors();
  const isObligatoire = suggestion.result === 'obligatoire';

  const productName =
    suggestion.product.nameI18n.fr || suggestion.product.nameI18n.en || 'Produit';
  const iconUrl = suggestion.product.iconUrl || null;

  const accent = isObligatoire ? colors.destructive : colors.foreground;
  const selectedBg = isObligatoire ? colors.destructive + '10' : colors.muted;

  return (
    <Pressable
      onPress={isUpdating ? undefined : onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={productName}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: checked ? accent : colors.border,
          backgroundColor: checked ? selectedBg : colors.surfaceSubtle,
          opacity: pressed && !isUpdating ? 0.75 : 1,
        },
      ]}>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? accent : colors.input,
            backgroundColor: checked ? accent : 'transparent',
          },
        ]}>
        {checked ? <ThemedText style={[styles.checkmark, { color: colors.background }]}>✓</ThemedText> : null}
      </View>

      {iconUrl ? (
        <Image
          source={{ uri: iconUrl }}
          style={styles.icon}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.icon, styles.iconFallback, { borderColor: colors.border }]} />
      )}

      <ThemedText style={styles.cardLabel} numberOfLines={2}>
        {productName}
      </ThemedText>

      {isUpdating ? (
        <ActivityIndicator size="small" color={colors.foreground} style={styles.cardLoader} />
      ) : null}
    </Pressable>
  );
}

export default function Step7Screen() {
  const router = useRouter();
  const { state, toggleProduct, setGridTotal } = useQuoteWizard();
  const colors = useColors();
  const { isStaff, currentOrganization } = useOrganization();
  const staffOrgId = isStaff ? (currentOrganization?.id ?? undefined) : undefined;

  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridError, setGridError] = useState<string | null>(null);

  const allSuggestions = [...state.suggestionsObligatoire, ...state.suggestionsFacultatif];
  const totals = selectQuoteTotals(state);

  const selectedGridCount = countGridDiagnostics(allSuggestions, state.selectedProductIds);
  const hasValidGridTotal = !!state.gridTotal && (state.gridTotal.priceTtc ?? 0) > 0;
  // Bloque l'envoi si des diagnostics grille sont sélectionnés mais qu'on n'a pas
  // de prix grille valide : sans ça l'app enverrait des diagnostics à 0 €.
  const gridPriceMissing = selectedGridCount > 0 && !hasValidGridTotal;

  // Nombre pour lequel un calcul a déjà été lancé — initialisé depuis le total
  // hérité de l'étape 6 pour ne pas refaire l'appel inutilement à l'arrivée.
  const requestedCountRef = useRef<number | null>(state.gridTotal?.requestedCount ?? null);
  // Garde anti-course : deux toggles rapides ne doivent pas laisser la réponse
  // la plus lente écraser la plus récente.
  const requestIdRef = useRef(0);

  async function fetchGridTotal(gridProductCount: number) {
    requestedCountRef.current = gridProductCount;

    // L'API refuse diagnosticCount < 1 : sans diagnostic grille, il n'y a pas de
    // prix de grille à afficher, seulement les produits à prix fixe.
    if (gridProductCount === 0) {
      setGridError(null);
      setGridTotal(null, 0);
      return;
    }

    const requestId = ++requestIdRef.current;
    setGridLoading(true);
    setGridError(null);

    // NaN (saisie illisible) serait sérialisé en `null` et rejeté en 422.
    const parsedSurface = parseFloat(state.surfaceArea);
    const gridCategory = gridCategoryFor(state.projectType);
    const payload = {
      postalCode: state.postalCode,
      propertyType: normalizePropertyType(state.propertyType ?? ''),
      diagnosticCount: gridProductCount,
      ...(Number.isFinite(parsedSurface) ? { surfaceArea: parsedSurface } : {}),
      ...(gridCategory ? { gridCategory } : {}),
    };

    try {
      const gridTotal = await calculateGridTotal(payload, staffOrgId);

      if (requestId !== requestIdRef.current) return;
      setGridTotal(gridTotal, gridProductCount);
    } catch (err) {
      reportWizardError(err, 'step-7', 'calculate-grid-total', payload);
      if (requestId !== requestIdRef.current) return;
      setGridError(describeWizardError(err, 'Impossible de calculer le prix grille.'));
    } finally {
      if (requestId === requestIdRef.current) setGridLoading(false);
    }
  }

  // Le prix grille n'est pas persisté, et il peut aussi être périmé (calculé pour
  // un autre nombre de diagnostics). On recalcule dès que la sélection grille ne
  // correspond plus au dernier calcul demandé — sans ça un total erroné traverse
  // l'écran prix, le récapitulatif et la soumission.
  useEffect(() => {
    if (requestedCountRef.current !== selectedGridCount) {
      fetchGridTotal(selectedGridCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGridCount]);

  async function handleToggle(productId: string) {
    const allSelected = toggleProduct(productId);
    setUpdatingProductId(productId);

    await fetchGridTotal(countGridDiagnostics(allSuggestions, allSelected));
    setUpdatingProductId(null);
  }

  return (
    <>
      <WizardScreen
        title="Diagnostics"
        subtitle="Sélectionnez les diagnostics à inclure dans votre devis.">
        {state.suggestionsObligatoire.length > 0 ? (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.destructive }]}>
              Obligatoires
            </ThemedText>
            <View style={styles.grid}>
              {state.suggestionsObligatoire.map((suggestion) => (
                <View key={suggestion.product.id} style={styles.gridItem}>
                  <DiagnosticCard
                    suggestion={suggestion}
                    checked={state.selectedProductIds.includes(suggestion.product.id)}
                    onToggle={() => handleToggle(suggestion.product.id)}
                    isUpdating={updatingProductId === suggestion.product.id}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {state.suggestionsFacultatif.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="muted" style={styles.sectionTitle}>
              Facultatifs
            </ThemedText>
            <View style={styles.grid}>
              {state.suggestionsFacultatif.map((suggestion) => (
                <View key={suggestion.product.id} style={styles.gridItem}>
                  <DiagnosticCard
                    suggestion={suggestion}
                    checked={state.selectedProductIds.includes(suggestion.product.id)}
                    onToggle={() => handleToggle(suggestion.product.id)}
                    isUpdating={updatingProductId === suggestion.product.id}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {state.suggestionsObligatoire.length === 0 && state.suggestionsFacultatif.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText type="muted">Aucun diagnostic suggéré pour ce bien.</ThemedText>
          </View>
        ) : null}

        <View
          style={[
            styles.totalCard,
            { borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
          ]}>
          <ThemedText type="muted" style={styles.totalCount}>
            {totals.selected.length} diagnostic{totals.selected.length > 1 ? 's' : ''} sélectionné
            {totals.selected.length > 1 ? 's' : ''}
          </ThemedText>
          {totals.supplementsTtc > 0 ? (
            <View style={styles.breakdownRow}>
              <ThemedText type="muted" style={styles.breakdownLabel}>
                Dont suppléments
              </ThemedText>
              <ThemedText type="muted" style={styles.breakdownLabel}>
                +{priceFormatter.format(totals.supplementsTtc)}
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <ThemedText style={styles.totalLabel}>Total TTC</ThemedText>
            {gridLoading ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <ThemedText style={[styles.totalValue, { color: colors.foreground }]}>
                {priceFormatter.format(totals.totalTtc)}
              </ThemedText>
            )}
          </View>
          {gridError ? (
            <View style={styles.gridErrorBlock}>
              <ThemedText style={[styles.gridErrorText, { color: colors.destructive }]}>
                {gridError}
              </ThemedText>
              <Pressable
                onPress={() => fetchGridTotal(selectedGridCount)}
                disabled={gridLoading}
                accessibilityRole="button"
                accessibilityLabel="Réessayer le calcul du prix"
                style={({ pressed }) => [
                  styles.retryButton,
                  { borderColor: colors.foreground, opacity: pressed || gridLoading ? 0.5 : 1 },
                ]}>
                <ThemedText style={[styles.retryText, { color: colors.foreground }]}>
                  Réessayer
                </ThemedText>
              </Pressable>
            </View>
          ) : gridPriceMissing ? (
            <ThemedText style={[styles.gridErrorText, { color: colors.destructive }]}>
              {gridLoading
                ? 'Calcul du prix grille en cours…'
                : 'Aucun prix de grille pour ce bien (zone, type de bien ou surface non couverts par la grille de votre organisation).'}
            </ThemedText>
          ) : null}
        </View>
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        loading={gridLoading}
        nextDisabled={gridLoading || gridPriceMissing}
        onNext={() =>
          router.push(isStaff ? '/quote-wizard/pricing' : '/quote-wizard/step-8')
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '48.5%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
    minHeight: 56,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  icon: {
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: 4,
  },
  iconFallback: {
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.3,
  },
  cardLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  cardLoader: {
    flexShrink: 0,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  totalCard: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: 16,
    gap: 8,
    marginTop: 4,
  },
  totalCount: {
    fontSize: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 12,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  gridErrorBlock: { gap: 10 },
  retryButton: {
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  retryText: { fontSize: 14, fontWeight: '500' },
  gridErrorText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
