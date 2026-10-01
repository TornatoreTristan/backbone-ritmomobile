import * as Sentry from '@sentry/react-native';

import { ApiError } from '@/services/api';

type FieldError = { field?: string; message?: string; rule?: string };

const FIELD_LABELS: Record<string, string> = {
  postalCode: 'code postal',
  propertyType: 'type de bien',
  transactionType: 'type de projet',
  constructionYear: 'année de construction',
  surfaceArea: 'surface',
  diagnosticCount: 'nombre de diagnostics',
  gridCategory: 'catégorie de grille',
};

/**
 * Champs rejetés par le validateur VineJS du backend. Le 422 a la forme
 * `{ error: { message, details: { fields: [{ field, message, rule }] } } }` :
 * `error` étant un objet, `ApiError.message` n'est pas exploitable ici.
 */
function validationFields(error: ApiError): FieldError[] {
  const data = error.data as { error?: { details?: { fields?: unknown } } } | null;
  const fields = data?.error?.details?.fields;
  return Array.isArray(fields) ? (fields as FieldError[]) : [];
}

/**
 * Remonte à Sentry un échec d'appel API du wizard. Sans ça, les blocages
 * partenaires sont invisibles : les écrans affichent un message et avalent l'erreur.
 * Le payload ne contient que les critères du bien (pas de données client).
 */
export function reportWizardError(
  error: unknown,
  step: string,
  endpoint: string,
  payload?: Record<string, unknown>,
): void {
  // 401 : déjà géré par la déconnexion globale (setOnUnauthorized).
  if (error instanceof ApiError && error.status === 401) return;

  const status = error instanceof ApiError ? error.status : undefined;
  const fields = error instanceof ApiError ? validationFields(error) : [];

  Sentry.captureException(error, {
    level: status === 0 ? 'warning' : 'error',
    tags: {
      feature: 'quote_wizard',
      wizard_step: step,
      wizard_endpoint: endpoint,
      http_status: String(status ?? 'unknown'),
    },
    extra: {
      payload,
      rejectedFields: fields,
      responseData: error instanceof ApiError ? error.data : undefined,
    },
    fingerprint: ['quote-wizard', step, endpoint, String(status ?? 'unknown')],
  });
}

/** Message affichable pour un échec d'appel API du wizard. */
export function describeWizardError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;

  if (error.status === 0) {
    return 'Connexion au serveur impossible. Vérifiez votre connexion internet et réessayez.';
  }
  if (error.status === 403) {
    return "Votre compte n'est pas autorisé à créer un devis. Contactez votre conseiller Ritmo.";
  }
  if (error.status === 422) {
    const labels = [
      ...new Set(
        validationFields(error)
          .map((f) => (f.field ? FIELD_LABELS[f.field] : undefined))
          .filter((l): l is string => !!l),
      ),
    ];
    return labels.length > 0
      ? `Information invalide : ${labels.join(', ')}. Revenez aux étapes précédentes pour la corriger.`
      : 'Certaines informations du bien sont invalides. Revenez aux étapes précédentes pour les vérifier.';
  }
  if (error.status >= 500) {
    return 'Le serveur a rencontré une erreur. Réessayez dans quelques instants.';
  }
  return fallback;
}
