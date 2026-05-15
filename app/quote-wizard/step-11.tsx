import { ThemedText } from '@/components/themed-text';
import { RadioCard } from '@/components/wizard/radio-card';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { Radius } from '@/constants/theme';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import { useColors } from '@/hooks/use-theme-color';
import { validateStep } from '@/services/quote-wizard-validation';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Step11Screen() {
  const router = useRouter();
  const { state, update } = useQuoteWizard();
  const colors = useColors();

  const [billingEmailTouched, setBillingEmailTouched] = useState(false);

  const billingEmailInvalid =
    state.billingDifferent &&
    billingEmailTouched &&
    state.billingEmail.trim() !== '' &&
    !EMAIL_REGEX.test(state.billingEmail.trim());

  return (
    <>
      <WizardScreen
        title="Facturation"
        subtitle="Les informations de facturation sont-elles différentes de celles du propriétaire ?"
        contentStyle={{ gap: 24 }}>
        <View style={styles.section}>
          <RadioCard
            label="Identique au propriétaire"
            selected={state.billingDifferent === false}
            onPress={() => update('billingDifferent', false)}
            accessibilityLabel="Facturation identique au propriétaire"
          />
          <RadioCard
            label="Différente"
            selected={state.billingDifferent === true}
            onPress={() => update('billingDifferent', true)}
            accessibilityLabel="Facturation différente"
          />
        </View>

        {state.billingDifferent === false ? (
          <View
            style={[
              styles.infoBox,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}>
            <ThemedText type="muted" style={styles.infoText}>
              Les informations de facturation seront identiques à celles du propriétaire.
            </ThemedText>
          </View>
        ) : null}

        {state.billingDifferent === true ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Coordonnées de facturation</ThemedText>

            <WizardField
              label="Société"
              optional
              value={state.billingCompanyName}
              onChangeText={(t) => update('billingCompanyName', t)}
              placeholder="Nom de la société"
              accessibilityLabel="Société de facturation"
              autoCorrect={false}
            />

            <View style={styles.row}>
              <WizardField
                label="Prénom"
                optional
                value={state.billingFirstName}
                onChangeText={(t) => update('billingFirstName', t)}
                placeholder="Jean"
                accessibilityLabel="Prénom facturation"
                autoCapitalize="words"
                autoCorrect={false}
                containerStyle={styles.flex}
              />
              <WizardField
                label="Nom"
                optional
                value={state.billingLastName}
                onChangeText={(t) => update('billingLastName', t)}
                placeholder="Dupont"
                accessibilityLabel="Nom facturation"
                autoCapitalize="words"
                autoCorrect={false}
                containerStyle={styles.flex}
              />
            </View>

            <WizardField
              label="Email"
              optional
              value={state.billingEmail}
              onChangeText={(t) => update('billingEmail', t)}
              onBlur={() => setBillingEmailTouched(true)}
              placeholder="facturation@exemple.fr"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Email de facturation"
              error={billingEmailInvalid ? 'Adresse email invalide' : null}
            />

            <WizardField
              label="Téléphone"
              optional
              value={state.billingPhone}
              onChangeText={(t) => update('billingPhone', t)}
              placeholder="06 12 34 56 78"
              keyboardType="phone-pad"
              accessibilityLabel="Téléphone de facturation"
            />

            <WizardField
              label="Adresse"
              optional
              value={state.billingAddress}
              onChangeText={(t) => update('billingAddress', t)}
              placeholder="12 rue de la Paix"
              accessibilityLabel="Adresse de facturation"
              autoCorrect={false}
              autoCapitalize="words"
            />

            <View style={styles.row}>
              <WizardField
                label="Code postal"
                value={state.billingPostalCode}
                onChangeText={(t) => update('billingPostalCode', t)}
                placeholder="75001"
                keyboardType="number-pad"
                maxLength={5}
                accessibilityLabel="Code postal de facturation"
                containerStyle={styles.postalCodeField}
              />
              <WizardField
                label="Ville"
                value={state.billingCity}
                onChangeText={(t) => update('billingCity', t)}
                placeholder="Paris"
                accessibilityLabel="Ville de facturation"
                autoCorrect={false}
                autoCapitalize="words"
                containerStyle={styles.flex}
              />
            </View>
          </View>
        ) : null}
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={() => router.push('/quote-wizard/step-12')}
        nextDisabled={!validateStep(11, state).valid}
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
  infoBox: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
