import {
  validateAllSteps,
  validateStaffPricing,
  validateStep,
} from '@/services/quote-wizard-validation';
import type { WizardState } from '@/contexts/quote-wizard-context';

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

describe('validateStep', () => {
  describe('step 1 (project type)', () => {
    it('fails when projectType is null', () => {
      expect(validateStep(1, makeState()).valid).toBe(false);
    });
    it('passes when projectType is set', () => {
      expect(validateStep(1, makeState({ projectType: 'vente' })).valid).toBe(true);
    });
  });

  describe('step 2 (localisation)', () => {
    it('fails when postal code is missing', () => {
      expect(validateStep(2, makeState({ address: '12 rue X', propertyCity: 'Paris' })).valid).toBe(false);
    });
    it('fails when postal code has 4 digits', () => {
      expect(
        validateStep(2, makeState({ postalCode: '7500', address: 'A', propertyCity: 'P' })).valid,
      ).toBe(false);
    });
    it('fails when address is empty', () => {
      expect(
        validateStep(2, makeState({ postalCode: '75001', propertyCity: 'Paris' })).valid,
      ).toBe(false);
    });
    it('passes with all fields valid', () => {
      expect(
        validateStep(
          2,
          makeState({ postalCode: '75001', address: '12 rue X', propertyCity: 'Paris' }),
        ).valid,
      ).toBe(true);
    });
  });

  describe('step 3 (bien immobilier)', () => {
    it('fails when property type missing', () => {
      expect(
        validateStep(3, makeState({ surfaceArea: '75', roomCount: '3' })).valid,
      ).toBe(false);
    });
    it('fails for maison without ownership type', () => {
      expect(
        validateStep(
          3,
          makeState({ propertyType: 'maison', surfaceArea: '75', roomCount: '3' }),
        ).valid,
      ).toBe(false);
    });
    it('passes for appartement without ownership type', () => {
      expect(
        validateStep(
          3,
          makeState({ propertyType: 'appartement', surfaceArea: '75', roomCount: '3' }),
        ).valid,
      ).toBe(true);
    });
    it('passes for maison with ownership type', () => {
      expect(
        validateStep(
          3,
          makeState({
            propertyType: 'maison',
            ownershipType: 'individuel',
            surfaceArea: '120',
            roomCount: '5',
          }),
        ).valid,
      ).toBe(true);
    });
  });

  describe('step 3 (surface et pièces)', () => {
    const base = { propertyType: 'appartement', surfaceArea: '75', roomCount: '3' };

    it('accepts a French decimal comma', () => {
      expect(validateStep(3, makeState({ ...base, surfaceArea: '85,5' })).valid).toBe(true);
    });
    it.each(['0', ',', 'abc', '-5', '12,5,3'])('rejects surface %p', (surfaceArea) => {
      const result = validateStep(3, makeState({ ...base, surfaceArea }));
      expect(result.valid).toBe(false);
      expect(result.errors.surfaceArea).toBeDefined();
    });
    it.each(['3,5', 'abc', '-1'])('rejects room count %p', (roomCount) => {
      const result = validateStep(3, makeState({ ...base, roomCount }));
      expect(result.valid).toBe(false);
      expect(result.errors.roomCount).toBeDefined();
    });
    it('accepts 0 room (terrain, cave)', () => {
      expect(validateStep(3, makeState({ ...base, roomCount: '0' })).valid).toBe(true);
    });
  });

  describe('step 7 (diagnostics)', () => {
    it('fails when no product is selected', () => {
      const result = validateStep(7, makeState());
      expect(result.valid).toBe(false);
      expect(result.errors.selectedProductIds).toBe('Sélectionnez au moins un diagnostic.');
    });
    it('passes with at least one selected product', () => {
      expect(validateStep(7, makeState({ selectedProductIds: ['p1'] })).valid).toBe(true);
    });
  });

  describe('step 4 (année)', () => {
    it('fails when neither exactYear nor yearRange is set', () => {
      expect(validateStep(4, makeState()).valid).toBe(false);
    });
    it('fails for invalid exact year (1700)', () => {
      expect(validateStep(4, makeState({ exactYear: '1700' })).valid).toBe(false);
    });
    it('passes for valid exact year', () => {
      expect(validateStep(4, makeState({ exactYear: '1995' })).valid).toBe(true);
    });
    it('passes for valid year range', () => {
      expect(validateStep(4, makeState({ yearRange: '1990_2000' })).valid).toBe(true);
    });
  });

  describe('step 5 (gaz)', () => {
    it('fails when hasGas is null', () => {
      expect(validateStep(5, makeState()).valid).toBe(false);
    });
    it('passes for each gas value', () => {
      expect(validateStep(5, makeState({ hasGas: 'oui' })).valid).toBe(true);
      expect(validateStep(5, makeState({ hasGas: 'non' })).valid).toBe(true);
      expect(validateStep(5, makeState({ hasGas: 'ne_sait_pas' })).valid).toBe(true);
    });
  });

  describe('step 8 (propriétaire)', () => {
    it('fails without ownerType or contactSearch', () => {
      expect(validateStep(8, makeState()).valid).toBe(false);
    });
    it('fails with invalid email', () => {
      expect(
        validateStep(
          8,
          makeState({ ownerType: 'monsieur', contactSearch: 'Jean Dupont', newContactEmail: 'not-an-email' }),
        ).valid,
      ).toBe(false);
    });
    it('requires the company name for a company owner', () => {
      const state = makeState({ ownerType: 'entreprise', contactSearch: 'Jean Dupont' });
      expect(validateStep(8, state).errors).toEqual({ companyName: 'Nom de la société requis' });
      expect(validateStep(8, { ...state, companyName: 'ACME' }).valid).toBe(true);
    });
    it('passes with empty email (optional)', () => {
      expect(
        validateStep(8, makeState({ ownerType: 'monsieur', contactSearch: 'Jean Dupont' })).valid,
      ).toBe(true);
    });
    it('passes with valid email', () => {
      expect(
        validateStep(
          8,
          makeState({
            ownerType: 'monsieur',
            contactSearch: 'Jean Dupont',
            newContactEmail: 'jean@example.com',
          }),
        ).valid,
      ).toBe(true);
    });
  });

  describe('step 9 (adresse)', () => {
    it('fails when addressSameAsProperty is null', () => {
      expect(validateStep(9, makeState()).valid).toBe(false);
    });
    it('passes when the address is the same as the property', () => {
      expect(validateStep(9, makeState({ addressSameAsProperty: true })).valid).toBe(true);
    });
    it('requires the owner address when it differs from the property', () => {
      const result = validateStep(9, makeState({ addressSameAsProperty: false }));
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).sort()).toEqual([
        'newContactAddress',
        'newContactCity',
        'newContactPostalCode',
      ]);
    });
    it('rejects a malformed owner postal code', () => {
      const state = makeState({
        addressSameAsProperty: false,
        newContactAddress: '3 rue Neuve',
        newContactPostalCode: '6900',
        newContactCity: 'Lyon',
      });
      expect(validateStep(9, state).errors).toEqual({
        newContactPostalCode: 'Le code postal doit contenir 5 chiffres.',
      });
      expect(validateStep(9, { ...state, newContactPostalCode: '69001' }).valid).toBe(true);
    });
  });

  describe('step 10 (contact sur site)', () => {
    it('fails without choice', () => {
      expect(validateStep(10, makeState()).valid).toBe(false);
    });
    it('fails for agency_key without agency address', () => {
      expect(validateStep(10, makeState({ onSiteChoice: 'agency_key' })).valid).toBe(false);
    });
    it('passes for agency_key with address', () => {
      expect(
        validateStep(
          10,
          makeState({ onSiteChoice: 'agency_key', onSiteAgencyAddress: '12 rue Test' }),
        ).valid,
      ).toBe(true);
    });
    it('fails for owner without contact name', () => {
      expect(validateStep(10, makeState({ onSiteChoice: 'owner' })).valid).toBe(false);
    });
    it('passes for partner with contact name', () => {
      expect(
        validateStep(10, makeState({ onSiteChoice: 'partner', onSiteContactName: 'Jean' })).valid,
      ).toBe(true);
    });
  });

  describe('step 11 (facturation)', () => {
    it('passes when billingDifferent is false (no billing fields needed)', () => {
      expect(validateStep(11, makeState({ billingDifferent: false })).valid).toBe(true);
    });
    it('fails with invalid billing email', () => {
      expect(
        validateStep(11, makeState({ billingDifferent: true, billingEmail: 'not-valid' })).valid,
      ).toBe(false);
    });
    it('ignores a stale invalid billing email once billing is identical again', () => {
      // Le champ est masqué : il ne doit pas bloquer « Suivant » sans message.
      expect(
        validateStep(11, makeState({ billingDifferent: false, billingEmail: 'abc' })).valid,
      ).toBe(true);
    });
    it('reports the billing email error on its field', () => {
      expect(
        validateStep(11, makeState({ billingDifferent: true, billingEmail: 'abc' })).errors,
      ).toEqual({ billingEmail: 'Adresse email invalide' });
    });
    it('passes with empty or valid billing email', () => {
      expect(
        validateStep(11, makeState({ billingDifferent: true, billingEmail: '' })).valid,
      ).toBe(true);
      expect(
        validateStep(11, makeState({ billingDifferent: true, billingEmail: 'a@b.fr' })).valid,
      ).toBe(true);
    });
  });
});

