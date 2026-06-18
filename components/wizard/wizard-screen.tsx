import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StyleSheet, type ViewStyle } from 'react-native';

export interface WizardScreenProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
}

export function WizardScreen({ title, subtitle, children, contentStyle }: WizardScreenProps) {
  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, centeredContent, contentStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={24}
        showsVerticalScrollIndicator={false}>
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
        {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
        {children}
      </KeyboardAwareScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 16,
  },
  title: { marginBottom: 4 },
  subtitle: { fontSize: 14, opacity: 0.6, marginBottom: 4 },
});
