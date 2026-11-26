import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

const MAX_QUESTION_LENGTH = 2000;

type ChatComposerProps = {
  isStreaming: boolean;
  onSend: (question: string) => void;
  onStop: () => void;
};

export function ChatComposer({ isStreaming, onSend, onStop }: ChatComposerProps) {
  const colors = useColors();
  const [question, setQuestion] = useState('');
  const canSend = question.trim().length >= 2 && !isStreaming;

  const send = () => {
    if (!canSend) return;
    onSend(question.trim());
    setQuestion('');
  };

  return (
    <View style={[styles.container, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
      <TextInput
        value={question}
        onChangeText={setQuestion}
        placeholder="Demandez à Mobot…"
        placeholderTextColor={colors.mutedForeground}
        multiline
        maxLength={MAX_QUESTION_LENGTH}
        style={[
          styles.input,
          { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
        ]}
      />
      {isStreaming ? (
        <Pressable
          onPress={onStop}
          style={[styles.button, { backgroundColor: colors.foreground }]}
          accessibilityRole="button"
          accessibilityLabel="Arrêter la réponse">
          <IconSymbol size={16} name="stop.fill" color={colors.background} />
        </Pressable>
      ) : (
        <Pressable
          onPress={send}
          disabled={!canSend}
          style={[styles.button, { backgroundColor: canSend ? colors.primary : colors.muted }]}
          accessibilityRole="button"
          accessibilityLabel="Envoyer la question">
          <IconSymbol
            size={18}
            name="arrow.up"
            color={canSend ? colors.primaryForeground : colors.mutedForeground}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
