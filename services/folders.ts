import { apiRequest, apiUpload } from '@/services/api';
import { normalizeForSearch } from '@/services/search';

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
  /** Date de règlement (paiement enregistré). null tant que non payé. */
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function folderMatchesQuery(folder: Folder, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return (
    normalizeForSearch(folder.reference).includes(normalizedQuery) ||
    normalizeForSearch(folder.clientName).includes(normalizedQuery) ||
    normalizeForSearch(folder.propertyAddress).includes(normalizedQuery)
  );
}

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

export type InterventionStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type FolderInterventionSummary = {
  id: string;
  status: InterventionStatus;
  scheduledAt: string | null;
  durationMinutes: number;
  completedAt: string | null;
  technicianName: string | null;
  technicianEmail: string | null;
  technicianPhone: string | null;
  technicianAvatarUrl: string | null;
};

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
  /** URL signée pour ouvrir le PDF, ou null si non disponible. */
  url: string | null;
};

export type FolderDetail = Folder & {
  clientPhone: string | null;
  clientAddress: string | null;
  clientCity: string | null;
  clientPostalCode: string | null;
  finalPriceHt: string | null;
  originalPriceHt: number | null;
  originalPriceTtc: number | null;
  discountAmountHt: number | null;
  discountAmountTtc: number | null;
  discountPercent: number | null;
  partnerNotes: string | null;
  quotes: FolderQuoteSummary[];
  invoices: FolderInvoiceSummary[];
  interventions: FolderInterventionSummary[];
};

export type FolderFile = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: FolderCategory;
  createdAt: string;
  /** URL signée pour ouvrir/télécharger le fichier. */
  url: string;
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

export type FolderReport = {
  id: string;
  filename: string;
  size: number;
  createdAt: string | null;
  /** URL signée temporaire pour ouvrir le PDF (sans auth). */
  url: string;
};

type FolderReportsResponse = {
  success: boolean;
  data: FolderReport[];
};

export async function getFolderReports(folderId: string): Promise<FolderReport[]> {
  const response = await apiRequest<FolderReportsResponse>(
    `/api/v1/folders/${folderId}/reports`,
  );
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
