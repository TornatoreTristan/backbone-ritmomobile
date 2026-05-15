import { ThemedText } from '@/components/themed-text';
import { RadioCard } from '@/components/wizard/radio-card';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import { validateStep } from '@/services/quote-wizard-validation';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function Step9Screen() {
  const router = useRouter();
  const { state, update } = useQuoteWizard();

  function handleAddressSameToggle(same: boolean) {
    if (same) {
      update('addressSameAsProperty', true);
      update('newContactAddress', state.address);
      update('newContactPostalCode', state.postalCode);
      update('newContactCity', state.propertyCity);
    } else {
      update('addressSameAsProperty', false);
      update('newContactAddress', '');
      update('newContactPostalCode', '');
      update('newContactCity', '');
    }
  }

  return (
    <>
      <WizardScreen
        title="Adresse du propriétaire"
        subtitle="L'adresse du propriétaire est-elle identique à celle du bien ?"
        contentStyle={{ gap: 24 }}>
        <View style={styles.section}>
          <RadioCard
            label="Identique au bien"
            selected={state.addressSameAsProperty === true}
            onPress={() => handleAddressSameToggle(true)}
            accessibilityLabel="Adresse identique au bien"
          />
          <RadioCard
            label="Différente"
            selected={state.addressSameAsProperty === false}
            onPress={() => handleAddressSameToggle(false)}
            accessibilityLabel="Adresse différente du bien"
          />
        </View>

        {state.addressSameAsProperty === false ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Adresse</ThemedText>

            <WizardField
              label="Adresse"
              value={state.newContactAddress}
              onChangeText={(t) => update('newContactAddress', t)}
              placeholder="12 rue de la Paix"
              accessibilityLabel="Adresse du propriétaire"
              autoCorrect={false}
              autoCapitalize="words"
            />

            <View style={styles.row}>
              <WizardField
                label="Code postal"
                value={state.newContactPostalCode}
                onChangeText={(t) => update('newContactPostalCode', t)}
                placeholder="75001"
                keyboardType="number-pad"
                maxLength={5}
                accessibilityLabel="Code postal du propriétaire"
                containerStyle={styles.postalCodeField}
              />
              <WizardField
                label="Ville"
                value={state.newContactCity}
                onChangeText={(t) => update('newContactCity', t)}
                placeholder="Paris"
                accessibilityLabel="Ville du propriétaire"
                autoCorrect={false}
                autoCapitalize="words"
                containerStyle={styles.flex}
              />
            </View>
          </View>
        ) : null}

        <WizardField
          label="Nom de la résidence"
          optional
          value={state.residenceName}
          onChangeText={(t) => update('residenceName', t)}
          placeholder="Résidence Les Pins"
          accessibilityLabel="Nom de la résidence"
          autoCorrect={false}
          autoCapitalize="words"
        />
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={() => router.push('/quote-wizard/step-10')}
        nextDisabled={!validateStep(9, state).valid}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  postalCodeField: { width: 110 },
});
