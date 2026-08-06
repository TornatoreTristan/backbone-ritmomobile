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

/** Catégorie de grille tarifaire côté backend (`GRID_CATEGORIES`). */
export type GridCategory = 'standard' | 'gestion_locative';

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
    /**
     * Supplément facturé en plus du prix de la ligne (surface, déplacement…).
     * Renvoyé par l'API sur chaque produit ; il s'ajoute au total quelle que
     * soit la tarification (grille ou fixe) et n'est jamais couvert par le
     * forfait gestion locative.
     */
    priceSupplementHt?: number | null;
    priceSupplementTtc?: number | null;
    supplementLabel?: string | null;
    /**
     * Nature tarifaire du produit en base. C'est le SEUL critère fiable pour
     * savoir si une prestation relève de la grille : c'est celui qu'utilise le
     * serveur pour retarifer (`collectGridDiagnosticItems`). Voir `isGridDiagnostic`.
     */
    pricingType?: 'grid' | 'fixed';
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

/**
 * La gestion locative se tarife sur une grille dédiée (forfaitaire, sans zone ni
 * tranche de surface). Le backend retombe sur la grille `standard` dès que la
 * catégorie n'est pas transmise, et `projectType` ne suffit pas à la déduire
 * puisqu'il est aplati en `location` — d'où ce champ explicite, à joindre à
 * TOUS les appels tarifaires (calcul du total ET soumission).
 */
export function gridCategoryFor(projectType: ProjectType | null): GridCategory | undefined {
  return projectType === 'gestion_locative' ? 'gestion_locative' : undefined;
}

/**
 * Une prestation relève-t-elle de la grille tarifaire ?
 *
 * Se fier à `pricingSource` est un piège : le serveur le met à `'fixed'` quand
 * la recherche en grille échoue (zone absente, tranche de surface non couverte),
 * en renvoyant `product.priceHt/priceTtc` — or ceux-ci valent toujours `null`
 * pour un produit grille, donc 0 €. Un diagnostic grille arrive alors ici
 * déguisé en prestation à prix fixe gratuite : exclu du palier, ajouté à 0 €,
 * et le blocage anti-devis-à-0 ne se déclenche pas.
 *
 * `product.pricingType` est la nature réelle du produit et c'est exactement le
 * critère qu'applique le serveur pour retarifer (`collectGridDiagnosticItems`).
 * S'aligner dessus garantit que client et serveur tarifent le même ensemble.
 */
export function isGridDiagnostic(suggestion: SuggestedProduct): boolean {
  return (suggestion.product.pricingType ?? suggestion.pricingSource) === 'grid';
}

/**
 * Total des suppléments TTC d'une sélection. Ils s'ajoutent au prix de grille ET
 * aux prix fixes, y compris en gestion locative — même règle que le wizard web
 * (`calculateSupplements`, sans garde `isGestionLocative`).
 */
export function sumSupplementsTtc(suggestions: SuggestedProduct[]): number {
  return suggestions.reduce((sum, s) => sum + (s.product.priceSupplementTtc ?? 0), 0);
}

/**
 * Nombre de diagnostics à envoyer à `calculate-grid-total`.
 *
 * La grille ne tarife QUE les diagnostics grille (cf. `isGridDiagnostic`) : inclure un
 * produit obligatoire à prix fixe (ERP, prélèvement…) fait basculer le calcul
 * sur le palier supérieur de la grille, et ce produit est en plus facturé à son
 * prix propre dans `selectQuoteTotals` — donc double comptage. C'est exactement
 * le `countGridProducts` du wizard web ; ne jamais compter autre chose ici.
 */
