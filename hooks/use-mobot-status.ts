import { useEffect, useState } from 'react';

import { useOrganization } from '@/contexts/organization-context';
import { getMobotStatus, type MobotStatus } from '@/services/mobot';

const statusCache = new Map<string, MobotStatus | null>();

/**
 * Mobot n'est proposé que si l'organisation courante y a accès (module actif,
 * utilisateur membre). `null` = pas de Mobot, `undefined` = en cours de chargement.
 */
export function useMobotStatus(): MobotStatus | null | undefined {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id ?? null;
  const [status, setStatus] = useState<MobotStatus | null | undefined>(() =>
    organizationId ? statusCache.get(organizationId) : null,
  );

  useEffect(() => {
    if (!organizationId) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    setStatus(statusCache.get(organizationId));
    getMobotStatus(organizationId)
      .then((result) => {
        statusCache.set(organizationId, result);
        if (!cancelled) setStatus(result);
      })
      .catch(() => {
        if (!cancelled) setStatus(statusCache.get(organizationId) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return status;
}