describe('validateAllSteps', () => {
  function completeState(): WizardState {
    return makeState({
      projectType: 'vente',
      postalCode: '75001',
      address: '12 rue de Paris',
      propertyCity: 'Paris',
      propertyType: 'appartement',
      surfaceArea: '75',
      roomCount: '3',
      exactYear: '1995',
      hasGas: 'non',
      selectedProductIds: ['p1'],
      ownerType: 'monsieur',
      contactSearch: 'Jean Dupont',
      addressSameAsProperty: true,
      onSiteChoice: 'partner',
      onSiteContactName: 'Jean',
    });
  }

  it('returns valid for a complete state', () => {
    expect(validateAllSteps(completeState()).valid).toBe(true);
  });

  it('returns the first invalid step with label', () => {
    const result = validateAllSteps(makeState());
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.firstInvalidStep).toBe(1);
      expect(result.stepLabel).toBe('Type de projet');
    }
  });

  it('refuses a quote without any selected diagnostic', () => {
    const result = validateAllSteps({ ...completeState(), selectedProductIds: [] });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.firstInvalidStep).toBe(7);
      expect(result.stepLabel).toBe('Diagnostics');
    }
  });

  it('detects missing email format at step 8', () => {
    const state = completeState();
    state.newContactEmail = 'broken-email';
    const result = validateAllSteps(state);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.firstInvalidStep).toBe(8);
    }
  });
});

describe('validateStaffPricing', () => {
  it('accepts empty optional fields', () => {
    expect(validateStaffPricing(makeState())).toEqual({ valid: true, errors: {} });
  });
  it('accepts a price and a discount written with a comma', () => {
    expect(
      validateStaffPricing(makeState({ staffFinalPriceTtc: '450,50', staffDiscountPercent: '12,5' }))
        .valid,
    ).toBe(true);
  });
  it.each(['abc', '-10', '12,5,0'])('rejects final price %p', (staffFinalPriceTtc) => {
    expect(validateStaffPricing(makeState({ staffFinalPriceTtc })).errors.staffFinalPriceTtc).toBeDefined();
  });
  it.each(['101', '-1', 'dix'])('rejects discount %p', (staffDiscountPercent) => {
    expect(
      validateStaffPricing(makeState({ staffDiscountPercent })).errors.staffDiscountPercent,
    ).toBeDefined();
  });
  it('accepts the 0 and 100 bounds', () => {
    expect(validateStaffPricing(makeState({ staffDiscountPercent: '0' })).valid).toBe(true);
    expect(validateStaffPricing(makeState({ staffDiscountPercent: '100' })).valid).toBe(true);
  });
});
