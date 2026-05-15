import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

export interface WizardScreenProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
}

export function WizardScreen({
  title,
  subtitle,
  children,
  contentStyle,
  keyboardAvoiding = true,
}: WizardScreenProps) {
  const Wrapper = keyboardAvoiding ? KeyboardAvoidingView : View;
  const wrapperProps = keyboardAvoiding
    ? { behavior: (Platform.OS === 'ios' ? 'padding' : 'height') as 'padding' | 'height' }
    : {};

  return (
    <ThemedView style={styles.container}>
      <Wrapper style={styles.flex} {...wrapperProps}>
        <ScrollView
          contentContainerStyle={[styles.content, centeredContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
          {children}
        </ScrollView>
      </Wrapper>
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
