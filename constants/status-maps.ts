import type { BadgeTone } from '@/components/ui/badge';
import type { FolderStatus, InvoiceStatus, QuoteStatus } from '@/services/folders';
import type { InterventionStatus } from '@/services/technician';

/**
 * Source unique des libellés et tons de statut. Tout écran qui affiche un statut
 * doit passer par ici : des copies locales avaient divergé (« Reportée » d'un
 * côté, « Reprogrammée » de l'autre pour la même intervention).
 */

export const FOLDER_STATUS_LABELS: Record<FolderStatus, string> = {
  draft: 'Brouillon',
  lead: 'Prospect',
  deal: 'Conclu',
  archived: 'Archivé',
};

export const FOLDER_STATUS_TONE: Record<FolderStatus, BadgeTone> = {
  draft: 'muted',
  lead: 'info',
  deal: 'success',
  archived: 'secondary',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
  converted: 'Converti',
  canceled: 'Annulé',
};

export const QUOTE_STATUS_TONE: Record<QuoteStatus, BadgeTone> = {
  draft: 'muted',
  pending: 'info',
  sent: 'info',
  accepted: 'success',
  rejected: 'destructive',
  expired: 'secondary',
  converted: 'success',
  canceled: 'muted',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  sent: 'Envoyée',
  paid: 'Payée',
  partially_paid: 'Partiellement payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
};

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  draft: 'muted',
  pending: 'info',
  sent: 'info',
  paid: 'success',
  partially_paid: 'warning',
  overdue: 'destructive',
  cancelled: 'muted',
  refunded: 'secondary',
};

export const INTERVENTION_STATUS_LABELS: Record<InterventionStatus, string> = {
  scheduled: 'Planifiée',
  confirmed: 'Confirmée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
  rescheduled: 'Reportée',
};

export const INTERVENTION_STATUS_TONE: Record<InterventionStatus, BadgeTone> = {
  scheduled: 'info',
  confirmed: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'muted',
  rescheduled: 'warning',
};
