import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/hooks/use-theme-color';
import { type InlineSegment, parseMarkdownBlocks } from '@/services/mobot-markdown';
import { Linking, StyleSheet, View } from 'react-native';

function InlineText({ segments }: { segments: InlineSegment[] }) {
  const colors = useColors();
  return segments.map((segment, index) =>
    segment.kind === 'link' ? (
      <ThemedText
        key={index}
        style={[styles.link, { color: colors.primary }]}
        onPress={() => Linking.openURL(segment.url)}
        accessibilityRole="link">
        {segment.text}
      </ThemedText>
    ) : (
      <ThemedText key={index} style={segment.bold ? styles.bold : undefined}>
        {segment.text}
      </ThemedText>
    ),
  );
}

export function MarkdownText({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownBlocks(markdown);

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <ThemedText key={index} style={[styles.text, styles.heading]}>
              <InlineText segments={block.segments} />
            </ThemedText>
          );
        }
        if (block.kind === 'bullet' || block.kind === 'numbered') {
          return (
            <View key={index} style={styles.listItem}>
              <ThemedText style={[styles.text, styles.marker]}>
                {block.kind === 'bullet' ? '•' : `${block.index}.`}
              </ThemedText>
              <ThemedText style={[styles.text, styles.listText]}>
                <InlineText segments={block.segments} />
              </ThemedText>
            </View>
          );
        }
        return (
          <ThemedText key={index} style={styles.text}>
            <InlineText segments={block.segments} />
          </ThemedText>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  text: { fontSize: 15, lineHeight: 22 },
  heading: { fontWeight: '600' },
  bold: { fontWeight: '600' },
  link: { textDecorationLine: 'underline', fontWeight: '500' },
  listItem: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
  marker: { minWidth: 14 },
  listText: { flex: 1 },
});
