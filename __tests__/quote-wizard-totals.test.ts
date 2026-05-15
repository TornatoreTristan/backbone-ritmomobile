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
