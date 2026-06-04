import { ApiError, apiRequest } from '@/services/api';
import { getCurrentOrgId } from '@/services/organization-storage';
import { normalizeForSearch } from '@/services/search';

export type InterventionStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type PropertyKind = 'house' | 'apartment' | 'commercial' | 'land' | 'other';

export type DpeRating = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export type Contact = {
  name: string;
  phone: string | null;
  role: string | null;
};

export type PropertyDetails = {
  kind: PropertyKind;
  surfaceM2: number | null;
  rooms: number | null;
  floor: string | null;
  yearBuilt: number | null;
  dpe: DpeRating | null;
};

export type Intervention = {
  id: string;
  folderReference: string;
  status: InterventionStatus;
  scheduledAt: string;
  durationMinutes: number;
  prestation: string;
  propertyAddress: string;
  propertyAddressComplement: string | null;
  accessConditions: string | null;
  property: PropertyDetails;
  owner: Contact;
  onSiteContact: Contact | null;
  internalNotes: string | null;
};

export type PlanningDay = {
  /** ISO date YYYY-MM-DD */
  date: string;
  interventions: Intervention[];
};

export function interventionMatchesQuery(
  intervention: Intervention,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) return true;
  return (
    normalizeForSearch(intervention.folderReference).includes(normalizedQuery) ||
    normalizeForSearch(intervention.owner.name).includes(normalizedQuery) ||
    normalizeForSearch(intervention.propertyAddress).includes(normalizedQuery) ||
    normalizeForSearch(intervention.prestation).includes(normalizedQuery)
  );
}

type InterventionsListResponse = {
  success: boolean;
  data: Intervention[];
};

type InterventionResponse = {
  success: boolean;
  data: Intervention;
};

type PlanningResponse = {
  success: boolean;
  data: PlanningDay[];
};

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function appendOrgParam(params: URLSearchParams, orgId: string | null) {
  if (orgId) params.set('organizationId', orgId);
}

export type ListInterventionsFilters = {
  status?: InterventionStatus | InterventionStatus[];
  from?: Date;
  to?: Date;
};

export async function listInterventions(
  filters: ListInterventionsFilters = {},
): Promise<Intervention[]> {
  const orgId = await getCurrentOrgId();
  const params = new URLSearchParams();
  appendOrgParam(params, orgId);
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
    params.set('status', statuses);
  }
  if (filters.from) params.set('from', toIsoDate(filters.from));
  if (filters.to) params.set('to', toIsoDate(filters.to));

  const qs = params.toString();
  const endpoint = qs ? `/api/v1/me/interventions?${qs}` : '/api/v1/me/interventions';
  const response = await apiRequest<InterventionsListResponse>(endpoint);
  return response.data;
}

export async function listTodayInterventions(): Promise<Intervention[]> {
  const today = new Date();
  const startOfTomorrow = new Date(today);
  startOfTomorrow.setDate(today.getDate() + 1);
  return listInterventions({ from: today, to: startOfTomorrow });
}

export async function getPlanning(weekStart?: Date, days = 7): Promise<PlanningDay[]> {
  const orgId = await getCurrentOrgId();
  const params = new URLSearchParams();
  appendOrgParam(params, orgId);
  if (weekStart) params.set('from', toIsoDate(weekStart));
  params.set('days', String(days));

  const response = await apiRequest<PlanningResponse>(`/api/v1/me/planning?${params.toString()}`);
  return response.data;
}

export async function getIntervention(id: string): Promise<Intervention | null> {
  try {
    const response = await apiRequest<InterventionResponse>(`/api/v1/interventions/${id}`);
    return response.data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}

export const INTERVENTION_STATUS_LABELS: Record<InterventionStatus, string> = {
  scheduled: 'Planifiée',
  confirmed: 'Confirmée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
  rescheduled: 'Reportée',
};

export const INTERVENTION_STATUS_TONE: Record<
  InterventionStatus,
  'info' | 'warning' | 'success' | 'muted'
> = {
  scheduled: 'info',
  confirmed: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'muted',
  rescheduled: 'warning',
};

export const PROPERTY_KIND_LABELS: Record<PropertyKind, string> = {
  house: 'Maison',
  apartment: 'Appartement',
  commercial: 'Local commercial',
  land: 'Terrain',
  other: 'Autre',
};
