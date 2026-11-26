import { MarkdownText } from '@/components/mobot/markdown-text';
import { ToolCallList } from '@/components/mobot/tool-call-list';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import type { MobotFeedback, MobotSource, MobotToolCall } from '@/services/mobot';
import { isTrustedMobotLink } from '@/services/mobot-markdown';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

export type ChatEntry = {
  key: string;
  role: 'user' | 'assistant';
  content: string;
  messageId: string | null;
  sources: MobotSource[];
  toolCalls: MobotToolCall[];
  feedback: MobotFeedback | null;
  isStreaming: boolean;
  errorMessage: string | null;
};

type ChatMessageProps = {
  entry: ChatEntry;
  onFeedback: (entry: ChatEntry, feedback: MobotFeedback | null) => void;
};

function SourceList({ sources }: { sources: MobotSource[] }) {
  const colors = useColors();
  if (sources.length === 0) return null;
  return (
    <View style={styles.sources}>
      <ThemedText type="label" tone="mutedForeground">
        SOURCES
      </ThemedText>
      {sources.map((source, index) => {
        const label = source.page ? `${source.title} — p. ${source.page}` : source.title;
        const url = source.url && isTrustedMobotLink(source.url) ? source.url : null;
        return (
          <ThemedText
            key={`${source.title}-${index}`}
            type="caption"
            style={url ? [styles.sourceLink, { color: colors.primary }] : undefined}
            onPress={url ? () => Linking.openURL(url) : undefined}>
            {label}
          </ThemedText>
        );
      })}
    </View>
  );
}

function FeedbackButtons({ entry, onFeedback }: ChatMessageProps) {
  const colors = useColors();
  const toggle = (value: MobotFeedback) => onFeedback(entry, entry.feedback === value ? null : value);

  return (
    <View style={styles.feedback}>
      <Pressable
        hitSlop={8}
        onPress={() => toggle('up')}
        accessibilityRole="button"
        accessibilityLabel="Réponse utile">
        <IconSymbol
          size={18}
          name={entry.feedback === 'up' ? 'hand.thumbsup.fill' : 'hand.thumbsup'}
          color={entry.feedback === 'up' ? colors.primary : colors.mutedForeground}
        />
      </Pressable>
      <Pressable
        hitSlop={8}
        onPress={() => toggle('down')}
        accessibilityRole="button"
        accessibilityLabel="Réponse à revoir">
        <IconSymbol
          size={18}
          name={entry.feedback === 'down' ? 'hand.thumbsdown.fill' : 'hand.thumbsdown'}
          color={entry.feedback === 'down' ? colors.destructive : colors.mutedForeground}
        />
      </Pressable>
    </View>
  );
}

export function ChatMessage({ entry, onFeedback }: ChatMessageProps) {
  const colors = useColors();

  if (entry.role === 'user') {
    return (
      <View style={[styles.userBubble, { backgroundColor: colors.primary }]}>
        <ThemedText style={[styles.userText, { color: colors.primaryForeground }]}>
          {entry.content}
        </ThemedText>
      </View>
    );
  }

  const showFeedback = !entry.isStreaming && entry.messageId !== null && !entry.errorMessage;

  return (
    <View style={[styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ToolCallList calls={entry.toolCalls} />
      {entry.content ? (
        <MarkdownText markdown={entry.isStreaming ? `${entry.content} ▍` : entry.content} />
      ) : entry.isStreaming && entry.toolCalls.length === 0 ? (
        <ThemedText type="muted">Mobot réfléchit…</ThemedText>
      ) : null}
      {entry.errorMessage ? (
        <ThemedText tone="destructive" style={styles.error}>
          {entry.errorMessage}
        </ThemedText>
      ) : null}
      <SourceList sources={entry.sources} />
      {showFeedback ? <FeedbackButtons entry={entry} onFeedback={onFeedback} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    borderRadius: Radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: { fontSize: 15, lineHeight: 21 },
  assistantBubble: {
    alignSelf: 'stretch',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  error: { marginTop: 4 },
  sources: { gap: 4, marginTop: 8 },
  sourceLink: { textDecorationLine: 'underline' },
  feedback: { flexDirection: 'row', gap: 18, marginTop: 8 },
});
