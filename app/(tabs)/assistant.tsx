import { ChatComposer } from '@/components/mobot/chat-composer';
import { ChatMessage } from '@/components/mobot/chat-message';
import { ConversationHistory } from '@/components/mobot/conversation-history';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { centeredContent } from '@/constants/layout';
import { Radius } from '@/constants/theme';
import { useOrganization } from '@/contexts/organization-context';
import { useMobotChat } from '@/hooks/use-mobot-chat';
import { useMobotStatus } from '@/hooks/use-mobot-status';
import { useColors } from '@/hooks/use-theme-color';
import type { MobotRole } from '@/services/mobot';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

const EXAMPLES_BY_ROLE: Record<'office' | 'sales' | 'technician', string[]> = {
  office: [
    'Quel est notre CA ce mois-ci ?',
    'Quels dossiers ont une intervention cette semaine ?',
    'Quelles factures sont impayées ?',
    'Résume le dernier email du dossier Dupont',
  ],
  sales: [
    'Quel est notre CA ce mois-ci ?',
    'Quels sont les leads arrivés cette semaine ?',
    'Où en est le dossier Dupont ?',
  ],
  technician: [
    'Quelles sont mes interventions demain ?',
    'Quelle est la durée de validité d’un DPE ?',
  ],
};

function examplesFor(role: MobotRole): string[] {
  if (role === 'technician') return EXAMPLES_BY_ROLE.technician;
  if (role === 'sales') return EXAMPLES_BY_ROLE.sales;
  return EXAMPLES_BY_ROLE.office;
}

export default function AssistantScreen() {
  const status = useMobotStatus();
  const { currentOrganization } = useOrganization();
  const colors = useColors();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {status && currentOrganization ? (
          <MobotChat organizationId={currentOrganization.id} role={status.role} />
        ) : (
          <>
            <ScreenHeader title="Mobot" />
            <View style={styles.center}>
              {status === undefined ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <ThemedText type="muted" style={styles.centerText}>
                  Mobot n’est pas disponible pour cette organisation.
                </ThemedText>
              )}
            </View>
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function HeaderActions(props: { onNew: () => void; onHistory: () => void; isHistoryOpen: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.headerActions}>
      <Pressable
        hitSlop={8}
        onPress={props.onHistory}
        accessibilityRole="button"
        accessibilityLabel="Historique des conversations">
        <IconSymbol
          size={22}
          name="clock.arrow.circlepath"
          color={props.isHistoryOpen ? colors.primary : colors.foreground}
        />
      </Pressable>
      <Pressable hitSlop={8} onPress={props.onNew} accessibilityRole="button" accessibilityLabel="Nouvelle conversation">
        <IconSymbol size={22} name="square.and.pencil" color={colors.foreground} />
      </Pressable>
    </View>
  );
}

function EmptyState({ role, onPick }: { role: MobotRole; onPick: (question: string) => void }) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <IconSymbol size={36} name="sparkles" color={colors.primary} />
      <ThemedText type="h3" style={styles.centerText}>
        Bonjour, je suis Mobot
      </ThemedText>
      <ThemedText type="muted" style={styles.centerText}>
        Je retrouve vos dossiers, lis les notes, emails et documents, et donne vos chiffres. Je réponds aussi aux
        questions techniques.
      </ThemedText>
      <View style={styles.examples}>
        {examplesFor(role).map((example) => (
          <Pressable
            key={example}
            onPress={() => onPick(example)}
            style={[styles.example, { borderColor: colors.border, backgroundColor: colors.card }]}
            accessibilityRole="button">
            <ThemedText style={styles.exampleText}>{example}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MobotChat({ organizationId, role }: { organizationId: string; role: MobotRole }) {
  const chat = useMobotChat(organizationId);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const openConversation = async (conversationId: string) => {
    setIsHistoryOpen(false);
    await chat.openConversation(conversationId).catch(() => chat.startNewConversation());
  };

  const header = (
    <ScreenHeader
      title="Mobot"
      trailing={
        <HeaderActions
          isHistoryOpen={isHistoryOpen}
          onHistory={() => setIsHistoryOpen((open) => !open)}
          onNew={() => {
            setIsHistoryOpen(false);
            chat.startNewConversation();
          }}
        />
      }
    />
  );

  if (isHistoryOpen) {
    return (
      <View style={styles.flex}>
        {header}
        <ConversationHistory
          organizationId={organizationId}
          activeConversationId={chat.conversationId}
          onOpen={openConversation}
          onDeleted={(deletedId) => {
            if (deletedId === chat.conversationId) chat.startNewConversation();
          }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      {header}
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.messages, centeredContent]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {chat.entries.length === 0 ? (
          <EmptyState role={role} onPick={chat.ask} />
        ) : (
          chat.entries.map((entry) => <ChatMessage key={entry.key} entry={entry} onFeedback={chat.rate} />)
        )}
      </ScrollView>
      <View style={centeredContent}>
        <ChatComposer isStreaming={chat.isStreaming} onSend={chat.ask} onStop={chat.stop} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { textAlign: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  messages: { gap: 12, padding: 16, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 24 },
  examples: { alignSelf: 'stretch', gap: 8, marginTop: 8 },
  example: { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 12 },
  exampleText: { fontSize: 15 },
});
