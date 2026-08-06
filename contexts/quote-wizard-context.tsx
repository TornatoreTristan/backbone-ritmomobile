import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import type {
  BdnbBuilding,
  BdnbSearchResult,
  GasState,
  GridTotalResult,
  OwnershipType,
  ProjectType,
  PropertyType,
  SuggestedProduct,
  SuggestionsResult,
  YearRange,
} from '@/services/quote-wizard';
import {
  isGestionLocative,
  isGridDiagnostic,
  sumSupplementsTtc,
} from '@/services/quote-wizard';
import {
  clearWizardState,
  loadWizardState,
  saveWizardState,
} from '@/services/quote-wizard-storage';

/**
 * Total grille tel que stocké dans le wizard : la réponse serveur + le nombre de
 * diagnostics grille pour lequel elle a été demandée. `requestedCount` permet à
 * l'étape 7 de détecter un total périmé (sélection modifiée depuis le calcul) —
 * `diagnosticCount` renvoyé par l'API ne convient pas, c'est le palier de grille
 * effectivement retenu, qui peut différer du nombre demandé.
 */
export type StoredGridTotal = GridTotalResult & { requestedCount?: number };

export type QuoteTotals = {
  selected: SuggestedProduct[];
  gridSelected: SuggestedProduct[];
  fixedSelected: SuggestedProduct[];
  gridTtc: number;
  fixedTtc: number;
  supplementsTtc: number;
  totalTtc: number;
};

export function selectQuoteTotals(state: WizardState): QuoteTotals {
  const all = [...state.suggestionsObligatoire, ...state.suggestionsFacultatif];
  const selected = all.filter((s) => state.selectedProductIds.includes(s.product.id));
  // Partition sur `product.pricingType` (via isGridDiagnostic), pas sur
  // `pricingSource` : un diagnostic grille dont la recherche a échoué arrive
  // étiqueté 'fixed' à 0 € et fausserait à la fois le palier et le total.
  const gridSelected = selected.filter(isGridDiagnostic);
  const fixedSelected = selected.filter((s) => !isGridDiagnostic(s));

  let gridTtc = 0;
  if (gridSelected.length > 0) {
    const totalTtc = state.gridTotal?.priceTtc;
    if (totalTtc && totalTtc > 0) {
      gridTtc = totalTtc;
    } else {
      gridTtc = gridSelected.reduce((sum, s) => sum + s.priceTtc, 0);
    }
  }
  // Gestion locative : le forfait de grille couvre l'ensemble de la prestation,
  // les produits à prix fixe ne s'ajoutent pas par-dessus (règle du wizard web,
  // `getFinalTotal`). `buildSubmitPayload` les envoie donc aussi à 0 €.
  const fixedTtc = isGestionLocative(state.projectType)
    ? 0
    : fixedSelected.reduce((sum, s) => sum + s.priceTtc, 0);

  // Les suppléments produits (surface, déplacement…) s'ajoutent au prix de la
  // ligne, grille ou fixe, et restent dus en gestion locative.
  const supplementsTtc = sumSupplementsTtc(selected);

  return {
    selected,
    gridSelected,
    fixedSelected,
    gridTtc,
    fixedTtc,
    supplementsTtc,
    totalTtc: gridTtc + fixedTtc + supplementsTtc,
  };
}

export type { ProjectType, PropertyType, YearRange, GasState, OwnershipType };

export type WizardState = {
  projectType: ProjectType | null;

  postalCode: string;
  address: string;
  propertyCity: string;

  bdnbBuilding: BdnbBuilding | null;
  bdnbSuggestedYear: number | null;

  propertyType: PropertyType | null;
  ownershipType: OwnershipType | null;
  floor: string;
  door: string;
  lotNumber: string;
  surfaceArea: string;
  roomCount: string;

  exactYear: string;
  yearRange: YearRange | null;

  hasGas: GasState | null;

  dependances: { id: string; nom: string; superficie: string }[];

  suggestionsObligatoire: SuggestedProduct[];
  suggestionsFacultatif: SuggestedProduct[];
  selectedProductIds: string[];
  gridTotal: StoredGridTotal | null;

  ownerType: string | null;
  companyName: string;
  contactSearch: string;
  newContactEmail: string;
  newContactPhone: string;
  addressSameAsProperty: boolean | null;
  newContactAddress: string;
  newContactPostalCode: string;
  newContactCity: string;
  residenceName: string;
  onSiteChoice: 'partner' | 'owner' | 'other' | 'agency_key' | null;
  onSiteContactName: string;
  onSiteContactPhone: string;
  onSiteAgencyAddress: string;
  accessConditions: string;
  billingDifferent: boolean;
  billingCompanyName: string;
  billingFirstName: string;
  billingLastName: string;
  billingEmail: string;
  billingPhone: string;
  billingAddress: string;
  billingPostalCode: string;
  billingCity: string;
  clientComments: string;

  // Staff-only fields (empty/null by default — retro-compatible with partner flow)
  staffOriginalPriceTtc: string;
  staffFinalPriceTtc: string;
  staffDiscountPercent: string;
  staffRdvDate: string | null;
  staffRdvDurationMinutes: string;
  staffTechnicianIds: string[];
};

