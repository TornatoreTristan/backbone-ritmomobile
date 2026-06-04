import { apiRequest } from '@/services/api';
import type { Folder } from '@/services/folders';

type StaffFoldersResponse = {
  success: boolean;
  data: Folder[];
};

export async function getOrganizationFolders(organizationId: string): Promise<Folder[]> {
  const response = await apiRequest<StaffFoldersResponse>(
    `/api/v1/organizations/${organizationId}/folders`,
  );
  return response.data;
}
