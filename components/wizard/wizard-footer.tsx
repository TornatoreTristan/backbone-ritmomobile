import { Button } from '@/components/ui/button';
import { centeredContent } from '@/constants/layout';
import { useColors } from '@/hooks/use-theme-color';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WizardFooterProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  showBack?: boolean;
}

export function WizardFooter({
  onBack,
  onNext,
  nextLabel = 'Suivant',
  nextDisabled = false,
  loading = false,
  showBack = true,
}: WizardFooterProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const showBackButton = showBack && !!onBack;

  return (
    <View
      style={[
        styles.container,
        centeredContent,
        {
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          paddingBottom: insets.bottom + 12,
        },
      ]}>
      {showBackButton ? (
        <Button
          variant="outline"
          onPress={onBack}
          accessibilityLabel="Étape précédente"
          style={styles.back}>
          Précédent
        </Button>
      ) : null}
      <Button
        onPress={onNext}
        disabled={nextDisabled}
        loading={loading}
        accessibilityLabel={nextLabel}
        style={showBackButton ? styles.next : styles.nextFull}>
        {nextLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  back: { flex: 1 },
  next: { flex: 2 },
  nextFull: { flex: 1 },
});
