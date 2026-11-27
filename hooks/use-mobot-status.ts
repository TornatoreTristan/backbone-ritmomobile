import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { getMobotStatus, type MobotStatus } from '@/services/mobot';

// Clé = utilisateur + organisation : le statut dépend du rôle de l'utilisateur,
// il ne doit pas être réutilisé pour le compte suivant sur le même appareil.
const statusCache = new Map<string, MobotStatus | null>();

/**
 * Mobot n'est proposé que si l'organisation courante y a accès (module actif,
 * utilisateur membre). `null` = pas de Mobot, `undefined` = en cours de chargement.
 * `enabled = false` évite l'appel pour les profils qui n'ont jamais Mobot.
 */
export function useMobotStatus(enabled = true): MobotStatus | null | undefined {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id ?? null;
  const cacheKey = enabled && user && organizationId ? `${user.id}:${organizationId}` : null;
  const [status, setStatus] = useState<MobotStatus | null | undefined>(() =>
    cacheKey ? statusCache.get(cacheKey) : null,
  );

  useEffect(() => {
    if (!cacheKey || !organizationId) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    setStatus(statusCache.get(cacheKey));
    getMobotStatus(organizationId)
      .then((result) => {
        statusCache.set(cacheKey, result);
        if (!cancelled) setStatus(result);
      })
      .catch(() => {
        if (!cancelled) setStatus(statusCache.get(cacheKey) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [cacheKey, organizationId]);

  return status;
}
