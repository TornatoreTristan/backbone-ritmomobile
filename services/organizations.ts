import { apiRequest } from '@/services/api';

export type Organization = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  role: string;
  roles: string[];
};

type OrganizationsResponse = {
  success: boolean;
  data: Organization[];
};

export async function getMyOrganizations(): Promise<Organization[]> {
  const response = await apiRequest<OrganizationsResponse>('/api/v1/me/organizations');
  return response.data;
}
