import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import { formatSlotTime, type AvailabilitySlot } from '@/services/scheduling';
import { Pressable, StyleSheet, View } from 'react-native';

interface SlotGridProps {
  slots: AvailabilitySlot[];
  selectedSlotStart: string | null;
  onSelectSlot: (slot: AvailabilitySlot) => void;
}

export function SlotGrid({ slots, selectedSlotStart, onSelectSlot }: SlotGridProps) {
  const colors = useColors();

  const availableSlots = slots.filter((s) => s.available);

  if (availableSlots.length === 0) {
    return (
      <ThemedText style={[styles.emptyText, { color: colors.mutedForeground }]}>
        Aucun créneau disponible ce jour.
      </ThemedText>
    );
  }

  return (
    <View style={styles.grid}>
      {availableSlots.map((slot) => {
        const isSelected = slot.start === selectedSlotStart;
        return (
          <Pressable
            key={slot.start}
            onPress={() => onSelectSlot(slot)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Créneau ${formatSlotTime(slot.start)}`}
            style={({ pressed }) => [
              styles.slotChip,
              {
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected
                  ? colors.primary
                  : colors.surfaceSubtle,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <ThemedText
              style={[
                styles.slotLabel,
                {
                  color: isSelected ? colors.primaryForeground : colors.foreground,
                },
              ]}>
              {formatSlotTime(slot.start)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 13,
    paddingVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    width: '30.5%',
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
