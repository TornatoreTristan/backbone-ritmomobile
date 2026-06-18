import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import { formatDayLabel, formatSlotTime } from '@/services/scheduling';
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

  // Extract the date part from ISO string for formatDayLabel
  const datePart = rdvDate.substring(0, 10);
  const timePart = formatSlotTime(rdvDate);
  const dayLabel = formatDayLabel(datePart);

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.primary + '12', borderColor: colors.primary },
      ]}>
      <ThemedText style={[styles.summaryText, { color: colors.foreground }]}>
        RDV : {dayLabel} à {timePart} — {duration} min
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
