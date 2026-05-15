import { ThemedText } from '@/components/themed-text';
import { RadioCard } from '@/components/wizard/radio-card';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import { validateStep } from '@/services/quote-wizard-validation';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

const OWNER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'monsieur', label: 'Monsieur' },
  { value: 'madame', label: 'Madame' },
  { value: 'monsieur_madame', label: 'Monsieur et Madame' },
  { value: 'entreprise', label: 'Entreprise' },
  { value: 'autre', label: 'Autre' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Step8Screen() {
  const router = useRouter();
  const { state, update } = useQuoteWizard();

  const [emailTouched, setEmailTouched] = useState(false);

  const emailInvalid =
    emailTouched &&
    state.newContactEmail.trim() !== '' &&
    !EMAIL_REGEX.test(state.newContactEmail.trim());

  const isValid = validateStep(8, state).valid;

  return (
    <>
      <WizardScreen
        title="Propriétaire"
        subtitle="Renseignez les informations du propriétaire du bien."
        contentStyle={{ gap: 24 }}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>Civilité</ThemedText>
          {OWNER_TYPE_OPTIONS.map((option) => (
            <RadioCard
              key={option.value}
              label={option.label}
              selected={state.ownerType === option.value}
              onPress={() => update('ownerType', option.value)}
              accessibilityLabel={option.label}
            />
          ))}
        </View>

        {state.ownerType === 'entreprise' ? (
          <WizardField
            label="Nom de la société"
            value={state.companyName}
            onChangeText={(t) => update('companyName', t)}
            placeholder="Nom de l'entreprise"
            accessibilityLabel="Nom de la société"
            autoCorrect={false}
          />
        ) : null}

        <WizardField
          label="Nom complet du propriétaire"
          required
          value={state.contactSearch}
          onChangeText={(t) => update('contactSearch', t)}
          placeholder="Prénom Nom"
          accessibilityLabel="Nom complet du propriétaire"
          autoCorrect={false}
          autoCapitalize="words"
        />

        <WizardField
          label="Email"
          optional
          value={state.newContactEmail}
          onChangeText={(t) => update('newContactEmail', t)}
          onBlur={() => setEmailTouched(true)}
          placeholder="email@exemple.fr"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Email du propriétaire"
          error={emailInvalid ? 'Adresse email invalide' : null}
        />

        <WizardField
          label="Téléphone"
          optional
          value={state.newContactPhone}
          onChangeText={(t) => update('newContactPhone', t)}
          placeholder="06 12 34 56 78"
          keyboardType="phone-pad"
          accessibilityLabel="Téléphone du propriétaire"
        />
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={() => router.push('/quote-wizard/step-9')}
        nextDisabled={!isValid}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
});
