import type { WizardState } from '@/contexts/quote-wizard-context';
import { buildSubmitPayload, type SuggestedProduct } from '@/services/quote-wizard';

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
    product: {
      id,
      nameI18n: { fr: `Diag ${id}`, en: `Diag ${id}` },
    },
    result,
    priceHt: priceTtc * 0.83,
    priceTtc,
    pricingSource,
  };
}

const dummyUser = { fullName: 'Tristan T.', email: 'tristan@example.com' };

describe('buildSubmitPayload', () => {
  it('throws when projectType is missing', () => {
    expect(() => buildSubmitPayload(makeState(), dummyUser, false)).toThrow();
  });

  it('maps avant_travaux project to travaux transaction', () => {
    const state = makeState({
      projectType: 'avant_travaux',
      propertyType: 'appartement',
      postalCode: '75001',
      contactSearch: 'Jean Dupont',
    });
    const payload = buildSubmitPayload(state, dummyUser, false);
    expect(payload.projectType).toBe('travaux');
  });

  it('maps gestion_locative to location', () => {
    const state = makeState({
      projectType: 'gestion_locative',
      propertyType: 'appartement',
      postalCode: '75001',
      contactSearch: 'Jean',
    });
    expect(buildSubmitPayload(state, dummyUser, false).projectType).toBe('location');
  });

  it('uses exactYear when set, else falls back to yearRange', () => {
    const exactState = makeState({
      projectType: 'vente',
      propertyType: 'maison',
      postalCode: '75001',
      contactSearch: 'A',
      exactYear: '1995',
      yearRange: 'avant_1949',
    });
    expect(buildSubmitPayload(exactState, dummyUser, false).constructionYear).toBe(1995);

    const rangeState = makeState({
      projectType: 'vente',
      propertyType: 'maison',
      postalCode: '75001',
      contactSearch: 'A',
      yearRange: '1990_2000',
    });
    expect(buildSubmitPayload(rangeState, dummyUser, false).constructionYear).toBe(1995);
  });

  it('omits hasGas when "ne_sait_pas"', () => {
    const state = makeState({
      projectType: 'vente',
      propertyType: 'maison',
      postalCode: '75001',
      contactSearch: 'A',
      hasGas: 'ne_sait_pas',
    });
    const payload = buildSubmitPayload(state, dummyUser, false);
    expect(payload.hasGas).toBeUndefined();
  });

  it('sets hasGas true/false correctly', () => {
    const oui = makeState({
      projectType: 'vente',
      propertyType: 'maison',
      postalCode: '75001',
      contactSearch: 'A',
      hasGas: 'oui',
    });
    expect(buildSubmitPayload(oui, dummyUser, false).hasGas).toBe(true);

    const non = makeState({
      projectType: 'vente',
      propertyType: 'maison',
      postalCode: '75001',
      contactSearch: 'A',
      hasGas: 'non',
    });
    expect(buildSubmitPayload(non, dummyUser, false).hasGas).toBe(false);
  });

  it('normalizes local_bureau to local_commercial', () => {
    const state = makeState({
      projectType: 'vente',
      propertyType: 'local_bureau',
      postalCode: '75001',
      contactSearch: 'A',
    });
    expect(buildSubmitPayload(state, dummyUser, false).propertyType).toBe('local_commercial');
  });

  it('uses property address when addressSameAsProperty is true', () => {
    const state = makeState({
      projectType: 'vente',
      propertyType: 'appartement',
      postalCode: '75001',
      address: '12 rue Bien',
      propertyCity: 'Paris',
      contactSearch: 'A',
      addressSameAsProperty: true,
      newContactAddress: 'IGNORED',
      newContactPostalCode: 'IGNORED',
      newContactCity: 'IGNORED',
    });
    const payload = buildSubmitPayload(state, dummyUser, false);
    expect(payload.clientAddress).toBe('12 rue Bien');
    expect(payload.clientPostalCode).toBe('75001');
    expect(payload.clientCity).toBe('Paris');
  });

  it('uses contact address when addressSameAsProperty is false', () => {
    const state = makeState({
      projectType: 'vente',
      propertyType: 'appartement',
      postalCode: '75001',
      address: 'Property',
      propertyCity: 'Paris',
      contactSearch: 'A',
      addressSameAsProperty: false,
      newContactAddress: '99 rue Contact',
      newContactPostalCode: '13000',
      newContactCity: 'Marseille',
    });
    const payload = buildSubmitPayload(state, dummyUser, false);
    expect(payload.clientAddress).toBe('99 rue Contact');
    expect(payload.clientPostalCode).toBe('13000');
    expect(payload.clientCity).toBe('Marseille');
  });

  it('filters out empty dependances and trims values', () => {
    const state = makeState({
      projectType: 'vente',
      propertyType: 'maison',
      postalCode: '75001',
      contactSearch: 'A',
      dependances: [
        { id: '1', nom: 'Cave', superficie: '10' },
        { id: '2', nom: '   ', superficie: '15' },
        { id: '3', nom: 'Garage', superficie: '  ' },
      ],
    });
    const payload = buildSubmitPayload(state, dummyUser, false);
    expect(payload.dependances).toEqual([
      { nom: 'Cave', superficie: '10' },
      { nom: 'Garage', superficie: null },
    ]);
  });

  it('distributes grid total across selected grid items', () => {
    const a = makeSuggestion('a', 'grid', 50);
    const b = makeSuggestion('b', 'grid', 50);
    const c = makeSuggestion('c', 'fixed', 80, 'facultatif');
    const state = makeState({
      projectType: 'vente',
      propertyType: 'appartement',
      postalCode: '75001',
      contactSearch: 'A',
      suggestionsObligatoire: [a, b],
      suggestionsFacultatif: [c],
      selectedProductIds: ['a', 'b', 'c'],
      gridTotal: { priceHt: 200, priceTtc: 240 },
    });
    const payload = buildSubmitPayload(state, dummyUser, false);
    expect(payload.items).toHaveLength(3);
    const aItem = payload.items.find((i) => i.productId === 'a');
    const bItem = payload.items.find((i) => i.productId === 'b');
    const cItem = payload.items.find((i) => i.productId === 'c');
    expect(aItem?.unitPriceTtc).toBe(120);
    expect(bItem?.unitPriceTtc).toBe(120);
    expect(cItem?.unitPriceTtc).toBe(80);
  });

  it('only includes billing fields when billingDifferent is true', () => {
    const state = makeState({
      projectType: 'vente',
      propertyType: 'appartement',
      postalCode: '75001',
      contactSearch: 'A',
      billingDifferent: false,
      billingFirstName: 'IGNORED',
      billingEmail: 'IGNORED@x.fr',
    });
    const payload = buildSubmitPayload(state, dummyUser, false);
    expect(payload.billingFirstName).toBeNull();
    expect(payload.billingEmail).toBeNull();
  });

  it('passes sendQuoteToClient flag', () => {
    const state = makeState({
      projectType: 'vente',
      propertyType: 'appartement',
      postalCode: '75001',
      contactSearch: 'A',
    });
    expect(buildSubmitPayload(state, dummyUser, true).sendQuoteToClient).toBe(true);
    expect(buildSubmitPayload(state, dummyUser, false).sendQuoteToClient).toBe(false);
  });
});
