import { ThemedText } from '@/components/themed-text';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { Radius } from '@/constants/theme';
import { selectQuoteTotals, useQuoteWizard } from '@/contexts/quote-wizard-context';
import { useColors } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export default function PricingScreen() {
  const router = useRouter();
  const { state, update } = useQuoteWizard();
  const colors = useColors();

  const totals = selectQuoteTotals(state);

  return (
    <>
      <WizardScreen
        title="Prix"
        subtitle="Ajustez le prix final si nécessaire."
        contentStyle={{ gap: 20 }}>
        <View
          style={[
            styles.gridPriceBox,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
          ]}>
          <ThemedText style={styles.gridPriceLabel}>Total grille calculé</ThemedText>
          <ThemedText style={[styles.gridPriceValue, { color: colors.foreground }]}>
            {priceFormatter.format(totals.totalTtc)}
          </ThemedText>
          {totals.totalTtc === 0 ? (
            <ThemedText style={styles.gridPriceHint}>
              Aucun produit sélectionné ou grille non calculée
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.fieldsSection}>
          <WizardField
            label="Prix final TTC"
            optional
            value={state.staffFinalPriceTtc}
            onChangeText={(t) => update('staffFinalPriceTtc', t)}
            placeholder="Ex : 450.00"
            keyboardType="decimal-pad"
            accessibilityLabel="Prix final TTC"
          />

          <WizardField
            label="Prix barré TTC"
            optional
            value={state.staffOriginalPriceTtc}
            onChangeText={(t) => update('staffOriginalPriceTtc', t)}
            placeholder="Ex : 520.00"
            keyboardType="decimal-pad"
            accessibilityLabel="Prix barré TTC"
          />

          <WizardField
            label="Remise (%)"
            optional
            value={state.staffDiscountPercent}
            onChangeText={(t) => update('staffDiscountPercent', t)}
            placeholder="Ex : 10"
            keyboardType="decimal-pad"
            accessibilityLabel="Remise en pourcentage"
          />
        </View>
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={() => router.push('/quote-wizard/rdv')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  gridPriceBox: {
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 4,
  },
  gridPriceLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.5,
  },
  gridPriceValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  gridPriceHint: {
    fontSize: 12,
    opacity: 0.45,
    marginTop: 2,
  },
  fieldsSection: {
    gap: 14,
  },
});
