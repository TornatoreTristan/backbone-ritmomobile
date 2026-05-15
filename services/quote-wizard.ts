import { apiRequest } from '@/services/api';
import type { WizardState } from '@/contexts/quote-wizard-context';

export type ProjectType =
  | 'vente'
  | 'location'
  | 'avant_travaux'
  | 'avant_demolition'
  | 'gestion_locative';

export type PropertyType = string;

export type TransactionType = 'vente' | 'location' | 'travaux';

export type YearRange =
  | 'avant_1949'
  | '1949_1974'
  | '1975_1989'
  | '1990_2000'
  | '2001_2010'
  | '2011_2020'
  | 'apres_2020';

export type GasState = 'oui' | 'non' | 'ne_sait_pas';

export type OwnershipType = 'individuel' | 'copropriete' | string;

export type BdnbBuilding = {
  constructionYear: number | null;
  surfaceArea: number | null;
  buildingType: string | null;
  numberOfFloors: number | null;
  hasGas: boolean | null;
  latitude: number | null;
  longitude: number | null;
};

export type BdnbSearchResult = { building: BdnbBuilding | null };

export type SuggestedProduct = {
  product: {
    id: string;
    nameI18n: { fr: string; en?: string };
    descriptionI18n?: { fr?: string; en?: string };
    iconUrl?: string | null;
  };
  result: 'obligatoire' | 'facultatif';
  priceHt: number;
  priceTtc: number;
  pricingSource: 'grid' | 'fixed';
};

export type SuggestionsResult = {
  obligatoire: SuggestedProduct[];
  facultatif: SuggestedProduct[];
};

export type GridTotalResult = {
  priceHt?: number;
  priceTtc?: number;
  diagnosticCount?: number;
  gridName?: string | null;
  zoneName?: string | null;
};

export const PROJECT_TYPE_TO_TRANSACTION: Record<ProjectType, TransactionType> = {
  vente: 'vente',
  location: 'location',
  avant_travaux: 'travaux',
  avant_demolition: 'travaux',
  gestion_locative: 'location',
};

export const YEAR_RANGE_MAP: Record<YearRange, number> = {
  avant_1949: 1948,
  '1949_1974': 1965,
  '1975_1989': 1980,
  '1990_2000': 1995,
  '2001_2010': 2005,
  '2011_2020': 2015,
  apres_2020: 2021,
};

export function normalizePropertyType(propertyType: string): string {
  if (propertyType === 'local_bureau') return 'local_commercial';
  return propertyType;
}

type BdnbSearchPayload = {
  address: string;
  postalCode: string;
  city?: string;
};

type BdnbSearchResponse = {
  success: true;
  data: BdnbSearchResult;
};

export async function bdnbSearch(payload: BdnbSearchPayload): Promise<BdnbSearchResult> {
  const response = await apiRequest<BdnbSearchResponse>(
    '/api/v1/folders/wizard/bdnb-search',
    { method: 'POST', body: payload },
  );
  return response.data;
}

type SuggestPayload = {
  postalCode: string;
  propertyType: string;
  transactionType: TransactionType;
  constructionYear: number | null;
  surfaceArea: number | null;
  hasGas: boolean;
  hasElectricity?: boolean;
};

type SuggestResponse = {
  success: true;
  data: SuggestionsResult;
};

export async function suggestDiagnostics(payload: SuggestPayload): Promise<SuggestionsResult> {
  const response = await apiRequest<SuggestResponse>(
    '/api/v1/folders/wizard/suggest',
    { method: 'POST', body: payload },
  );
  return response.data;
}

type GridTotalPayload = {
  postalCode: string;
  propertyType: string;
  diagnosticCount: number;
  surfaceArea?: number;
  gridCategory?: string;
};

type GridTotalResponse = {
  success: true;
  data: GridTotalResult;
};

