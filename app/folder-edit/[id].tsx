import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioCard } from '@/components/wizard/radio-card';
import { WizardField } from '@/components/wizard/wizard-field';
import { centeredContent } from '@/constants/layout';
import { useColors } from '@/hooks/use-theme-color';
import { ApiError } from '@/services/api';
import {
  type EditableFolderStatus,
  type FolderDetail,
  type FolderStatus,
  type FolderUpdatePayload,
  getFolderById,
  updateFolder,
} from '@/services/folders';
import { usePreventRemove } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

// ==========================================
// Form model
// ==========================================

const TEXT_FIELDS = [
  'clientName',
  'clientEmail',
  'clientPhone',
  'clientAddress',
  'clientPostalCode',
  'clientCity',
  'address',
  'postalCode',
  'city',
  'residenceName',
  'floor',
  'door',
  'lotNumber',
  'onSiteContactName',
  'onSiteContactPhone',
  'accessConditions',
  'notes',
  'clientComments',
] as const;

type TextField = (typeof TEXT_FIELDS)[number];

/** Champs que le backend refuse à null : une valeur vide n'est pas envoyée comme null. */
const REQUIRED_FIELDS: readonly TextField[] = ['clientName', 'postalCode'];

type FormValues = Record<TextField, string> & { status: FolderStatus };
type FormErrors = Partial<Record<TextField, string>>;

const STATUS_OPTIONS: { value: EditableFolderStatus; label: string; hint: string }[] = [
  { value: 'lead', label: 'Prospect', hint: 'Devis en cours' },
  { value: 'deal', label: 'Conclu', hint: 'Commande confirmée' },
  { value: 'archived', label: 'Archivé', hint: 'Dossier clos ou abandonné' },
];

const STATUS_LABELS: Record<FolderStatus, string> = {
  draft: 'Brouillon',
  lead: 'Prospect',
  deal: 'Conclu',
  archived: 'Archivé',
};

function toFormValues(folder: FolderDetail): FormValues {
  const values = { status: folder.status } as FormValues;
  for (const field of TEXT_FIELDS) {
    const raw = (folder as Record<string, unknown>)[field];
    values[field] = typeof raw === 'string' ? raw : '';
  }
  return values;
}

