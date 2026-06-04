import { apiRequest } from '@/services/api';

export type OrganizationEmployee = {
  id: string;
  fullName: string;
};

type EmployeesResponse = {
  success: boolean;
  data: OrganizationEmployee[];
};

export async function getOrganizationEmployees(orgId: string): Promise<OrganizationEmployee[]> {
  const response = await apiRequest<EmployeesResponse>(
    `/api/v1/organizations/${orgId}/employees`,
  );
  return response.data;
}
