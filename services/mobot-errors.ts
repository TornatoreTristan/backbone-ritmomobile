import { MobotStreamError } from '@/services/mobot';

function formatResetTime(resetAt: string | null): string {
  if (!resetAt) return 'plus tard';
  const date = new Date(resetAt);
  if (Number.isNaN(date.getTime())) return 'plus tard';
  return `à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function mobotErrorMessage(error: unknown): string {
  if (!(error instanceof MobotStreamError)) {
    return 'Mobot ne répond pas pour le moment. Vérifiez votre connexion et réessayez.';
  }
  if (error.code === 'quota_exceeded') {
    return error.reason === 'organization_monthly'
      ? 'Votre organisation a atteint le nombre de questions du mois.'
      : `Vous avez posé beaucoup de questions aujourd'hui. Réessayez ${formatResetTime(error.resetAt)}.`;
  }
  if (error.code === 'forbidden') return "Mobot n'est pas disponible pour votre compte.";
  if (error.code === 'conversation_not_found') return 'Cette conversation est introuvable.';
  return 'Mobot ne répond pas pour le moment. Réessayez dans un instant.';
}
