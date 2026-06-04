import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import { formatDayLabel } from '@/services/scheduling';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface DayPickerProps {
  days: string[];
  availableDays: Set<string>;
  selectedDay: string | null;
  loading: boolean;
  onSelectDay: (day: string) => void;
}

export function DayPicker({
  days,
  availableDays,
  selectedDay,
  loading,
  onSelectDay,
}: DayPickerProps) {
  const colors = useColors();

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.primary} />
        <ThemedText style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Chargement des disponibilités…
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      accessibilityRole="tablist">
      {days.map((day) => {
        const hasSlots = availableDays.has(day);
        const isSelected = selectedDay === day;

        return (
          <Pressable
            key={day}
            onPress={hasSlots ? () => onSelectDay(day) : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected, disabled: !hasSlots }}
            accessibilityLabel={`${formatDayLabel(day)}${hasSlots ? ', créneaux disponibles' : ', aucun créneau'}`}
            style={({ pressed }) => [
              styles.dayChip,
              {
                borderColor: isSelected
                  ? colors.primary
                  : hasSlots
                    ? colors.border
                    : colors.border,
                backgroundColor: isSelected
                  ? colors.primary
                  : hasSlots
                    ? colors.surfaceSubtle
                    : colors.muted,
                opacity: pressed && hasSlots ? 0.7 : 1,
              },
            ]}>
            <ThemedText
              style={[
                styles.dayLabel,
                {
                  color: isSelected
                    ? colors.primaryForeground
                    : hasSlots
                      ? colors.foreground
                      : colors.mutedForeground,
                },
              ]}
              numberOfLines={1}>
              {formatDayLabel(day)}
            </ThemedText>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: isSelected
                    ? colors.primaryForeground
                    : hasSlots
                      ? colors.success
                      : colors.border,
                  opacity: isSelected ? 0.6 : 1,
                },
              ]}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  dayChip: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 5,
    minWidth: 64,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
