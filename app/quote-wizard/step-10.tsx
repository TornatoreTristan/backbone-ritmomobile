import { RadioCard } from '@/components/wizard/radio-card';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { useAuth } from '@/contexts/auth-context';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import { validateStep } from '@/services/quote-wizard-validation';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

type OnSiteChoice = 'partner' | 'owner' | 'other' | 'agency_key';

const AGENCY_KEY_LABEL = "Clé chez l'agence";

const ON_SITE_OPTIONS: { value: OnSiteChoice; label: string }[] = [
  { value: 'partner', label: "C'est moi (le partenaire)" },
  { value: 'owner', label: 'Le propriétaire' },
  { value: 'agency_key', label: AGENCY_KEY_LABEL },
  { value: 'other', label: 'Une autre personne' },
];

export default function Step10Screen() {
  const router = useRouter();
  const { state, update } = useQuoteWizard();
  const { user } = useAuth();

  function handleChoiceSelect(choice: OnSiteChoice) {
    update('onSiteChoice', choice);
    if (choice === 'partner') {
      update('onSiteContactName', user?.fullName ?? '');
      update('onSiteContactPhone', '');
      update('onSiteAgencyAddress', '');
    } else if (choice === 'owner') {
      update('onSiteContactName', state.contactSearch);
      update('onSiteContactPhone', state.newContactPhone);
      update('onSiteAgencyAddress', '');
    } else if (choice === 'agency_key') {
      update('onSiteContactName', AGENCY_KEY_LABEL);
      update('onSiteContactPhone', '');
      update('onSiteAgencyAddress', '');
    } else {
      update('onSiteContactName', '');
      update('onSiteContactPhone', '');
      update('onSiteAgencyAddress', '');
    }
  }

  const isAgencyKey = state.onSiteChoice === 'agency_key';
  const isValid = validateStep(10, state).valid;

  return (
    <>
      <WizardScreen
        title="Contact sur site"
        subtitle="Qui sera présent le jour de l'intervention ?"
        contentStyle={{ gap: 24 }}>
        <View style={styles.section}>
          {ON_SITE_OPTIONS.map((option) => (
            <RadioCard
              key={option.value}
              label={option.label}
              selected={state.onSiteChoice === option.value}
              onPress={() => handleChoiceSelect(option.value)}
              accessibilityLabel={option.label}
            />
          ))}
        </View>

        {isAgencyKey ? (
          <WizardField
            label="Adresse de l'agence"
            required
            value={state.onSiteAgencyAddress}
            onChangeText={(t) => update('onSiteAgencyAddress', t)}
            placeholder="12 rue de la Paix, 75001 Paris"
            multiline
            numberOfLines={2}
            accessibilityLabel="Adresse de l'agence"
            autoCorrect={false}
          />
        ) : (
          <>
            <WizardField
              label="Nom du contact sur site"
              required
              value={state.onSiteContactName}
              onChangeText={(t) => update('onSiteContactName', t)}
              placeholder="Prénom Nom"
              accessibilityLabel="Nom du contact sur site"
              autoCorrect={false}
              autoCapitalize="words"
            />

            <WizardField
              label="Téléphone"
              optional
              value={state.onSiteContactPhone}
              onChangeText={(t) => update('onSiteContactPhone', t)}
              placeholder="06 12 34 56 78"
              keyboardType="phone-pad"
              accessibilityLabel="Téléphone du contact sur site"
            />
          </>
        )}

        <WizardField
          label="Conditions d'accès / informations complémentaires"
          optional
          value={state.accessConditions}
          onChangeText={(t) => update('accessConditions', t)}
          placeholder="Digicode : 1234A, interphone 2ème gauche..."
          multiline
          accessibilityLabel="Conditions d'accès"
          autoCorrect={false}
        />
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={() => router.push('/quote-wizard/step-11')}
        nextDisabled={!isValid}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
});
