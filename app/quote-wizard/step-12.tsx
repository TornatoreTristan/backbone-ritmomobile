import { ThemedText } from '@/components/themed-text';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { Radius, type ColorTokens } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { selectQuoteTotals, useQuoteWizard } from '@/contexts/quote-wizard-context';
import { useColors } from '@/hooks/use-theme-color';
import {
  buildSubmitPayload,
  submitQuoteWizard,
  submitStaffQuoteWizard,
} from '@/services/quote-wizard';
import { validateAllSteps } from '@/services/quote-wizard-validation';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const PROJECT_TYPE_LABELS: Record<string, string> = {
  vente: 'Vente',
  location: 'Location',
  avant_travaux: 'Avant travaux',
  avant_demolition: 'Avant démolition',
  gestion_locative: 'Gestion locative',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  appartement: 'Appartement',
  maison: 'Maison',
  immeuble: 'Immeuble',
  local_commercial: 'Local commercial',
  local_bureau: 'Local bureau',
  terrain: 'Terrain',
  cave: 'Cave',
  grange: 'Grange',
  other: 'Autre',
};

const OWNERSHIP_TYPE_LABELS: Record<string, string> = {
  individuel: 'Individuel',
  copropriete: 'Copropriété',
};

const OWNER_TYPE_LABELS: Record<string, string> = {
  monsieur: 'Monsieur',
  madame: 'Madame',
  monsieur_madame: 'Monsieur et Madame',
  entreprise: 'Entreprise',
  autre: 'Autre',
};

const GAS_LABELS: Record<string, string> = {
  oui: 'Oui',
  non: 'Non',
  ne_sait_pas: 'Je ne sais pas',
};

const ON_SITE_LABELS: Record<string, string> = {
  partner: 'Moi (le partenaire)',
  owner: 'Le propriétaire',
  agency_key: "Clé chez l'agence",
  other: 'Une autre personne',
};

const YEAR_RANGE_LABELS: Record<string, string> = {
  avant_1949: 'Avant 1949',
  '1949_1974': '1949 – 1974',
  '1975_1989': '1975 – 1989',
  '1990_2000': '1990 – 2000',
  '2001_2010': '2001 – 2010',
  '2011_2020': '2011 – 2020',
  apres_2020: 'Après 2020',
};

function dash(value: string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const trimmed = typeof value === 'string' ? value.trim() : String(value);
  return trimmed === '' ? '—' : trimmed;
}

interface SectionProps {
  title: string;
  colors: ColorTokens;
  children: React.ReactNode;
}

function Section({ title, colors, children }: SectionProps) {
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
      <ThemedText style={styles.cardTitle}>{title}</ThemedText>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      {children}
    </View>
  );
}

interface RowProps {
  label: string;
  value: string;
}

function Row({ label, value }: RowProps) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText style={styles.rowValue}>{value}</ThemedText>
    </View>
  );
}

