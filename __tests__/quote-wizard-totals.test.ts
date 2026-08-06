import {
  selectQuoteTotals,
  type WizardState,
} from '@/contexts/quote-wizard-context';
import type { SuggestedProduct } from '@/services/quote-wizard';

function makeState(overrides: Partial<WizardState> = {}): WizardState {
  return {
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
    staffOriginalPriceTtc: '',
    staffFinalPriceTtc: '',
    staffDiscountPercent: '',
    staffRdvDate: null,
    staffRdvDurationMinutes: '',
    staffTechnicianIds: [],
    ...overrides,
  };
}

function makeSuggestion(
  id: string,
  pricingSource: 'grid' | 'fixed',
  priceTtc: number,
  result: 'obligatoire' | 'facultatif' = 'obligatoire',
): SuggestedProduct {
  return {
    product: { id, nameI18n: { fr: id } },
    result,
    priceHt: priceTtc * 0.83,
    priceTtc,
    pricingSource,
  };
}

describe('selectQuoteTotals', () => {
  it('returns zero when no selection', () => {
    const totals = selectQuoteTotals(makeState());
    expect(totals.totalTtc).toBe(0);
    expect(totals.selected).toHaveLength(0);
  });

  it('sums fixed prices', () => {
    const a = makeSuggestion('a', 'fixed', 100);
    const b = makeSuggestion('b', 'fixed', 50);
    const totals = selectQuoteTotals(
      makeState({
        suggestionsObligatoire: [a, b],
        selectedProductIds: ['a', 'b'],
      }),
    );
    expect(totals.totalTtc).toBe(150);
    expect(totals.fixedTtc).toBe(150);
    expect(totals.gridTtc).toBe(0);
  });

  it('uses gridTotal.priceTtc when grid items are selected', () => {
    const a = makeSuggestion('a', 'grid', 80);
    const totals = selectQuoteTotals(
      makeState({
        suggestionsObligatoire: [a],
        selectedProductIds: ['a'],
        gridTotal: { priceTtc: 200 },
      }),
    );
    expect(totals.gridTtc).toBe(200);
    expect(totals.totalTtc).toBe(200);
  });

  it('falls back to sum of grid prices when gridTotal is missing or zero', () => {
    const a = makeSuggestion('a', 'grid', 80);
    const b = makeSuggestion('b', 'grid', 60);
    const totals = selectQuoteTotals(
      makeState({
        suggestionsObligatoire: [a, b],
        selectedProductIds: ['a', 'b'],
        gridTotal: null,
      }),
    );
    expect(totals.gridTtc).toBe(140);

    const totalsZero = selectQuoteTotals(
      makeState({
        suggestionsObligatoire: [a, b],
        selectedProductIds: ['a', 'b'],
        gridTotal: { priceTtc: 0 },
      }),
    );
    expect(totalsZero.gridTtc).toBe(140);
  });

  it('combines grid + fixed', () => {
    const a = makeSuggestion('a', 'grid', 80);
    const b = makeSuggestion('b', 'fixed', 100, 'facultatif');
    const totals = selectQuoteTotals(
      makeState({
        suggestionsObligatoire: [a],
        suggestionsFacultatif: [b],
        selectedProductIds: ['a', 'b'],
        gridTotal: { priceTtc: 150 },
      }),
    );
    expect(totals.gridTtc).toBe(150);
    expect(totals.fixedTtc).toBe(100);
    expect(totals.totalTtc).toBe(250);
  });

  // En gestion locative le forfait de grille couvre tout : les produits à prix
  // fixe ne s'ajoutent pas par-dessus (même règle que le wizard web).
  it('excludes fixed prices in gestion_locative', () => {
    const a = makeSuggestion('a', 'grid', 80);
    const b = makeSuggestion('b', 'fixed', 100, 'facultatif');
    const overrides = {
      suggestionsObligatoire: [a],
      suggestionsFacultatif: [b],
      selectedProductIds: ['a', 'b'],
      gridTotal: { priceTtc: 150 },
    };

    const gestionLocative = selectQuoteTotals(
      makeState({ ...overrides, projectType: 'gestion_locative' as const }),
    );
    expect(gestionLocative.fixedTtc).toBe(0);
    expect(gestionLocative.totalTtc).toBe(150);

    const location = selectQuoteTotals(
      makeState({ ...overrides, projectType: 'location' as const }),
    );
    expect(location.fixedTtc).toBe(100);
    expect(location.totalTtc).toBe(250);
  });

  // Les suppléments (surface, déplacement…) étaient purement ignorés par le
  // mobile : total affiché et dossier créé sous-évalués sur les organisations
  // qui en configurent.
  it('adds product supplements on top of grid and fixed prices', () => {
    const a: SuggestedProduct = {
      ...makeSuggestion('a', 'grid', 80),
      product: { id: 'a', nameI18n: { fr: 'a' }, priceSupplementTtc: 30 },
    };
    const b: SuggestedProduct = {
      ...makeSuggestion('b', 'fixed', 100, 'facultatif'),
      product: { id: 'b', nameI18n: { fr: 'b' }, priceSupplementTtc: 12 },
    };
    const totals = selectQuoteTotals(
      makeState({
        projectType: 'vente',
        suggestionsObligatoire: [a],
        suggestionsFacultatif: [b],
        selectedProductIds: ['a', 'b'],
        gridTotal: { priceTtc: 150 },
      }),
    );
    expect(totals.supplementsTtc).toBe(42);
    expect(totals.totalTtc).toBe(150 + 100 + 42);
  });

  it('keeps supplements due in gestion_locative, unlike fixed prices', () => {
    const a: SuggestedProduct = {
      ...makeSuggestion('a', 'grid', 80),
      product: { id: 'a', nameI18n: { fr: 'a' }, priceSupplementTtc: 30 },
    };
    const b: SuggestedProduct = {
      ...makeSuggestion('b', 'fixed', 100, 'facultatif'),
      product: { id: 'b', nameI18n: { fr: 'b' } },
    };
    const totals = selectQuoteTotals(
      makeState({
        projectType: 'gestion_locative',
        suggestionsObligatoire: [a],
        suggestionsFacultatif: [b],
        selectedProductIds: ['a', 'b'],
        gridTotal: { priceTtc: 150 },
      }),
    );
    expect(totals.fixedTtc).toBe(0);
    expect(totals.supplementsTtc).toBe(30);
    expect(totals.totalTtc).toBe(180);
  });

  // Un diagnostic grille rétrogradé en 'fixed' à 0 € par un échec de recherche
  // grille ne doit pas être compté comme une prestation à prix fixe : sinon le
  // total tombe à 0 € et le blocage anti-devis-à-0 ne se déclenche pas.
  it('treats a downgraded grid product as grid, not as a 0 € fixed line', () => {
    const downgraded: SuggestedProduct = {
      product: { id: 'dpe', nameI18n: { fr: 'DPE' }, pricingType: 'grid' },
      result: 'obligatoire',
      priceHt: 0,
      priceTtc: 0,
      pricingSource: 'fixed',
    };
    const totals = selectQuoteTotals(
      makeState({
        projectType: 'vente',
        suggestionsObligatoire: [downgraded],
        selectedProductIds: ['dpe'],
        gridTotal: null,
      }),
    );
    expect(totals.gridSelected).toHaveLength(1);
    expect(totals.fixedSelected).toHaveLength(0);
    expect(totals.fixedTtc).toBe(0);
  });

  it('ignores unselected suggestions', () => {
    const a = makeSuggestion('a', 'fixed', 100);
    const b = makeSuggestion('b', 'fixed', 50);
    const totals = selectQuoteTotals(
      makeState({
        suggestionsObligatoire: [a, b],
        selectedProductIds: ['a'],
      }),
    );
    expect(totals.totalTtc).toBe(100);
    expect(totals.selected).toHaveLength(1);
  });
});
