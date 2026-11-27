import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import {
  deleteMobotConversation,
  listMobotConversations,
  type MobotConversationSummary,
} from '@/services/mobot';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

type ConversationHistoryProps = {
  organizationId: string;
  activeConversationId: string;
  onOpen: (conversationId: string) => void;
  onDeleted: (conversationId: string) => void;
};

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function ConversationHistory({
  organizationId,
  activeConversationId,
  onOpen,
  onDeleted,
}: ConversationHistoryProps) {
  const colors = useColors();
  const [conversations, setConversations] = useState<MobotConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMobotConversations(organizationId)
      .then(setConversations)
      .catch(() => setError("Impossible de charger l'historique."));
  }, [organizationId]);

  async function remove(conversationId: string) {
    const previous = conversations;
    setConversations((current) => current?.filter((item) => item.id !== conversationId) ?? null);
    try {
      await deleteMobotConversation(organizationId, conversationId);
      onDeleted(conversationId);
    } catch {
      // On rétablit la liste : l'erreur ne doit pas la remplacer.
      setConversations(previous);
      Alert.alert('Suppression impossible', 'Réessayez dans un instant.');
    }
  }

  function confirmRemove(conversation: MobotConversationSummary) {
    Alert.alert('Supprimer cette conversation ?', conversation.title, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => remove(conversation.id) },
    ]);
  }

  if (error) return <ThemedText tone="destructive" style={styles.message}>{error}</ThemedText>;
  if (!conversations) return <ActivityIndicator style={styles.message} color={colors.foreground} />;
  if (conversations.length === 0) {
    return (
      <ThemedText type="muted" style={styles.message}>
        Aucune conversation pour le moment.
      </ThemedText>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {conversations.map((conversation) => (
        <View
          key={conversation.id}
          style={[
            styles.row,
            {
              borderColor: colors.border,
              backgroundColor: conversation.id === activeConversationId ? colors.muted : colors.card,
            },
          ]}>
          <Pressable style={styles.rowMain} onPress={() => onOpen(conversation.id)} accessibilityRole="button">
            <ThemedText numberOfLines={1} style={styles.title}>
              {conversation.title}
            </ThemedText>
            <ThemedText type="caption">{formatDate(conversation.lastMessageAt)}</ThemedText>
          </Pressable>
          <Pressable
            hitSlop={10}
            onPress={() => confirmRemove(conversation)}
            accessibilityRole="button"
            accessibilityLabel="Supprimer la conversation">
            <IconSymbol size={18} name="trash" color={colors.mutedForeground} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, padding: 16 },
  message: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowMain: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '500' },
});