export default function Step12Screen() {
  const router = useRouter();
  const { state, update, resetAndClear } = useQuoteWizard();
  const { user } = useAuth();
  const { isStaff, currentOrganization } = useOrganization();
  const colors = useColors();

  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totals = selectQuoteTotals(state);

  const yearDisplay = state.exactYear.trim()
    ? state.exactYear.trim()
    : state.yearRange
      ? (YEAR_RANGE_LABELS[state.yearRange] ?? state.yearRange)
      : null;

  const clientEmail = state.newContactEmail.trim();
  const hasClientEmail = clientEmail !== '';

  async function submitStaffFolder() {
    if (!currentOrganization) {
      setSubmitError("Aucune organisation sélectionnée. Impossible de créer le dossier.");
      return;
    }
    setSubmitError(null);
    const overallValidation = validateAllSteps(state);
    if (!overallValidation.valid) {
      setSubmitError(
        `Informations manquantes ou invalides à l'étape « ${overallValidation.stepLabel} ». Veuillez vérifier avant de soumettre.`,
      );
      return;
    }
    setIsLoading(true);
    try {
      const payload = buildSubmitPayload(
        state,
        { fullName: user?.fullName, email: user?.email },
        false,
        true,
      );
      const result = await submitStaffQuoteWizard(currentOrganization.id, payload);
      Alert.alert(
        'Dossier créé',
        `Référence : ${result.reference}`,
        [
          {
            text: 'OK',
            onPress: async () => {
              await resetAndClear();
              router.dismissAll();
              router.replace(`/folders/${result.id}` as never);
            },
          },
        ],
        { cancelable: false },
      );
    } catch (err: unknown) {
      let message = 'Une erreur est survenue. Veuillez réessayer.';
      if (err instanceof Error && err.message) {
        message = err.message;
      }
      setSubmitError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function submitPartnerFolder(sendQuoteToClient: boolean) {
    setSubmitError(null);
    const overallValidation = validateAllSteps(state);
    if (!overallValidation.valid) {
      setSubmitError(
        `Informations manquantes ou invalides à l'étape « ${overallValidation.stepLabel} ». Veuillez vérifier avant de soumettre.`,
      );
      return;
    }
    setIsLoading(true);
    try {
      const payload = buildSubmitPayload(
        state,
        { fullName: user?.fullName, email: user?.email },
        sendQuoteToClient,
      );
      const result = await submitQuoteWizard(payload);
      const successMessage =
        sendQuoteToClient && result.quoteEmailSent
          ? `Référence : ${result.reference}\nLe devis a été envoyé au client.`
          : `Référence : ${result.reference}`;
      Alert.alert(
        'Dossier créé',
        successMessage,
        [
          {
            text: 'OK',
            onPress: async () => {
              await resetAndClear();
              router.dismissAll();
              router.replace('/');
            },
          },
        ],
        { cancelable: false },
      );
    } catch (err: unknown) {
      let message = 'Une erreur est survenue. Veuillez réessayer.';
      if (err instanceof Error && err.message) {
        message = err.message;
      }
      setSubmitError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit() {
    if (isStaff) {
      submitStaffFolder();
      return;
    }
    if (!hasClientEmail) {
      submitPartnerFolder(false);
      return;
    }
    Alert.alert(
      'Envoyer le devis au client ?',
      `Un email avec le devis sera envoyé à ${clientEmail}.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Sans envoi', onPress: () => submitPartnerFolder(false) },
        { text: 'Envoyer', style: 'default', onPress: () => submitPartnerFolder(true) },
      ],
    );
  }

  return (
    <>
      <WizardScreen
        title="Récapitulatif"
        subtitle="Vérifiez les informations avant de créer le dossier.">
        {submitError ? (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.destructive + '18',
                borderColor: colors.destructive,
              },
            ]}>
            <ThemedText style={[styles.errorBannerText, { color: colors.destructive }]}>
              {submitError}
            </ThemedText>
          </View>
        ) : null}

        <Section title="Diagnostics sélectionnés" colors={colors}>
          {totals.selected.length === 0 ? (
            <ThemedText style={styles.rowValue}>Aucun</ThemedText>
          ) : (
            <View style={styles.diagnosticList}>
              {totals.selected.map((s) => {
                const name = s.product.nameI18n.fr || s.product.nameI18n.en || 'Produit';
                const iconUrl = s.product.iconUrl || null;
                return (
                  <View key={s.product.id} style={styles.diagnosticItem}>
                    {iconUrl ? (
                      <Image
                        source={{ uri: iconUrl }}
                        style={styles.diagnosticIcon}
                        resizeMode="contain"
                        accessibilityIgnoresInvertColors
                      />
                    ) : (
                      <View
                        style={[
                          styles.diagnosticIcon,
                          styles.diagnosticIconFallback,
                          { borderColor: colors.border },
                        ]}
                      />
                    )}
                    <ThemedText style={styles.diagnosticName} numberOfLines={2}>
                      {name}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.totalTtcRow}>
            <ThemedText style={[styles.rowLabel, styles.totalTtcLabel]}>Total TTC</ThemedText>
            <ThemedText style={[styles.rowValue, styles.totalTtcValue, { color: colors.foreground }]}>
              {priceFormatter.format(totals.totalTtc)}
            </ThemedText>
          </View>
        </Section>

        <Section title="Projet" colors={colors}>
          <Row
            label="Type de projet"
            value={dash(state.projectType ? PROJECT_TYPE_LABELS[state.projectType] : null)}
          />
          <Row
            label="Type de bien"
            value={dash(state.propertyType ? PROPERTY_TYPE_LABELS[state.propertyType] : null)}
          />
        </Section>

        <Section title="Localisation du bien" colors={colors}>
          <Row label="Adresse" value={dash(state.address)} />
          <Row label="Code postal" value={dash(state.postalCode)} />
          <Row label="Ville" value={dash(state.propertyCity)} />
        </Section>

        <Section title="Caractéristiques du bien" colors={colors}>
          <Row
            label="Surface"
            value={state.surfaceArea.trim() ? `${state.surfaceArea.trim()} m²` : '—'}
          />
          <Row label="Nb. pièces" value={dash(state.roomCount)} />
          {state.propertyType === 'appartement' ? (
            <>
              <Row label="Étage" value={dash(state.floor)} />
              <Row label="Porte" value={dash(state.door)} />
              <Row label="N° de lot" value={dash(state.lotNumber)} />
            </>
          ) : null}
          {state.propertyType === 'maison' && state.ownershipType ? (
            <Row
              label="Type de propriété"
              value={OWNERSHIP_TYPE_LABELS[state.ownershipType] ?? state.ownershipType}
            />
          ) : null}
        </Section>

        <Section title="Année de construction" colors={colors}>
          <Row label="Année" value={dash(yearDisplay)} />
        </Section>

        <Section title="Présence de gaz" colors={colors}>
          <Row
            label="Gaz"
            value={state.hasGas ? (GAS_LABELS[state.hasGas] ?? state.hasGas) : '—'}
          />
        </Section>

        <Section title="Dépendances" colors={colors}>
          {state.dependances.filter((d) => d.nom.trim() !== '').length === 0 ? (
            <ThemedText style={styles.rowValue}>Aucune</ThemedText>
          ) : (
            state.dependances
              .filter((d) => d.nom.trim() !== '')
              .map((d) => (
                <Row
                  key={d.id}
                  label={d.nom}
                  value={d.superficie.trim() ? `${d.superficie.trim()} m²` : '—'}
                />
              ))
          )}
        </Section>

        <Section title="Propriétaire" colors={colors}>
          <Row
            label="Civilité"
            value={state.ownerType ? (OWNER_TYPE_LABELS[state.ownerType] ?? state.ownerType) : '—'}
          />
          {state.ownerType === 'entreprise' ? (
            <Row label="Société" value={dash(state.companyName)} />
          ) : null}
          <Row label="Nom complet" value={dash(state.contactSearch)} />
          <Row label="Email" value={dash(state.newContactEmail)} />
          <Row label="Téléphone" value={dash(state.newContactPhone)} />
        </Section>

        <Section title="Adresse du propriétaire" colors={colors}>
          <Row
            label="Adresse"
            value={
              state.addressSameAsProperty ? 'Identique au bien' : dash(state.newContactAddress)
            }
          />
          {!state.addressSameAsProperty ? (
            <>
              <Row label="Code postal" value={dash(state.newContactPostalCode)} />
              <Row label="Ville" value={dash(state.newContactCity)} />
            </>
          ) : null}
          {state.residenceName.trim() !== '' ? (
            <Row label="Résidence" value={state.residenceName.trim()} />
          ) : null}
        </Section>

        <Section title="Contact sur site" colors={colors}>
          <Row
            label="Qui"
            value={
              state.onSiteChoice ? (ON_SITE_LABELS[state.onSiteChoice] ?? state.onSiteChoice) : '—'
            }
          />
          {state.onSiteChoice === 'agency_key' ? (
            <Row label="Adresse agence" value={dash(state.onSiteAgencyAddress)} />
          ) : (
            <>
              <Row label="Nom" value={dash(state.onSiteContactName)} />
              <Row label="Téléphone" value={dash(state.onSiteContactPhone)} />
            </>
          )}
          {state.accessConditions.trim() !== '' ? (
            <Row label="Accès" value={state.accessConditions.trim()} />
          ) : null}
        </Section>

        <Section title="Facturation" colors={colors}>
          {!state.billingDifferent ? (
            <ThemedText style={styles.rowValue}>Identique au propriétaire</ThemedText>
          ) : (
            <>
              {state.billingCompanyName.trim() !== '' ? (
                <Row label="Société" value={state.billingCompanyName.trim()} />
              ) : null}
              <Row
                label="Nom"
                value={
                  [state.billingFirstName.trim(), state.billingLastName.trim()]
                    .filter(Boolean)
                    .join(' ') || '—'
                }
              />
              <Row label="Email" value={dash(state.billingEmail)} />
              <Row label="Téléphone" value={dash(state.billingPhone)} />
              <Row label="Adresse" value={dash(state.billingAddress)} />
              <Row label="Code postal" value={dash(state.billingPostalCode)} />
              <Row label="Ville" value={dash(state.billingCity)} />
            </>
          )}
        </Section>

        {isStaff && (state.staffFinalPriceTtc.trim() !== '' || state.staffOriginalPriceTtc.trim() !== '' || state.staffDiscountPercent.trim() !== '') ? (
          <Section title="Prix ajusté" colors={colors}>
            {state.staffFinalPriceTtc.trim() !== '' ? (
              <Row
                label="Prix final TTC"
                value={`${parseFloat(state.staffFinalPriceTtc).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`}
              />
            ) : null}
            {state.staffOriginalPriceTtc.trim() !== '' ? (
              <Row
                label="Prix barré TTC"
                value={`${parseFloat(state.staffOriginalPriceTtc).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`}
              />
            ) : null}
            {state.staffDiscountPercent.trim() !== '' ? (
              <Row label="Remise" value={`${state.staffDiscountPercent.trim()} %`} />
            ) : null}
          </Section>
        ) : null}

        {isStaff && state.staffRdvDate ? (
          <Section title="Rendez-vous planifié" colors={colors}>
            <Row label="Date" value={state.staffRdvDate} />
            {state.staffRdvDurationMinutes.trim() !== '' ? (
              <Row label="Durée" value={`${state.staffRdvDurationMinutes.trim()} min`} />
            ) : null}
          </Section>
        ) : null}

        <WizardField
          label="Commentaires"
          optional
          value={state.clientComments}
          onChangeText={(t) => update('clientComments', t)}
          placeholder="Informations complémentaires pour le dossier..."
          multiline
          accessibilityLabel="Commentaires"
          autoCorrect={false}
        />
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={handleSubmit}
        nextLabel="Créer le dossier"
        loading={isLoading}
        nextDisabled={isLoading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.55,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowLabel: {
    fontSize: 13,
    opacity: 0.65,
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  totalTtcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  totalTtcLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 1,
  },
  totalTtcValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    flex: 2,
  },
  diagnosticList: {
    gap: 8,
  },
  diagnosticItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  diagnosticIcon: {
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: 4,
  },
  diagnosticIconFallback: {
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.3,
  },
  diagnosticName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  errorBanner: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: 14,
  },
  errorBannerText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
