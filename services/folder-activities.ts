import { apiRequest } from '@/services/api';

export type ActivityType =
  | 'email'
  | 'phone'
  | 'sms'
  | 'meeting'
  | 'diagnostic'
  | 'note'
  | 'other';

export type ActivityStatus = 'completed' | 'upcoming' | 'overdue' | 'pending';

export type FolderActivity = {
  id: string;
  type: ActivityType;
  subject: string;
  description: string | null;
  durationMinutes: number | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  status: ActivityStatus;
  author: { id: string; name: string } | null;
};

type FolderActivitiesResponse = {
  success: boolean;
  data: FolderActivity[];
};

/**
 * Fil d'activités consolidé d'un dossier (notes, emails, appels…), repris de
 * l'onglet « Activités » du portail web.
 */
export async function getFolderActivities(folderId: string): Promise<FolderActivity[]> {
  const response = await apiRequest<FolderActivitiesResponse>(
    `/api/v1/folders/${folderId}/activities`,
  );
  return response.data;
}

export type FolderEmail = {
  id: string;
  subject: string | null;
  recipient: string;
  category: string;
  status: string;
  opensCount: number;
  clicksCount: number;
  openedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  /** URL signée pour ouvrir le rendu HTML de l'email, ou null si pas de contenu. */
  previewUrl: string | null;
};

type FolderEmailsResponse = {
  success: boolean;
  data: FolderEmail[];
};

/** Journal des emails envoyés liés au dossier (onglet « Mail » du portail web). */
export async function getFolderEmails(folderId: string): Promise<FolderEmail[]> {
  const response = await apiRequest<FolderEmailsResponse>(
    `/api/v1/folders/${folderId}/emails`,
  );
  return response.data;
}

export type FolderTimelineEntry = {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
  author: { id: string; name: string | null; avatarUrl: string | null } | null;
};

type FolderTimelineResponse = {
  success: boolean;
  data: FolderTimelineEntry[];
};

/** Historique (audit) du dossier (onglet « Historique » du portail web). */
export async function getFolderTimeline(folderId: string): Promise<FolderTimelineEntry[]> {
  const response = await apiRequest<FolderTimelineResponse>(
    `/api/v1/folders/${folderId}/timeline`,
  );
  return response.data;
}
