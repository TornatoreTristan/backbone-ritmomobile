import { apiRequest } from '@/services/api';

export type Advisor = {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
};

type AdvisorsResponse = {
  success: boolean;
  data: Advisor[];
};

export async function getMyAdvisors(): Promise<Advisor[]> {
  const response = await apiRequest<AdvisorsResponse>('/api/v1/me/advisors');
  return response.data;
}
