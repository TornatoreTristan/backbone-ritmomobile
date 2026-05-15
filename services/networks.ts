import { apiRequest } from '@/services/api';

export type PartnerType = 'independent' | 'network' | 'agency';

export type NetworkPartner = {
  id: string;
  fullName: string;
  email: string | null;
  type: PartnerType;
  networkId: string | null;
  networkName: string | null;
  agencyId: string | null;
  createdAt: string;
};

type NetworksResponse = {
  success: boolean;
  data: NetworkPartner[];
};

export async function getMyNetworks(): Promise<NetworkPartner[]> {
  const response = await apiRequest<NetworksResponse>('/api/v1/me/networks');
  return response.data;
}
