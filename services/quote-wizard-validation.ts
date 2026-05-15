import * as v from 'valibot';
import type { WizardState } from '@/contexts/quote-wizard-context';

const CURRENT_YEAR = new Date().getFullYear();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_CODE_REGEX = /^\d{5}$/;

const projectTypeValues = [
  'vente',
  'location',
  'avant_travaux',
  'avant_demolition',
  'gestion_locative',
] as const;

const yearRangeValues = [
  'avant_1949',
  '1949_1974',
  '1975_1989',
  '1990_2000',
  '2001_2010',
  '2011_2020',
  'apres_2020',
] as const;

const gasValues = ['oui', 'non', 'ne_sait_pas'] as const;

const onSiteValues = ['partner', 'owner', 'other', 'agency_key'] as const;

const nonEmpty = (msg: string) =>
  v.pipe(
    v.string(),
    v.check((s) => s.trim().length > 0, msg),
  );

const optionalEmail = v.pipe(
  v.string(),
  v.check((s) => s.trim() === '' || EMAIL_REGEX.test(s.trim()), 'Adresse email invalide'),
);

const exactYearOrEmpty = v.pipe(
  v.string(),
  v.check((s) => {
    const trimmed = s.trim();
    if (trimmed === '') return true;
    if (trimmed.length !== 4) return false;
    const num = parseInt(trimmed, 10);
    return !isNaN(num) && num >= 1800 && num <= CURRENT_YEAR;
  }, `Saisissez une année entre 1800 et ${CURRENT_YEAR}.`),
);

const step1Schema = v.looseObject({
  projectType: v.picklist(projectTypeValues, 'Type de projet requis'),
});

const step2Schema = v.looseObject({
  postalCode: v.pipe(
    v.string(),
    v.regex(POSTAL_CODE_REGEX, 'Le code postal doit contenir 5 chiffres.'),
  ),
  address: nonEmpty('Adresse requise'),
  propertyCity: nonEmpty('Ville requise'),
});

const step3Schema = v.pipe(
  v.looseObject({
    propertyType: nonEmpty('Type de bien requis'),
    surfaceArea: nonEmpty('Surface requise'),
    roomCount: nonEmpty('Nombre de pièces requis'),
    ownershipType: v.nullable(v.string()),
  }),
  v.check(
    (s) => s.propertyType !== 'maison' || s.ownershipType !== null,
    'Type de propriété requis pour une maison',
  ),
);

const step4Schema = v.pipe(
  v.looseObject({
    exactYear: exactYearOrEmpty,
    yearRange: v.nullable(v.picklist(yearRangeValues)),
  }),
  v.check(
    (s) => s.exactYear.trim().length === 4 || s.yearRange !== null,
    'Année ou tranche requise',
  ),
);

const step5Schema = v.looseObject({
  hasGas: v.picklist(gasValues, 'Réponse requise'),
});

const step6Schema = v.looseObject({});

const step7Schema = v.looseObject({});

const step8Schema = v.looseObject({
  ownerType: nonEmpty('Civilité requise'),
  contactSearch: nonEmpty('Nom du propriétaire requis'),
  newContactEmail: optionalEmail,
});

const step9Schema = v.looseObject({
  addressSameAsProperty: v.union([v.literal(true), v.literal(false)], 'Réponse requise'),
});

const step10Schema = v.pipe(
  v.looseObject({
    onSiteChoice: v.picklist(onSiteValues, 'Réponse requise'),
    onSiteContactName: v.string(),
    onSiteAgencyAddress: v.string(),
  }),
  v.check((s) => {
    if (s.onSiteChoice === 'agency_key') return s.onSiteAgencyAddress.trim() !== '';
    return s.onSiteContactName.trim() !== '';
  }, 'Contact requis'),
);

const step11Schema = v.looseObject({
  billingEmail: optionalEmail,
});

const STEP_SCHEMAS: Record<number, v.GenericSchema<WizardState>> = {
  1: step1Schema as unknown as v.GenericSchema<WizardState>,
  2: step2Schema as unknown as v.GenericSchema<WizardState>,
  3: step3Schema as unknown as v.GenericSchema<WizardState>,
  4: step4Schema as unknown as v.GenericSchema<WizardState>,
  5: step5Schema as unknown as v.GenericSchema<WizardState>,
  6: step6Schema as unknown as v.GenericSchema<WizardState>,
  7: step7Schema as unknown as v.GenericSchema<WizardState>,
  8: step8Schema as unknown as v.GenericSchema<WizardState>,
  9: step9Schema as unknown as v.GenericSchema<WizardState>,
  10: step10Schema as unknown as v.GenericSchema<WizardState>,
  11: step11Schema as unknown as v.GenericSchema<WizardState>,
  12: step11Schema as unknown as v.GenericSchema<WizardState>,
};

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

export function validateStep(step: number, state: WizardState): ValidationResult {
  const schema = STEP_SCHEMAS[step];
  if (!schema) return { valid: true, errors: {} };
  const result = v.safeParse(schema, state);
  if (result.success) return { valid: true, errors: {} };

  const errors: Record<string, string> = {};
  for (const issue of result.issues) {
    const path = issue.path?.map((p) => p.key).join('.') ?? '_root';
    const key = path || '_root';
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return { valid: false, errors };
}

const STEP_LABELS: Record<number, string> = {
  1: 'Type de projet',
  2: 'Localisation',
  3: 'Bien immobilier',
  4: 'Année de construction',
  5: 'Installation gaz',
  6: 'Dépendances',
  7: 'Diagnostics',
  8: 'Propriétaire',
  9: 'Adresse du propriétaire',
  10: 'Contact sur site',
  11: 'Facturation',
};

export type AllStepsValidation =
  | { valid: true }
  | { valid: false; firstInvalidStep: number; stepLabel: string; errors: Record<string, string> };

export function validateAllSteps(state: WizardState): AllStepsValidation {
  for (const step of [1, 2, 3, 4, 5, 8, 9, 10, 11]) {
    const result = validateStep(step, state);
    if (!result.valid) {
      return {
        valid: false,
        firstInvalidStep: step,
        stepLabel: STEP_LABELS[step] ?? `Étape ${step}`,
        errors: result.errors,
      };
    }
  }
  return { valid: true };
}
