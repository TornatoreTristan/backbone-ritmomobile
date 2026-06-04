import { useAuth } from '@/contexts/auth-context';
import { getMyOrganizations, type Organization } from '@/services/organizations';
import {
  clearCurrentOrgId,
  getCurrentOrgId,
  saveCurrentOrgId,
} from '@/services/organization-storage';
import {
  getRoleOverride,
  setRoleOverride as persistRoleOverride,
  type RoleOverride,
} from '@/services/role-storage';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

type OrganizationContextType = {
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  error: string | null;
  switchOrganization: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  /** Effective roles for the current org, after applying any dev override. */
  effectiveRoles: string[];
  isTechnician: boolean;
  isPartner: boolean;
  isStaff: boolean;
  /** Dev-only role override (null = no override, use backend roles). */
  roleOverride: RoleOverride;
  setRoleOverride: (role: RoleOverride) => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextType>({
  organizations: [],
  currentOrganization: null,
  isLoading: false,
  error: null,
  switchOrganization: async () => {},
  refresh: async () => {},
  effectiveRoles: [],
  isTechnician: false,
  isPartner: false,
  isStaff: false,
  roleOverride: null,
  setRoleOverride: async () => {},
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
  const [roleOverride, setRoleOverrideState] = useState<RoleOverride>(null);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setError(null);
      return;
    }
    loadOrganizations();
    getRoleOverride().then(setRoleOverrideState);
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

  async function setRoleOverride(role: RoleOverride) {
    await persistRoleOverride(role);
    setRoleOverrideState(role);
  }

  const effectiveRoles = useMemo<string[]>(() => {
    if (roleOverride) return [roleOverride];
    return currentOrganization?.roles ?? [];
  }, [currentOrganization, roleOverride]);

  const isTechnician = effectiveRoles.includes('technician');
  const isPartner = effectiveRoles.includes('partner');
  // isStaff = true si l'utilisateur possède au moins un rôle staff (ni partner ni technician),
  // même s'il est aussi partner. Un partner pur ou technicien pur reste false.
  const isStaff =
    !isTechnician &&
    effectiveRoles.some((role) => role !== 'partner' && role !== 'technician');

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        isLoading,
        error,
        switchOrganization,
        refresh,
        effectiveRoles,
        isTechnician,
        isPartner,
        isStaff,
        roleOverride,
        setRoleOverride,
      }}>
      {children}
    </OrganizationContext.Provider>
  );
}
