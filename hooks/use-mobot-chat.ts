import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';

import type { ChatEntry } from '@/components/mobot/chat-message';
import {
  askMobotStream,
  getMobotConversation,
  type MobotFeedback,
  type MobotMessage,
  type MobotToolCall,
  setMobotFeedback,
} from '@/services/mobot';
import { mobotErrorMessage } from '@/services/mobot-errors';

function fromStoredMessage(message: MobotMessage): ChatEntry {
  return {
    key: message.id,
    role: message.role,
    content: message.content,
    messageId: message.id,
    sources: message.sources,
    toolCalls: message.toolCalls ?? [],
    feedback: message.feedback,
    isStreaming: false,
    errorMessage: null,
  };
}

function newEntry(role: ChatEntry['role'], content: string): ChatEntry {
  return {
    key: randomUUID(),
    role,
    content,
    messageId: null,
    sources: [],
    toolCalls: [],
    feedback: null,
    isStreaming: role === 'assistant',
    errorMessage: null,
  };
}

function upsertToolCall(calls: MobotToolCall[], call: MobotToolCall): MobotToolCall[] {
  const exists = calls.some((existing) => existing.id === call.id);
  return exists ? calls.map((existing) => (existing.id === call.id ? call : existing)) : [...calls, call];
}

export function useMobotChat(organizationId: string) {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [conversationId, setConversationId] = useState<string>(() => randomUUID());
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const updateEntry = (key: string, update: (entry: ChatEntry) => ChatEntry) =>
    setEntries((current) => current.map((entry) => (entry.key === key ? update(entry) : entry)));

  async function ask(question: string) {
    const answer = newEntry('assistant', '');
    setEntries((current) => [...current, newEntry('user', question), answer]);
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await askMobotStream(
        organizationId,
        { message: question, conversationId },
        {
          onToken: (token) => updateEntry(answer.key, (entry) => ({ ...entry, content: entry.content + token })),
          onToolStart: (call) =>
            updateEntry(answer.key, (entry) => ({
              ...entry,
              toolCalls: upsertToolCall(entry.toolCalls, { ...call, status: 'running' }),
            })),
          onToolEnd: (call) =>
            updateEntry(answer.key, (entry) => ({ ...entry, toolCalls: upsertToolCall(entry.toolCalls, call) })),
        },
        controller.signal,
      );
      updateEntry(answer.key, (entry) => ({
        ...entry,
        isStreaming: false,
        messageId: result.messageId,
        sources: result.sources,
        toolCalls: result.toolCalls.length > 0 ? result.toolCalls : entry.toolCalls,
      }));
    } catch (error) {
      const stopped = controller.signal.aborted;
      updateEntry(answer.key, (entry) => ({
        ...entry,
        isStreaming: false,
        errorMessage: stopped ? 'Réponse interrompue.' : mobotErrorMessage(error),
      }));
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function startNewConversation() {
    stop();
    setEntries([]);
    setConversationId(randomUUID());
  }

  async function openConversation(id: string) {
    stop();
    const conversation = await getMobotConversation(organizationId, id);
    setConversationId(conversation.id);
    setEntries(conversation.messages.map(fromStoredMessage));
  }

  async function rate(entry: ChatEntry, feedback: MobotFeedback | null) {
    if (!entry.messageId) return;
    const previous = entry.feedback;
    updateEntry(entry.key, (current) => ({ ...current, feedback }));
    try {
      await setMobotFeedback(organizationId, entry.messageId, feedback);
    } catch {
      updateEntry(entry.key, (current) => ({ ...current, feedback: previous }));
    }
  }

  return { entries, conversationId, isStreaming, ask, stop, startNewConversation, openConversation, rate };
}
