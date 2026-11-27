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
// Une photo ou un PDF de plusieurs Mo en 4G dépasse largement 30 s.
const UPLOAD_TIMEOUT_MS = 120_000;

/** Message affichable quand le serveur ne fournit pas de texte exploitable. */
function fallbackMessage(status: number): string {
  if (status === 401) return 'Votre session a expiré. Reconnectez-vous.';
  if (status === 403) return "Vous n'êtes pas autorisé à effectuer cette action.";
  if (status === 404) return 'Élément introuvable.';
  if (status === 422) return 'Certaines informations sont invalides.';
  if (status === 429) return 'Trop de requêtes. Réessayez dans un instant.';
  if (status >= 500) return 'Le serveur rencontre un problème. Réessayez dans un instant.';
  return `Une erreur est survenue (${status}).`;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: (() => void) | null): void {
  onUnauthorized = cb;
}

/** Pour les appels qui ne passent pas par `apiRequest` (flux SSE de Mobot). */
export function notifyUnauthorized(): void {
  onUnauthorized?.();
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
  const hasBody =
    response.status !== 204 &&
    response.status !== 205 &&
    response.headers.get('content-length') !== '0';

  let data: unknown = null;
  if (hasBody) {
    const text = await response.text();
    if (text.length > 0) {
      try {
        data = JSON.parse(text);
      } catch {
        // Body présent mais non-JSON (ex: page d'erreur HTML) — on garde le texte brut
        data = text;
      }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      onUnauthorized?.();
    }
    // `error` peut être un objet (erreurs de validation VineJS) : on ne retient
    // que des chaînes, sinon le message deviendrait « [object Object] ».
    const payload =
      data && typeof data === 'object'
        ? (data as { error?: unknown; message?: unknown })
        : null;
    const message =
      firstString(payload?.error, payload?.message) ?? fallbackMessage(response.status);
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
    const isAbort =
      err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
    if (isAbort) {
      if (externalSignal?.aborted) {
        throw err;
      }
      throw new ApiError(0, 'Délai de connexion dépassé', null);
    }
    if (err instanceof ApiError) throw err;
    // Le message natif de fetch est en anglais (« Network request failed »).
    throw new ApiError(0, 'Connexion impossible. Vérifiez votre réseau et réessayez.', null);
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
  const { signal, timeoutMs = UPLOAD_TIMEOUT_MS } = options;
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