const INITIAL_STATE: WizardState = {
  projectType: null,

  postalCode: '',
  address: '',
  propertyCity: '',

  bdnbBuilding: null,
  bdnbSuggestedYear: null,

  propertyType: null,
  ownershipType: null,
  floor: '',
  door: '',
  lotNumber: '',
  surfaceArea: '',
  roomCount: '',

  exactYear: '',
  yearRange: null,

  hasGas: null,

  dependances: [],

  suggestionsObligatoire: [],
  suggestionsFacultatif: [],
  selectedProductIds: [],
  gridTotal: null,

  ownerType: null,
  companyName: '',
  contactSearch: '',
  newContactEmail: '',
  newContactPhone: '',
  addressSameAsProperty: null,
  newContactAddress: '',
  newContactPostalCode: '',
  newContactCity: '',
  residenceName: '',
  onSiteChoice: null,
  onSiteContactName: '',
  onSiteContactPhone: '',
  onSiteAgencyAddress: '',
  accessConditions: '',
  billingDifferent: false,
  billingCompanyName: '',
  billingFirstName: '',
  billingLastName: '',
  billingEmail: '',
  billingPhone: '',
  billingAddress: '',
  billingPostalCode: '',
  billingCity: '',
  clientComments: '',

  // Staff-only fields
  staffOriginalPriceTtc: '',
  staffFinalPriceTtc: '',
  staffDiscountPercent: '',
  staffRdvDate: null,
  staffRdvDurationMinutes: '',
  staffTechnicianIds: [],
};

type WizardContextType = {
  state: WizardState;
  update: <K extends keyof WizardState>(field: K, value: WizardState[K]) => void;
  reset: () => void;
  resetAndClear: () => Promise<void>;
  addDependance: (dep: { id: string; nom: string; superficie: string }) => void;
  removeDependance: (id: string) => void;
  updateDependance: (id: string, patch: Partial<{ nom: string; superficie: string }>) => void;
  toggleProduct: (productId: string) => string[];
  /** Retourne les ids sélectionnés après application des suggestions. */
  setSuggestions: (suggestions: SuggestionsResult) => string[];
  setBdnb: (result: BdnbSearchResult) => void;
  setGridTotal: (result: GridTotalResult | null, requestedCount: number) => void;
  hasPendingState: boolean;
  pendingStep: number;
  restoreState: () => Promise<void>;
  discardState: () => Promise<void>;
  setCurrentStep: (step: number) => void;
};

const WizardContext = createContext<WizardContextType>({
  state: INITIAL_STATE,
  update: () => {},
  reset: () => {},
  resetAndClear: async () => {},
  addDependance: () => {},
  removeDependance: () => {},
  updateDependance: () => {},
  toggleProduct: () => [],
  setSuggestions: () => [],
  setBdnb: () => {},
  setGridTotal: () => {},
  hasPendingState: false,
  pendingStep: 1,
  restoreState: async () => {},
  discardState: async () => {},
  setCurrentStep: () => {},
});

export function useQuoteWizard() {
  return useContext(WizardContext);
}

