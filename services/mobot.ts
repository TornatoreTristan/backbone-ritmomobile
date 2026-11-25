import { fetch as streamingFetch } from 'expo/fetch';

import { API_URL } from '@/constants/api';
import { ApiError, apiRequest } from '@/services/api';
import { getToken } from '@/services/auth-storage';
import { createSseParser } from '@/services/mobot-sse';

export type MobotRole = 'admin' | 'member' | 'viewer' | 'sales' | 'technician' | 'none';
export type MobotFeedback = 'up' | 'down';
export type MobotToolCallStatus = 'running' | 'success' | 'error' | 'denied';

export type MobotStatus = { agentEnabled: boolean; role: MobotRole; tools: string[] };

export type MobotSource = { title: string; page: number | null; url: string | null };

export type MobotToolCall = {
  id: string;
  name: string;
  status: MobotToolCallStatus;
  resultCount?: number;
  durationMs?: number;
};

export type MobotConversationSummary = { id: string; title: string; lastMessageAt: string };

export type MobotMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: MobotSource[];
  feedback: MobotFeedback | null;
  toolCalls: MobotToolCall[];
  createdAt: string;
};

export type MobotConversation = MobotConversationSummary & { messages: MobotMessage[] };

export type MobotAnswer = {
  sources: MobotSource[];
  toolCalls: MobotToolCall[];
  conversation: MobotConversationSummary;
  messageId: string;
};

export type MobotStreamErrorCode =
  | 'forbidden'
  | 'quota_exceeded'
  | 'conversation_not_found'
  | 'assistant_unavailable'
  | 'network';

export class MobotStreamError extends Error {
  constructor(
    readonly code: MobotStreamErrorCode,
    readonly reason: string | null = null,
    readonly resetAt: string | null = null,
  ) {
    super(code);
    this.name = 'MobotStreamError';
  }
}

export type MobotStreamCallbacks = {
  onToken: (token: string) => void;
  onToolStart: (call: { id: string; name: string }) => void;
  onToolEnd: (call: MobotToolCall) => void;
};

type ApiEnvelope<T> = { success: boolean; data: T };

const basePath = (organizationId: string) => `/api/v1/organizations/${organizationId}/assistant`;

export async function getMobotStatus(organizationId: string): Promise<MobotStatus | null> {
  try {
    const response = await apiRequest<ApiEnvelope<MobotStatus>>(basePath(organizationId));
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 409)) return null;
    throw error;
  }
}

export async function listMobotConversations(
  organizationId: string,
): Promise<MobotConversationSummary[]> {
  const response = await apiRequest<ApiEnvelope<MobotConversationSummary[]>>(
    `${basePath(organizationId)}/conversations`,
  );
  return response.data;
}

export async function getMobotConversation(
  organizationId: string,
  conversationId: string,
): Promise<MobotConversation> {
  const response = await apiRequest<ApiEnvelope<MobotConversation>>(
    `${basePath(organizationId)}/conversations/${conversationId}`,
  );
  return response.data;
}

export async function deleteMobotConversation(
  organizationId: string,
  conversationId: string,
): Promise<void> {
  await apiRequest(`${basePath(organizationId)}/conversations/${conversationId}`, {
    method: 'DELETE',
  });
}

export async function setMobotFeedback(
  organizationId: string,
  messageId: string,
  feedback: MobotFeedback | null,
): Promise<void> {
  await apiRequest(`${basePath(organizationId)}/messages/${messageId}/feedback`, {
    method: 'PUT',
    body: { feedback },
  });
}

function handleStreamEvent(
  event: string,
  data: unknown,
  callbacks: MobotStreamCallbacks,
  result: { answer: MobotAnswer | null; error: MobotStreamError | null },
) {
  if (event === 'token' && typeof data === 'string') callbacks.onToken(data);
  else if (event === 'tool_start') callbacks.onToolStart(data as { id: string; name: string });
  else if (event === 'tool_end') callbacks.onToolEnd(data as MobotToolCall);
  else if (event === 'done') result.answer = data as MobotAnswer;
  else if (event === 'error') {
    const payload = data as { error?: MobotStreamErrorCode; reason?: string; resetAt?: string };
    result.error = new MobotStreamError(
      payload.error ?? 'assistant_unavailable',
      payload.reason ?? null,
      payload.resetAt ?? null,
    );
  }
}

/**
 * Pose une question à Mobot et lit la réponse au fil de l'eau (SSE).
 * Annuler le signal coupe la requête : le serveur arrête alors la réponse.
 */
export async function askMobotStream(
  organizationId: string,
  input: { message: string; conversationId: string },
  callbacks: MobotStreamCallbacks,
  signal?: AbortSignal,
): Promise<MobotAnswer> {
  const token = await getToken();
  const response = await streamingFetch(`${API_URL}${basePath(organizationId)}/ask/stream`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      'Accept-Language': 'fr',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new MobotStreamError(response.status === 403 ? 'forbidden' : 'assistant_unavailable');
  }

  const result: { answer: MobotAnswer | null; error: MobotStreamError | null } = {
    answer: null,
    error: null,
  };
  const parser = createSseParser(({ event, data }) => handleStreamEvent(event, data, callbacks, result));
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true }));
  }
  parser.flush();

  if (result.error) throw result.error;
  if (!result.answer) throw new MobotStreamError('network');
  return result.answer;
}
