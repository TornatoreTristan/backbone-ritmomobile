import { useAuth } from '@/contexts/auth-context';
import { getMyOrganizations, type Organization } from '@/services/organizations';
import {
  clearCurrentOrgId,
  getCurrentOrgId,
  saveCurrentOrgId,
} from '@/services/organization-storage';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

type OrganizationContextType = {
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  error: string | null;
  switchOrganization: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextType>({
  organizations: [],
  currentOrganization: null,
  isLoading: false,
  error: null,
  switchOrganization: async () => {},
  refresh: async () => {},
});

export function useOrganization() {
  return useContext(OrganizationContext);
}

export function OrganizationProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setError(null);
      return;
    }
    loadOrganizations();
  }, [user]);

  async function loadOrganizations() {
    setIsLoading(true);
    setError(null);
    try {
      const [orgs, storedId] = await Promise.all([getMyOrganizations(), getCurrentOrgId()]);
      setOrganizations(orgs);

      if (orgs.length === 0) {
        setCurrentOrganization(null);
        return;
      }

      const stored = storedId ? orgs.find((o) => o.id === storedId) ?? null : null;
      const resolved = stored ?? orgs[0];
      setCurrentOrganization(resolved);

      if (!stored) {
        await saveCurrentOrgId(resolved.id);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors du chargement des organisations';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function switchOrganization(id: string) {
    const target = organizations.find((o) => o.id === id);
    if (!target) return;
    await saveCurrentOrgId(id);
    setCurrentOrganization(target);
  }

  async function refresh() {
    await loadOrganizations();
  }

  return (
    <OrganizationContext.Provider
      value={{ organizations, currentOrganization, isLoading, error, switchOrganization, refresh }}>
      {children}
    </OrganizationContext.Provider>
  );
}