export function countGridDiagnostics(
  suggestions: SuggestedProduct[],
  selectedProductIds: string[],
): number {
  return suggestions.filter(
    (s) => isGridDiagnostic(s) && selectedProductIds.includes(s.product.id),
  ).length;
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

export async function bdnbSearch(payload: BdnbSearchPayload, orgId?: string): Promise<BdnbSearchResult> {
  const endpoint = orgId
    ? `/api/v1/organizations/${orgId}/folders/wizard/bdnb-search`
    : '/api/v1/folders/wizard/bdnb-search';
  const response = await apiRequest<BdnbSearchResponse>(endpoint, { method: 'POST', body: payload });
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

export async function suggestDiagnostics(payload: SuggestPayload, orgId?: string): Promise<SuggestionsResult> {
  const endpoint = orgId
    ? `/api/v1/organizations/${orgId}/folders/wizard/suggest`
    : '/api/v1/folders/wizard/suggest';
  const response = await apiRequest<SuggestResponse>(endpoint, { method: 'POST', body: payload });
  return response.data;
}

type GridTotalPayload = {
  postalCode: string;
  propertyType: string;
  diagnosticCount: number;
  surfaceArea?: number;
  gridCategory?: GridCategory;
};

type GridTotalResponse = {
  success: true;
  data: GridTotalResult;
};

export async function calculateGridTotal(payload: GridTotalPayload, orgId?: string): Promise<GridTotalResult> {
  const endpoint = orgId
    ? `/api/v1/organizations/${orgId}/folders/wizard/calculate-grid-total`
    : '/api/v1/folders/wizard/calculate-grid-total';
  const response = await apiRequest<GridTotalResponse>(endpoint, { method: 'POST', body: payload });
  return response.data;
}

// ---------------------------------------------------------------------------
// Submit wizard
// ---------------------------------------------------------------------------

export type WizardSubmitPayload = {
  projectType: string;
  /**
   * Transmis uniquement en gestion locative. Le serveur retarife les diagnostics
   * depuis la grille avant de créer le dossier : sans cette catégorie il utilise
   * la grille standard et écrase les prix calculés ici.
   */
  gridCategory?: GridCategory;
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
    supplementLabel?: string | null;
  }[];
  clientComments: string | null;
  sendQuoteToClient: boolean;

  // Staff-only optional fields
  originalPriceTtc?: number | null;
  finalPriceTtc?: number | null;
  discountPercent?: number | null;
  rdvDate?: string | null;
  rdvDuration?: number | null;
  technicians?: string[];
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

export type StaffWizardSubmitResult = {
  id: string;
  reference: string;
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

type StaffWizardSubmitResponse = {
  success: true;
  data: StaffWizardSubmitResult;
};

export async function submitStaffQuoteWizard(
  orgId: string,
  payload: WizardSubmitPayload,
): Promise<StaffWizardSubmitResult> {
  const response = await apiRequest<StaffWizardSubmitResponse>(
    `/api/v1/organizations/${orgId}/folders/wizard`,
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

function nullableFloat(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === '') return null;
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? null : parsed;
}

function nullableInt(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === '') return null;
  const parsed = parseInt(trimmed, 10);
  return isNaN(parsed) ? null : parsed;
}

export function buildSubmitPayload(
  state: WizardState,
  user: { fullName?: string | null; email?: string | null },
  sendQuoteToClient: boolean,
  staffMode = false,
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

  const gridItemCount = selectedSuggestions.filter(isGridDiagnostic).length;
  const hasGridTotal = !!state.gridTotal && (state.gridTotal.priceTtc ?? 0) > 0;
  const gridPerItemHt =
    hasGridTotal && gridItemCount > 0 ? (state.gridTotal!.priceHt ?? 0) / gridItemCount : 0;
  const gridPerItemTtc =
    hasGridTotal && gridItemCount > 0 ? (state.gridTotal!.priceTtc ?? 0) / gridItemCount : 0;

  const items = selectedSuggestions.map((suggestion) => {
    const isGrid = isGridDiagnostic(suggestion) && hasGridTotal;
    return {
      productId: suggestion.product.id,
      nameI18n: suggestion.product.nameI18n,
      quantity: 1,
      // Les diagnostics grille se partagent le forfait ; les prestations à prix
      // fixe gardent leur prix.
      unitPriceHt: isGrid ? gridPerItemHt : suggestion.priceHt,
      unitPriceTtc: isGrid ? gridPerItemTtc : suggestion.priceTtc,
      // Le supplément se facture en plus du prix de ligne, y compris quand la
      // ligne est couverte par le forfait gestion locative.
      supplementHt: suggestion.product.priceSupplementHt ?? 0,
      supplementTtc: suggestion.product.priceSupplementTtc ?? 0,
      supplementLabel: suggestion.product.supplementLabel ?? null,
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

  const gridCategory = gridCategoryFor(state.projectType);

  return {
    projectType: transactionType,
    ...(gridCategory ? { gridCategory } : {}),
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
    ...(staffMode
      ? {
          originalPriceTtc: nullableFloat(state.staffOriginalPriceTtc),
          finalPriceTtc: nullableFloat(state.staffFinalPriceTtc),
          discountPercent: nullableFloat(state.staffDiscountPercent),
          rdvDate: state.staffRdvDate ?? null,
          rdvDuration: nullableInt(state.staffRdvDurationMinutes),
          technicians: state.staffTechnicianIds.length > 0 ? state.staffTechnicianIds : undefined,
        }
      : {}),
  };
}
