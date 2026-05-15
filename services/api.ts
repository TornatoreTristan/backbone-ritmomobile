import { API_URL } from '@/constants/api';
import { getToken } from '@/services/auth-storage';

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: (() => void) | null): void {
  onUnauthorized = cb;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  authenticated?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
};

async function buildHeaders(
  authenticated: boolean,
  hasJsonBody: boolean,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (hasJsonBody) {
    headers['Content-Type'] = 'application/json';
  }
  if (authenticated) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function parseResponse<T>(response: Response, authenticated: boolean): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      onUnauthorized?.();
    }
    const payload =
      data && typeof data === 'object'
        ? (data as { error?: string; message?: string })
        : null;
    const message =
      payload?.error ?? payload?.message ?? `API error: ${response.status}`;
    throw new ApiError(response.status, message, data);
  }
  return data as T;
}

function combineSignals(timeoutMs: number, external?: AbortSignal): {
  signal: AbortSignal;
  clear: () => void;
} {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', onAbort);
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timeoutId);
      if (external) external.removeEventListener('abort', onAbort);
    },
  };
}

async function performFetch<T>(
  endpoint: string,
  init: RequestInit,
  authenticated: boolean,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<T> {
  const { signal, clear } = combineSignals(timeoutMs, externalSignal);
  try {
    const response = await fetch(`${API_URL}${endpoint}`, { ...init, signal });
    return await parseResponse<T>(response, authenticated);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (externalSignal?.aborted) {
        throw err;
      }
      throw new ApiError(0, 'Délai de connexion dépassé', null);
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, err instanceof Error ? err.message : 'Erreur réseau', null);
  } finally {
    clear();
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    authenticated = true,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;
  const headers = await buildHeaders(authenticated, body !== undefined);
  return performFetch<T>(
    endpoint,
    {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    authenticated,
    timeoutMs,
    signal,
  );
}

export async function apiUpload<T>(
  endpoint: string,
  formData: FormData,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const headers = await buildHeaders(true, false);
  return performFetch<T>(
    endpoint,
    {
      method: 'POST',
      headers,
      body: formData,
    },
    true,
    timeoutMs,
    signal,
  );
}