/** Diff entre l'état initial et le formulaire : seuls les champs modifiés sont envoyés. */
function buildPayload(initial: FormValues, current: FormValues): FolderUpdatePayload {
  const payload: Record<string, unknown> = {};
  for (const field of TEXT_FIELDS) {
    const before = initial[field].trim();
    const after = current[field].trim();
    if (before === after) continue;
    payload[field] = after === '' && !REQUIRED_FIELDS.includes(field) ? null : after;
  }
  if (current.status !== initial.status && current.status !== 'draft') {
    payload.status = current.status;
  }
  return payload as FolderUpdatePayload;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valide uniquement les champs modifiés : un dossier créé en « quick-create » peut
 * avoir un nom ou un code postal vide, ce qui ne doit pas bloquer l'édition du reste.
 */
function validate(initial: FormValues, values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const changed = (f: TextField) => initial[f].trim() !== values[f].trim();
  if (changed('clientName') && !values.clientName.trim()) {
    errors.clientName = 'Le nom du client est obligatoire.';
  }
  const email = values.clientEmail.trim();
  if (changed('clientEmail') && email && !EMAIL_RE.test(email)) {
    errors.clientEmail = 'Adresse email invalide.';
  }
  if (changed('postalCode') && values.postalCode.trim().length < 5) {
    errors.postalCode = 'Code postal du bien obligatoire (5 caractères min.).';
  }
  return errors;
}

/** Erreurs de validation Vine renvoyées par le backend (422 `{ errors: [{ field, message }] }`). */
function extractServerErrors(err: unknown): FormErrors | null {
  if (!(err instanceof ApiError) || err.status !== 422) return null;
  const list = (err.data as { errors?: { field?: string }[] } | null)?.errors;
  if (!Array.isArray(list)) return null;
  const errors: FormErrors = {};
  for (const item of list) {
    if (item.field && (TEXT_FIELDS as readonly string[]).includes(item.field)) {
      errors[item.field as TextField] = 'Valeur refusée par le serveur.';
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

// ==========================================
// Screen
// ==========================================

export default function FolderEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useColors();

  const [initial, setInitial] = useState<FormValues | null>(null);
  const [values, setValues] = useState<FormValues | null>(null);
  const [reference, setReference] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    getFolderById(id)
      .then((folder) => {
        if (folder.canEdit === false) {
          setLoadError("Vous n'êtes pas autorisé à modifier ce dossier.");
          return;
        }
        const formValues = toFormValues(folder);
        setInitial(formValues);
        setValues(formValues);
        setReference(folder.reference);
      })
      .catch(() => setLoadError('Impossible de charger le dossier. Veuillez réessayer.'));
  }, [id]);

  const payload = initial && values ? buildPayload(initial, values) : {};
  const isDirty = Object.keys(payload).length > 0;

  usePreventRemove(isDirty && !isSaved && !isSaving, ({ data }) => {
    Alert.alert('Abandonner les modifications ?', 'Vos changements ne seront pas enregistrés.', [
      { text: 'Continuer la saisie', style: 'cancel' },
      {
        text: 'Abandonner',
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  useEffect(() => {
    if (isSaved) router.back();
  }, [isSaved, router]);

  function setField(field: TextField, value: string) {
    setValues((prev) => (prev ? { ...prev, [field]: value } : prev));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function submit() {
    setIsSaving(true);
    try {
      await updateFolder(id, payload);
      // La fermeture se fait dans l'effet ci-dessus, une fois le garde
      // usePreventRemove désactivé par ce nouveau rendu.
      setIsSaved(true);
    } catch (err) {
      const serverErrors = extractServerErrors(err);
      if (serverErrors) {
        setErrors(serverErrors);
        Alert.alert('Enregistrement impossible', 'Certains champs sont invalides.');
      } else if (err instanceof ApiError && err.status === 403) {
        Alert.alert('Accès refusé', "Vous n'êtes pas autorisé à modifier ce dossier.");
      } else {
        const message = err instanceof Error ? err.message : 'Une erreur est survenue.';
        Alert.alert('Enregistrement impossible', message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleSave() {
    if (!values || !initial || !isDirty || isSaving) return;
    const localErrors = validate(initial, values);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }
    // Un changement de statut déclenche des automatismes côté backend
    // (référence définitive, création du lead / de l'affaire…) : on confirme.
    if (payload.status) {
      Alert.alert(
        'Changer le statut ?',
        `Le dossier passera de « ${STATUS_LABELS[initial.status]} » à « ${STATUS_LABELS[payload.status]} ». Les actions automatiques associées seront déclenchées.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: submit },
        ],
      );
      return;
    }
    submit();
  }

  const headerRight = () => (
    <Pressable
      onPress={handleSave}
      disabled={!isDirty || isSaving}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Enregistrer">
      {isSaving ? (
        <ActivityIndicator size="small" />
      ) : (
        <ThemedText
          style={[styles.headerAction, { color: colors.foreground }, !isDirty && styles.disabled]}>
          Enregistrer
        </ThemedText>
      )}
    </Pressable>
  );

  const headerLeft = () => (
    <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
      <ThemedText style={[styles.headerCancel, { color: colors.foreground }]}>Annuler</ThemedText>
    </Pressable>
  );

  const screenOptions = {
    title: reference ? `Modifier ${reference}` : 'Modifier le dossier',
    headerLeft,
    headerRight,
  };

  if (loadError) {
    return (
      <ThemedView style={styles.center}>
        <Stack.Screen options={screenOptions} />
        <ThemedText tone="destructive" style={styles.centerText}>
          {loadError}
        </ThemedText>
        <Button variant="outline" size="sm" onPress={() => router.back()} style={{ marginTop: 12 }}>
          Retour
        </Button>
      </ThemedView>
    );
  }

  if (!values || !initial) {
    return (
      <ThemedView style={styles.center}>
        <Stack.Screen options={screenOptions} />
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const field = (name: TextField) => ({
    value: values[name],
    onChangeText: (text: string) => setField(name, text),
    error: errors[name] ?? null,
    editable: !isSaving,
  });

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={screenOptions} />
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, centeredContent]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={24}
        showsVerticalScrollIndicator={false}>
        <FormSection title="Statut">
          {initial.status === 'draft' ? (
            <ThemedText type="muted" style={styles.hint}>
              Dossier actuellement en brouillon.
            </ThemedText>
          ) : null}
          <View style={styles.radioGroup}>
            {STATUS_OPTIONS.map((option) => (
              <RadioCard
                key={option.value}
                label={`${option.label} · ${option.hint}`}
                accessibilityLabel={option.label}
                selected={values.status === option.value}
                onPress={() =>
                  !isSaving && setValues((prev) => (prev ? { ...prev, status: option.value } : prev))
                }
              />
            ))}
          </View>
        </FormSection>

        <FormSection title="Client">
          <WizardField label="Nom" required {...field('clientName')} autoCapitalize="words" />
          <WizardField
            label="Email"
            optional
            {...field('clientEmail')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <WizardField label="Téléphone" optional {...field('clientPhone')} keyboardType="phone-pad" />
          <WizardField label="Adresse" optional {...field('clientAddress')} />
          <View style={styles.row}>
            <WizardField
              label="Code postal"
              optional
              {...field('clientPostalCode')}
              keyboardType="number-pad"
              maxLength={10}
              containerStyle={styles.postalCode}
            />
            <WizardField label="Ville" optional {...field('clientCity')} containerStyle={styles.flex} />
          </View>
        </FormSection>

        <FormSection title="Bien immobilier">
          <WizardField label="Adresse" optional {...field('address')} />
          <View style={styles.row}>
            <WizardField
              label="Code postal"
              required
              {...field('postalCode')}
              keyboardType="number-pad"
              maxLength={10}
              containerStyle={styles.postalCode}
            />
            <WizardField label="Ville" optional {...field('city')} containerStyle={styles.flex} />
          </View>
          <WizardField label="Résidence" optional {...field('residenceName')} />
          <View style={styles.row}>
            <WizardField label="Étage" optional {...field('floor')} containerStyle={styles.flex} />
            <WizardField label="Porte" optional {...field('door')} containerStyle={styles.flex} />
            <WizardField label="Lot" optional {...field('lotNumber')} containerStyle={styles.flex} />
          </View>
        </FormSection>

        <FormSection title="Accès">
          <WizardField label="Contact sur place" optional {...field('onSiteContactName')} />
          <WizardField
            label="Téléphone du contact"
            optional
            {...field('onSiteContactPhone')}
            keyboardType="phone-pad"
          />
          <WizardField
            label="Conditions d'accès"
            optional
            multiline
            {...field('accessConditions')}
            maxLength={1000}
          />
        </FormSection>

        <FormSection title="Notes">
          <WizardField
            label="Notes"
            optional
            multiline
            {...field('notes')}
            placeholder="Visibles par le partenaire du dossier"
          />
          <WizardField label="Commentaires client" optional multiline {...field('clientComments')} />
        </FormSection>

        <Button full onPress={handleSave} disabled={!isDirty} loading={isSaving}>
          Enregistrer
        </Button>
      </KeyboardAwareScrollView>
    </ThemedView>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={styles.section}>
      <ThemedText type="label" tone="primary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerText: { textAlign: 'center' },
  section: { gap: 12 },
  sectionTitle: { marginBottom: 2 },
  hint: { fontSize: 13 },
  radioGroup: { gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  postalCode: { width: 110 },
  headerAction: { fontSize: 16, fontWeight: '600' },
  headerCancel: { fontSize: 16 },
  disabled: { opacity: 0.35 },
});
