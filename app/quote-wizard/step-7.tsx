import { ThemedText } from '@/components/themed-text';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { Radius } from '@/constants/theme';
import { useOrganization } from '@/contexts/organization-context';
import { selectQuoteTotals, useQuoteWizard } from '@/contexts/quote-wizard-context';
import { useColors } from '@/hooks/use-theme-color';
import { calculateGridTotal, normalizePropertyType, type SuggestedProduct } from '@/services/quote-wizard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

  const allSuggestions = [...state.suggestionsObligatoire, ...state.suggestionsFacultatif];
  const totals = selectQuoteTotals(state);

  async function handleToggle(productId: string) {
    const allSelected = toggleProduct(productId);
    setUpdatingProductId(productId);

    try {
      const gridProductCount = allSuggestions.filter(
        (s) => s.pricingSource === 'grid' && allSelected.includes(s.product.id),
      ).length;

      const surfaceArea = state.surfaceArea.trim() ? parseFloat(state.surfaceArea) : undefined;
      const propertyType = normalizePropertyType(state.propertyType ?? '');

      const gridTotal = await calculateGridTotal({
        postalCode: state.postalCode,
        propertyType,
        diagnosticCount: gridProductCount,
        ...(surfaceArea !== undefined ? { surfaceArea } : {}),
      }, staffOrgId);

      setGridTotal(gridTotal);
    } catch {
      // Silencieux — le total précédent reste affiché
    } finally {
      setUpdatingProductId(null);
    }
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
          <View style={styles.totalRow}>
            <ThemedText style={styles.totalLabel}>Total TTC</ThemedText>
            <ThemedText style={[styles.totalValue, { color: colors.foreground }]}>
              {priceFormatter.format(totals.totalTtc)}
            </ThemedText>
          </View>
        </View>
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
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
});
