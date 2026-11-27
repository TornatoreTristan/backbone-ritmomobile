import type { WizardState } from '@/contexts/quote-wizard-context';
import {
  clearWizardState,
  loadWizardState,
  saveWizardState,
  wizardDraftOwner,
} from '@/services/quote-wizard-storage';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

const store = (jest.requireMock('expo-secure-store') as { __store: Map<string, string> }).__store;

const draft = {
  contactSearch: 'Jean Dupont',
  newContactPhone: '0612345678',
  suggestionsObligatoire: [],
  suggestionsFacultatif: [],
  gridTotal: null,
  bdnbBuilding: null,
  bdnbSuggestedYear: null,
} as unknown as WizardState;

const ownerA = wizardDraftOwner('user-a', 'org-1');

beforeEach(() => {
  store.clear();
});

describe('wizard draft storage', () => {
  it('restores the draft for the account and organization that saved it', async () => {
    await saveWizardState(draft, 8, ownerA);
    const loaded = await loadWizardState(ownerA);
    expect(loaded?.step).toBe(8);
    expect(loaded?.state.contactSearch).toBe('Jean Dupont');
  });

  it('never hands a draft to another account, and erases it', async () => {
    await saveWizardState(draft, 8, ownerA);
    expect(await loadWizardState(wizardDraftOwner('user-b', 'org-1'))).toBeNull();
    expect(store.size).toBe(0);
    // Même le propriétaire d'origine ne le retrouve plus : il a été effacé.
    expect(await loadWizardState(ownerA)).toBeNull();
  });

  it('never hands a draft to the same account in another organization', async () => {
    await saveWizardState(draft, 3, ownerA);
    expect(await loadWizardState(wizardDraftOwner('user-a', 'org-2'))).toBeNull();
    expect(store.size).toBe(0);
  });

  it('discards a legacy draft saved without an owner', async () => {
    store.set('quote_wizard_state_v1', JSON.stringify({ contactSearch: 'Ancien client' }));
    store.set('quote_wizard_step_v1', '5');
    expect(await loadWizardState(ownerA)).toBeNull();
    expect(store.size).toBe(0);
  });

  it('clearWizardState removes every key, owner included', async () => {
    await saveWizardState(draft, 2, ownerA);
    await clearWizardState();
    expect(store.size).toBe(0);
  });

  it('does not persist the heavy, re-fetchable fields', async () => {
    await saveWizardState(draft, 2, ownerA);
    const saved = JSON.parse(store.get('quote_wizard_state_v1') ?? '{}');
    expect(saved).not.toHaveProperty('gridTotal');
    expect(saved).not.toHaveProperty('suggestionsObligatoire');
    expect(saved).not.toHaveProperty('bdnbBuilding');
  });

  it('distinguishes owners by user and by organization', () => {
    expect(wizardDraftOwner('u', 'o')).not.toBe(wizardDraftOwner('u', 'o2'));
    expect(wizardDraftOwner('u', 'o')).not.toBe(wizardDraftOwner('u2', 'o'));
    expect(wizardDraftOwner('u', null)).toBe('u:');
  });
});
