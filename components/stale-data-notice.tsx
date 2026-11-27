import { ThemedText } from '@/components/themed-text';
import { StyleSheet } from 'react-native';

/**
 * Affiché au-dessus d'une liste quand le dernier rafraîchissement a échoué :
 * les données restent visibles, mais l'utilisateur sait qu'elles peuvent dater.
 */
export function StaleDataNotice({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <ThemedText
      type="caption"
      tone="destructive"
      style={styles.notice}
      accessibilityLiveRegion="polite">
      Actualisation impossible. Les données affichées ne sont peut-être pas à jour.
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  notice: { textAlign: 'center', paddingHorizontal: 4 },
});
