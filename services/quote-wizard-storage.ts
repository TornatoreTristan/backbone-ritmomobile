import type { WizardState } from '@/contexts/quote-wizard-context';
import * as SecureStore from 'expo-secure-store';

const STATE_KEY = 'quote_wizard_state_v1';
const STEP_KEY = 'quote_wizard_step_v1';

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

export async function saveWizardState(state: WizardState, step: number): Promise<void> {
  const savable = toSavable(state);
  await Promise.all([
    SecureStore.setItemAsync(STATE_KEY, JSON.stringify(savable)),
    SecureStore.setItemAsync(STEP_KEY, String(step)),
  ]);
}

export async function loadWizardState(): Promise<{
  state: SavableState;
  step: number;
} | null> {
  const [raw, stepRaw] = await Promise.all([
    SecureStore.getItemAsync(STATE_KEY),
    SecureStore.getItemAsync(STEP_KEY),
  ]);
  if (!raw) return null;
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
  ]);
}
