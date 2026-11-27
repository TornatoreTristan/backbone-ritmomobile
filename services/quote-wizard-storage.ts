import type { WizardState } from '@/contexts/quote-wizard-context';
import * as SecureStore from 'expo-secure-store';

const STATE_KEY = 'quote_wizard_state_v1';
const STEP_KEY = 'quote_wizard_step_v1';
const OWNER_KEY = 'quote_wizard_owner_v1';

type SavableState = Omit<
  WizardState,
  'bdnbBuilding' | 'bdnbSuggestedYear' | 'suggestionsObligatoire' | 'suggestionsFacultatif' | 'gridTotal'
>;

function toSavable(state: WizardState): SavableState {
  const {
    bdnbBuilding: _b,
    bdnbSuggestedYear: _y,
    suggestionsObligatoire: _o,
    suggestionsFacultatif: _f,
    gridTotal: _g,
    ...rest
  } = state;
  return rest;
}

/**
 * Identité du propriétaire d'un brouillon. Le brouillon contient les coordonnées
 * d'un client : il ne doit être reproposé ni à un autre compte connecté sur le
 * même appareil, ni au même compte dans une autre organisation.
 */
export function wizardDraftOwner(userId: string, organizationId: string | null | undefined): string {
  return `${userId}:${organizationId ?? ''}`;
}

export async function saveWizardState(
  state: WizardState,
  step: number,
  owner: string,
): Promise<void> {
  const savable = toSavable(state);
  await Promise.all([
    SecureStore.setItemAsync(STATE_KEY, JSON.stringify(savable)),
    SecureStore.setItemAsync(STEP_KEY, String(step)),
    SecureStore.setItemAsync(OWNER_KEY, owner),
  ]);
}

/**
 * Charge le brouillon de `owner`. Un brouillon appartenant à quelqu'un d'autre
 * (ou antérieur au cloisonnement, donc sans propriétaire) est effacé et ignoré.
 */
export async function loadWizardState(owner: string): Promise<{
  state: SavableState;
  step: number;
} | null> {
  const [raw, stepRaw, storedOwner] = await Promise.all([
    SecureStore.getItemAsync(STATE_KEY),
    SecureStore.getItemAsync(STEP_KEY),
    SecureStore.getItemAsync(OWNER_KEY),
  ]);
  if (!raw) return null;
  if (storedOwner !== owner) {
    await clearWizardState();
    return null;
  }
  try {
    const state = JSON.parse(raw) as SavableState;
    const step = stepRaw ? parseInt(stepRaw, 10) : 1;
    return { state, step: isNaN(step) ? 1 : step };
  } catch {
    return null;
  }
}

export async function clearWizardState(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(STATE_KEY),
    SecureStore.deleteItemAsync(STEP_KEY),
    SecureStore.deleteItemAsync(OWNER_KEY),
  ]);
}