export async function calculateGridTotal(payload: GridTotalPayload): Promise<GridTotalResult> {
  const response = await apiRequest<GridTotalResponse>(
    '/api/v1/folders/wizard/calculate-grid-total',
    { method: 'POST', body: payload },
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// Submit wizard
// ---------------------------------------------------------------------------

export type WizardSubmitPayload = {
  projectType: string;
  postalCode: string;
  address: string | null;
  city: string | null;
  residenceName: string | null;
  propertyType: string;
  ownershipType: string | null;
  constructionYear: number | null;
  surfaceArea: number | null;
  roomCount: number | null;
  hasGas?: boolean;
  accessConditions: string | null;
  dependances?: { nom: string; superficie: string | null }[];
  contactId?: string | null;
  ownerType: string | null;
  companyName: string | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  clientCity: string | null;
  clientPostalCode: string | null;
  onSiteContactName: string | null;
  onSiteContactPhone: string | null;
  onSiteAgencyAddress: string | null;
  billingDifferent?: boolean;
  billingCompanyName: string | null;
  billingFirstName: string | null;
  billingLastName: string | null;
  billingEmail: string | null;
  billingPhone: string | null;
  billingAddress: string | null;
  billingPostalCode: string | null;
  billingCity: string | null;
  items: {
    productId: string | null;
    nameI18n: { fr: string; en?: string };
    quantity: number;
    unitPriceHt: number;
    unitPriceTtc: number;
    supplementHt?: number;
    supplementTtc?: number;
  }[];
  clientComments: string | null;
  sendQuoteToClient: boolean;
};

export type WizardSubmitResult = {
  folderId: string;
  reference: string;
  status: 'lead';
  leadId: string | null;
  contactId: string | null;
  finalPriceTtc: number;
  quoteEmailSent?: boolean;
};

type WizardSubmitResponse = {
  success: true;
  data: WizardSubmitResult;
};

export async function submitQuoteWizard(
  payload: WizardSubmitPayload,
): Promise<WizardSubmitResult> {
  const response = await apiRequest<WizardSubmitResponse>(
    '/api/v1/folders/wizard/submit',
    { method: 'POST', body: payload },
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// Build payload from wizard state
// ---------------------------------------------------------------------------

function nullIfEmpty(s: string): string | null {
  return s.trim() === '' ? null : s.trim();
}

export function buildSubmitPayload(
  state: WizardState,
  user: { fullName?: string | null; email?: string | null },
  sendQuoteToClient: boolean,
): WizardSubmitPayload {
  const exactYearNum = state.exactYear.trim()
    ? parseInt(state.exactYear.trim(), 10)
    : null;
  const constructionYear =
    exactYearNum ??
    (state.yearRange ? YEAR_RANGE_MAP[state.yearRange] : null);

  const surfaceArea = state.surfaceArea.trim()
    ? parseFloat(state.surfaceArea.trim())
    : null;
  const roomCount = state.roomCount.trim()
    ? parseInt(state.roomCount.trim(), 10)
    : null;

  let hasGas: boolean | undefined;
  if (state.hasGas === 'oui') hasGas = true;
  else if (state.hasGas === 'non') hasGas = false;
  // 'ne_sait_pas' → omit (undefined)

  const allSuggestions = [...state.suggestionsObligatoire, ...state.suggestionsFacultatif];
  const selectedSuggestions = state.selectedProductIds
    .map((id) => allSuggestions.find((s) => s.product.id === id))
    .filter((s): s is SuggestedProduct => s !== undefined);

  const gridItemCount = selectedSuggestions.filter((s) => s.pricingSource === 'grid').length;
  const hasGridTotal = !!state.gridTotal && (state.gridTotal.priceTtc ?? 0) > 0;
  const gridPerItemHt =
    hasGridTotal && gridItemCount > 0 ? (state.gridTotal!.priceHt ?? 0) / gridItemCount : 0;
  const gridPerItemTtc =
    hasGridTotal && gridItemCount > 0 ? (state.gridTotal!.priceTtc ?? 0) / gridItemCount : 0;

  const items = selectedSuggestions.map((suggestion) => {
    const isGrid = suggestion.pricingSource === 'grid' && hasGridTotal;
    return {
      productId: suggestion.product.id,
      nameI18n: suggestion.product.nameI18n,
      quantity: 1,
      unitPriceHt: isGrid ? gridPerItemHt : suggestion.priceHt,
      unitPriceTtc: isGrid ? gridPerItemTtc : suggestion.priceTtc,
      supplementHt: 0,
      supplementTtc: 0,
    };
  });

  const dependances = state.dependances
    .filter((d) => d.nom.trim() !== '')
    .map((d) => ({
      nom: d.nom.trim(),
      superficie: nullIfEmpty(d.superficie),
    }));

  const clientAddress = state.addressSameAsProperty
    ? nullIfEmpty(state.address)
    : nullIfEmpty(state.newContactAddress);
  const clientPostalCode = state.addressSameAsProperty
    ? nullIfEmpty(state.postalCode)
    : nullIfEmpty(state.newContactPostalCode);
  const clientCity = state.addressSameAsProperty
    ? nullIfEmpty(state.propertyCity)
    : nullIfEmpty(state.newContactCity);

  if (!state.projectType) {
    throw new Error('projectType is required to build submit payload');
  }
  const transactionType: TransactionType = PROJECT_TYPE_TO_TRANSACTION[state.projectType];

  return {
    projectType: transactionType,
    postalCode: state.postalCode,
    address: nullIfEmpty(state.address),
    city: nullIfEmpty(state.propertyCity),
    residenceName: nullIfEmpty(state.residenceName),
    propertyType: normalizePropertyType(state.propertyType ?? ''),
    ownershipType: state.ownershipType ?? null,
    constructionYear,
    surfaceArea,
    roomCount,
    ...(hasGas !== undefined ? { hasGas } : {}),
    accessConditions: nullIfEmpty(state.accessConditions),
    dependances,
    ownerType: state.ownerType ?? null,
    companyName:
      state.ownerType === 'entreprise' ? nullIfEmpty(state.companyName) : null,
    clientName: state.contactSearch.trim(),
    clientEmail: nullIfEmpty(state.newContactEmail),
    clientPhone: nullIfEmpty(state.newContactPhone),
    clientAddress,
    clientPostalCode,
    clientCity,
    onSiteContactName: nullIfEmpty(state.onSiteContactName),
    onSiteContactPhone: nullIfEmpty(state.onSiteContactPhone),
    onSiteAgencyAddress: nullIfEmpty(state.onSiteAgencyAddress),
    billingDifferent: state.billingDifferent,
    billingCompanyName: state.billingDifferent ? nullIfEmpty(state.billingCompanyName) : null,
    billingFirstName: state.billingDifferent ? nullIfEmpty(state.billingFirstName) : null,
    billingLastName: state.billingDifferent ? nullIfEmpty(state.billingLastName) : null,
    billingEmail: state.billingDifferent ? nullIfEmpty(state.billingEmail) : null,
    billingPhone: state.billingDifferent ? nullIfEmpty(state.billingPhone) : null,
    billingAddress: state.billingDifferent ? nullIfEmpty(state.billingAddress) : null,
    billingPostalCode: state.billingDifferent ? nullIfEmpty(state.billingPostalCode) : null,
    billingCity: state.billingDifferent ? nullIfEmpty(state.billingCity) : null,
    items,
    clientComments: nullIfEmpty(state.clientComments),
    sendQuoteToClient,
  };
}