export function QuoteWizardProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [hasPendingState, setHasPendingState] = useState(false);
  const [pendingStep, setPendingStep] = useState(1);
  const currentStepRef = useRef(1);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSaveRef = useRef(true);
  const loadedStateRef = useRef<Partial<WizardState> | null>(null);
  const selectedProductIdsRef = useRef(state.selectedProductIds);
  const wasRestoredRef = useRef(false);

  useEffect(() => {
    selectedProductIdsRef.current = state.selectedProductIds;
  }, [state.selectedProductIds]);

  useEffect(() => {
    loadWizardState().then((loaded) => {
      if (loaded) {
        loadedStateRef.current = loaded.state as Partial<WizardState>;
        setPendingStep(loaded.step);
        setHasPendingState(true);
      }
    });
  }, []);

  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveWizardState(state, currentStepRef.current).catch(() => {});
    }, 500);
  }, [state]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  function update<K extends keyof WizardState>(field: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  function reset() {
    skipNextSaveRef.current = true;
    setState(INITIAL_STATE);
  }

  async function resetAndClear() {
    skipNextSaveRef.current = true;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setState(INITIAL_STATE);
    setHasPendingState(false);
    loadedStateRef.current = null;
    await clearWizardState();
  }

  async function restoreState() {
    if (!loadedStateRef.current) {
      setHasPendingState(false);
      return;
    }
    wasRestoredRef.current = true;
    setState((prev) => ({ ...prev, ...loadedStateRef.current }));
    setHasPendingState(false);
    loadedStateRef.current = null;
  }

  async function discardState() {
    skipNextSaveRef.current = true;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setHasPendingState(false);
    loadedStateRef.current = null;
    await clearWizardState();
  }

  function setCurrentStep(step: number) {
    currentStepRef.current = step;
  }

  function addDependance(dep: { id: string; nom: string; superficie: string }) {
    setState((prev) => ({ ...prev, dependances: [...prev.dependances, dep] }));
  }

  function removeDependance(id: string) {
    setState((prev) => ({
      ...prev,
      dependances: prev.dependances.filter((d) => d.id !== id),
    }));
  }

  function updateDependance(id: string, patch: Partial<{ nom: string; superficie: string }>) {
    setState((prev) => ({
      ...prev,
      dependances: prev.dependances.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  }

  function toggleProduct(productId: string): string[] {
    const current = selectedProductIdsRef.current;
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    selectedProductIdsRef.current = next;
    setState((prev) => ({ ...prev, selectedProductIds: next }));
    return next;
  }

  // La sélection est résolue HORS de l'updater (et non plus dedans) pour deux
  // raisons : l'appelant a besoin des ids retenus pour calculer le nombre de
  // diagnostics grille à tarifer, et `wasRestoredRef` ne doit être consommé
  // qu'une fois — un updater peut être rejoué (StrictMode).
  function setSuggestions(suggestions: SuggestionsResult): string[] {
    const obligatoireIds = suggestions.obligatoire.map((s) => s.product.id);
    const allIds = [
      ...obligatoireIds,
      ...suggestions.facultatif.map((s) => s.product.id),
    ];

    let nextSelected: string[];
    if (wasRestoredRef.current) {
      wasRestoredRef.current = false;
      const restoredValid = selectedProductIdsRef.current.filter((id) => allIds.includes(id));
      nextSelected = Array.from(new Set([...obligatoireIds, ...restoredValid]));
    } else {
      nextSelected = obligatoireIds;
    }

    selectedProductIdsRef.current = nextSelected;
    setState((prev) => ({
      ...prev,
      suggestionsObligatoire: suggestions.obligatoire,
      suggestionsFacultatif: suggestions.facultatif,
      selectedProductIds: nextSelected,
    }));
    return nextSelected;
  }

  function setBdnb(result: BdnbSearchResult) {
    setState((prev) => ({
      ...prev,
      bdnbBuilding: result.building,
      bdnbSuggestedYear: result.building?.constructionYear ?? null,
    }));
  }

  function setGridTotal(result: GridTotalResult | null, requestedCount: number) {
    setState((prev) => ({
      ...prev,
      gridTotal: result ? { ...result, requestedCount } : null,
    }));
  }

  return (
    <WizardContext.Provider
      value={{
        state,
        update,
        reset,
        resetAndClear,
        addDependance,
        removeDependance,
        updateDependance,
        toggleProduct,
        setSuggestions,
        setBdnb,
        setGridTotal,
        hasPendingState,
        pendingStep,
        restoreState,
        discardState,
        setCurrentStep,
      }}>
      {children}
    </WizardContext.Provider>
  );
}
