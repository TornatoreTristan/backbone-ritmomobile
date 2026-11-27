import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import { formatRdvDateTime } from '@/services/scheduling';
import { StyleSheet, View } from 'react-native';

interface RdvSummaryBarProps {
  rdvDate: string | null;
  durationMinutes: string;
}

/**
 * Displays a one-line recap of the planned RDV, or a placeholder when no date
 * is selected. The date may come from the slot picker or from manual input.
 */
export function RdvSummaryBar({ rdvDate, durationMinutes }: RdvSummaryBarProps) {
  const colors = useColors();

  const duration = durationMinutes.trim() !== '' ? durationMinutes.trim() : '60';

  if (!rdvDate) {
    return (
      <View
        style={[
          styles.bar,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}>
        <ThemedText style={[styles.placeholderText, { color: colors.mutedForeground }]}>
          RDV non planifié
        </ThemedText>
      </View>
    );
  }

  // Jour et heure lus dans le même fuseau (Paris) : découper la partie date de
  // l'ISO donnait le jour UTC, faux d'un jour pour un RDV proche de minuit.
  const label = formatRdvDateTime(rdvDate) ?? rdvDate;

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.primary + '12', borderColor: colors.primary },
      ]}>
      <ThemedText style={[styles.summaryText, { color: colors.foreground }]}>
        RDV : {label} — {duration} min
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
