/**
 * Lecture des nombres saisis dans le wizard. Le clavier `decimal-pad` d'un
 * iPhone français produit une virgule : `parseFloat('85,5')` s'arrête dessus et
 * renvoie 85, d'où une surface ou un prix tronqué sans le moindre message.
 * Tous les champs numériques du wizard passent donc par ces deux fonctions,
 * qui renvoient `null` (jamais `NaN`) pour une saisie vide ou illisible.
 */

const DECIMAL_PATTERN = /^(\d+([.,]\d*)?|[.,]\d+)$/;
const INTEGER_PATTERN = /^\d+$/;

/** « 85,5 », « 85.5 », « 1 250,50 » → nombre ; vide ou illisible → `null`. */
export function parseDecimal(input: string | null | undefined): number | null {
  if (input == null) return null;
  // Espaces (y compris insécables) tolérés comme séparateurs de milliers.
  const compact = input.replace(/[\s  ]/g, '');
  if (!DECIMAL_PATTERN.test(compact)) return null;
  const parsed = Number(compact.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Entier positif strict (« 3 ») ; « 3,5 », « abc » ou vide → `null`. */
export function parseInteger(input: string | null | undefined): number | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (!INTEGER_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
