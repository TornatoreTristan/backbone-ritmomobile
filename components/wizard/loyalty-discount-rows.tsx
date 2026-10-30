import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import type { QuoteTotals } from '@/contexts/quote-wizard-context';
import { useColors } from '@/hooks/use-theme-color';

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const percentFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/**
 * Lignes « Sous-total » et « Remise partenaire » à placer au-dessus du
 * « Total TTC » (qui affiche `totals.totalTtc`, déjà remisé). Ne rend rien sans
 * remise partenaire, pour laisser l'affichage inchangé.
 */
export function LoyaltyDiscountRows({ totals }: { totals: QuoteTotals }) {
  const colors = useColors();
  const discount = totals.loyaltyDiscount;
  if (!discount) return null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ThemedText type="muted" style={styles.label}>
          Sous-total
        </ThemedText>
        <ThemedText type="muted" style={styles.label}>
          {priceFormatter.format(totals.subtotalTtc)}
        </ThemedText>
      </View>
      <View style={styles.row}>
        <View style={styles.labelGroup}>
          <ThemedText type="muted" style={styles.label}>
            Remise partenaire
          </ThemedText>
          {discount.discountType === 'percentage' ? (
            <Badge tone="success">{`-${percentFormatter.format(discount.discountValue)} %`}</Badge>
          ) : null}
        </View>
        <ThemedText style={[styles.label, styles.amount, { color: colors.success }]}>
          -{priceFormatter.format(totals.discountTtc)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: { fontSize: 13 },
  amount: { fontWeight: '600' },
});
