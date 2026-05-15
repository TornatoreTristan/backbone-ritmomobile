import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WizardHeaderProps {
  step: number;
  totalSteps: number;
  onClose: () => void;
}

export function WizardHeader({ step, totalSteps, onClose }: WizardHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const progress = step / totalSteps;

  return (
    <ThemedView
      style={[
        styles.container,
        centeredContent,
        {
          paddingTop: insets.top + 8,
          borderBottomColor: colors.border,
        },
      ]}>
      <View style={styles.topRow}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fermer le wizard"
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: colors.muted },
            pressed && styles.closeButtonPressed,
          ]}>
          <ThemedText style={styles.closeIcon}>✕</ThemedText>
        </Pressable>

        <ThemedText type="defaultSemiBold" style={styles.title}>
          Nouveau devis
        </ThemedText>

        <ThemedText type="caption" tone="mutedForeground" style={styles.stepIndicator}>
          {step}/{totalSteps}
        </ThemedText>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: colors.foreground, width: `${progress * 100}%` },
          ]}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: { opacity: 0.65 },
  closeIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
  },
  stepIndicator: {
    width: 32,
    textAlign: 'right',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
