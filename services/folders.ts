import { apiRequest, apiUpload } from '@/services/api';

export type FolderStatus = 'draft' | 'lead' | 'deal' | 'archived';

export type FolderCategory =
  | 'document'
  | 'diagnostic'
  | 'photo'
  | 'invoice'
  | 'quote'
  | 'contract'
  | 'other';

export type FolderPrestation = {
  id: string;
  name: string;
  iconUrl: string | null;
};

export type Folder = {
  id: string;
  reference: string;
  status: FolderStatus;
  clientName: string;
  clientEmail: string | null;
  finalPriceTtc: string | null;
  propertyAddress: string | null;
  prestations: FolderPrestation[];
  createdAt: string;
  updatedAt: string;
};

export type QuoteStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted'
  | 'canceled';

export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export type FolderQuoteSummary = {
  id: string;
  reference: string;
  status: QuoteStatus;
  amountTtc: number;
  issueDate: string | null;
  validUntil: string | null;
  publicToken: string | null;
};

export type FolderInvoiceSummary = {
  id: string;
  reference: string;
  status: InvoiceStatus;
  amountTtc: number;
  amountPaid: number;
  issueDate: string | null;
  dueDate: string | null;
};

export type FolderDetail = Folder & {
  clientPhone: string | null;
  clientAddress: string | null;
  clientCity: string | null;
  clientPostalCode: string | null;
  finalPriceHt: string | null;
  partnerNotes: string | null;
  quotes: FolderQuoteSummary[];
  invoices: FolderInvoiceSummary[];
};

export type FolderFile = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: FolderCategory;
  createdAt: string;
};

type FoldersResponse = {
  success: boolean;
  data: Folder[];
};

type FolderDetailResponse = {
  success: boolean;
  data: FolderDetail;
};

type FolderFilesResponse = {
  success: boolean;
  data: FolderFile[];
};

export async function getMyFolders(): Promise<Folder[]> {
  const response = await apiRequest<FoldersResponse>('/api/v1/me/folders');
  return response.data;
}

export async function getFolderById(id: string): Promise<FolderDetail> {
  const response = await apiRequest<FolderDetailResponse>(`/api/v1/folders/${id}`);
  return response.data;
}

export async function getFolderFiles(folderId: string): Promise<FolderFile[]> {
  const response = await apiRequest<FolderFilesResponse>(`/api/v1/folders/${folderId}/files`);
  return response.data;
}

export type FolderFileCategory = FolderCategory;

type FolderFileUploadResponse = {
  success: boolean;
  data: FolderFile;
};

export async function uploadFolderFile(
  folderId: string,
  file: { uri: string; name: string; mimeType: string },
  category?: FolderFileCategory,
): Promise<FolderFile> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as any);
  if (category) {
    formData.append('category', category);
  }
  const response = await apiUpload<FolderFileUploadResponse>(
    `/api/v1/folders/${folderId}/files`,
    formData,
  );
  return response.data;
}
