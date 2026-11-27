import { ApiError } from '@/services/api';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

type ResourceState<T> = {
  key: string | null;
  data: T | null;
  error: string | null;
  refreshFailed: boolean;
  isLoading: boolean;
};

/**
 * Message d'erreur de chargement : un 403 n'est pas une panne réseau, l'utilisateur
 * ne doit pas être invité à « réessayer » indéfiniment.
 */
export function describeLoadError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.status === 403) {
    return "Votre profil n'a pas accès à cette section.";
  }
  return fallback;
}

/**
 * Chargement d'une ressource d'écran, rechargée à chaque retour sur l'écran.
 *
 * - `key` identifie ce qui est affiché (organisation, dossier…). Quand elle change,
 *   les données de l'ancienne clé ne sont plus exposées. `null` = rien à charger.
 * - Tant que des données existent pour la clé, les rechargements sont silencieux :
 *   pas de spinner plein écran, et un échec conserve les données (`refreshFailed`).
 * - Une réponse arrivée après une requête plus récente est ignorée.
 */
export function useScreenResource<T>(
  key: string | null,
  fetcher: (key: string) => Promise<T>,
  /** Message de repli, ou fonction qui traduit l'erreur (403/404 propres à l'écran). */
  fallbackError: string | ((err: unknown) => string),
) {
  const [state, setState] = useState<ResourceState<T>>({
    key,
    data: null,
    error: null,
    refreshFailed: false,
    isLoading: key !== null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestRef = useRef(0);
  const keyRef = useRef(key);
  const fetcherRef = useRef(fetcher);
  const fallbackRef = useRef(fallbackError);

  useEffect(() => {
    keyRef.current = key;
    fetcherRef.current = fetcher;
    fallbackRef.current = fallbackError;
  });

  const reload = useCallback(async () => {
    // `reload` capturé par un rendu antérieur (ex. fin d'un envoi de fichier lancé
    // sur le dossier précédent) : il ne doit ni annuler la requête en cours pour
    // la clé actuelle, ni réécrire l'état avec l'ancienne clé.
    if (key !== keyRef.current) return;
    const requestId = ++requestRef.current;
    if (key === null) {
      setIsRefreshing(false);
      return;
    }
    setState((prev) =>
      prev.key === key && prev.data !== null
        ? prev
        : { key, data: null, error: null, refreshFailed: false, isLoading: true },
    );
    try {
      const data = await fetcherRef.current(key);
      if (requestId !== requestRef.current) return;
      setState({ key, data, error: null, refreshFailed: false, isLoading: false });
    } catch (err) {
      if (requestId !== requestRef.current) return;
      const fallback = fallbackRef.current;
      const message =
        typeof fallback === 'function' ? fallback(err) : describeLoadError(err, fallback);
      setState((prev) =>
        prev.key === key && prev.data !== null
          ? { ...prev, refreshFailed: true }
          : { key, data: null, error: message, refreshFailed: false, isLoading: false },
      );
    } finally {
      if (requestId === requestRef.current) setIsRefreshing(false);
    }
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  function refresh() {
    setIsRefreshing(true);
    reload();
  }

  // L'état d'une autre clé (dossier ou organisation précédents) n'est jamais exposé.
  const isCurrent = state.key === key;

  return {
    data: isCurrent ? state.data : null,
    error: isCurrent ? state.error : null,
    refreshFailed: isCurrent && state.refreshFailed,
    isLoading: key !== null && (!isCurrent || state.isLoading),
    isRefreshing,
    reload,
    refresh,
  };
}
