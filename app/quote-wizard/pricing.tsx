import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { Radius } from '@/constants/theme';
import { selectQuoteTotals, useQuoteWizard } from '@/contexts/quote-wizard-context';
import { useColors } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const DISCOUNT_PRESETS = [5, 10, 15, 20];

export default function PricingScreen() {
  const router = useRouter();
  const { state, update } = useQuoteWizard();
  const colors = useColors();

  const totals = selectQuoteTotals(state);

  const [isEditingPrice, setIsEditingPrice] = useState(() => !!state.staffFinalPriceTtc);

  function collapsePrice() {
    update('staffFinalPriceTtc', '');
    setIsEditingPrice(false);
  }

  function toggleDiscount(value: number) {
    const current = Number(state.staffDiscountPercent);
    update('staffDiscountPercent', current === value ? '' : String(value));
  }

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

        {isEditingPrice ? (
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

            <Button variant="ghost" size="sm" onPress={collapsePrice} style={styles.collapseBtn}>
              Annuler la modification
            </Button>
          </View>
        ) : (
          <Button variant="outline" full onPress={() => setIsEditingPrice(true)}>
            Modifier le prix
          </Button>
        )}

        <View style={styles.discountSection}>
          <WizardField
            label="Remise (%)"
            optional
            value={state.staffDiscountPercent}
            onChangeText={(t) => update('staffDiscountPercent', t)}
            placeholder="Ex : 10"
            keyboardType="decimal-pad"
            accessibilityLabel="Remise en pourcentage"
          />
          <View style={styles.chipsRow}>
            {DISCOUNT_PRESETS.map((preset) => {
              const active = Number(state.staffDiscountPercent) === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => toggleDiscount(preset)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Remise ${preset} %`}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceSubtle,
                      borderColor: active ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: active ? colors.primaryForeground : colors.foreground },
                    ]}>
                    {preset}%
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
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
    lineHeight: 36,
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
  collapseBtn: {
    alignSelf: 'flex-start',
  },
  discountSection: {
    gap: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
