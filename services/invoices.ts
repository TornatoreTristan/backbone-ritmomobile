import { apiRequest } from '@/services/api';

export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export type Invoice = {
  id: string;
  reference: string;
  status: InvoiceStatus;
  kind: string;
  amountHt: number;
  amountTtc: number;
  amountPaid: number;
  currency: string;
  clientName: string | null;
  clientEmail: string | null;
  issueDate: string;
  dueDate: string | null;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

type InvoicesResponse = {
  success: boolean;
  data: Invoice[];
};

export async function getMyInvoices(): Promise<Invoice[]> {
  const response = await apiRequest<InvoicesResponse>('/api/v1/me/invoices');
  return response.data;
}
