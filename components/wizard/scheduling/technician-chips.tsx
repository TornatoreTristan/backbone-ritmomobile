import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import type { OrganizationEmployee } from '@/services/organization-employees';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface TechnicianChipsProps {
  employees: OrganizationEmployee[];
  selectedUserIds: string[];
  onToggle: (userId: string) => void;
}

export function TechnicianChips({ employees, selectedUserIds, onToggle }: TechnicianChipsProps) {
  const colors = useColors();

  if (employees.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      accessibilityRole="tablist">
      {employees.map((emp) => {
        const canSelect = emp.userId !== null;
        const selected = canSelect && selectedUserIds.includes(emp.userId!);

        return (
          <Pressable
            key={emp.id}
            onPress={canSelect ? () => onToggle(emp.userId!) : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !canSelect }}
            accessibilityLabel={
              canSelect
                ? emp.fullName
                : `${emp.fullName} — agenda non connecté`
            }
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: selected
                  ? colors.primary
                  : canSelect
                    ? colors.border
                    : colors.border,
                backgroundColor: selected
                  ? colors.primary
                  : canSelect
                    ? colors.surfaceSubtle
                    : colors.muted,
                opacity: pressed && canSelect ? 0.7 : !canSelect ? 0.45 : 1,
              },
            ]}>
            <View style={styles.chipInner}>
              {!canSelect ? (
                <ThemedText
                  style={[styles.noCalIcon, { color: colors.mutedForeground }]}>
                  ⊘
                </ThemedText>
              ) : null}
              <ThemedText
                style={[
                  styles.chipLabel,
                  {
                    color: selected
                      ? colors.primaryForeground
                      : canSelect
                        ? colors.foreground
                        : colors.mutedForeground,
                  },
                ]}
                numberOfLines={1}>
                {emp.fullName}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  noCalIcon: {
    fontSize: 13,
    lineHeight: 18,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 120,
  },
});
