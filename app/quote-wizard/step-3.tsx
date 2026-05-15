import { ThemedText } from '@/components/themed-text';
import { RadioCard } from '@/components/wizard/radio-card';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import { validateStep } from '@/services/quote-wizard-validation';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

const PROPERTY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison', label: 'Maison' },
  { value: 'immeuble', label: 'Immeuble' },
  { value: 'local_commercial', label: 'Local commercial' },
  { value: 'local_bureau', label: 'Local bureau' },
  { value: 'terrain', label: 'Terrain' },
  { value: 'cave', label: 'Cave' },
  { value: 'grange', label: 'Grange' },
  { value: 'other', label: 'Autre' },
];

const OWNERSHIP_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'individuel', label: 'Individuel' },
  { value: 'copropriete', label: 'Copropriété' },
];

export default function Step3Screen() {
  const router = useRouter();
  const { state, update } = useQuoteWizard();

  const bdnbPrefillDone = useRef(false);

  useEffect(() => {
    if (
      !bdnbPrefillDone.current &&
      state.bdnbBuilding?.surfaceArea !== null &&
      state.bdnbBuilding?.surfaceArea !== undefined &&
      state.surfaceArea === ''
    ) {
      update('surfaceArea', String(state.bdnbBuilding.surfaceArea));
      bdnbPrefillDone.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canProceed = validateStep(3, state).valid;

  return (
    <>
      <WizardScreen
        title="Bien immobilier"
        subtitle="Décrivez le bien à diagnostiquer. Tous les champs sont requis pour le calcul du prix."
        contentStyle={{ gap: 24 }}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>Type de bien</ThemedText>
          <View style={styles.grid}>
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <View key={option.value} style={styles.gridItem}>
                <RadioCard
                  label={option.label}
                  selected={state.propertyType === option.value}
                  onPress={() => {
                    update('propertyType', option.value);
                    if (option.value !== 'maison') update('ownershipType', null);
                    if (option.value !== 'appartement') {
                      update('floor', '');
                      update('door', '');
                      update('lotNumber', '');
                    }
                  }}
                  accessibilityLabel={option.label}
                />
              </View>
            ))}
          </View>
        </View>

        {state.propertyType === 'maison' ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Type de propriété</ThemedText>
            <View style={styles.grid}>
              {OWNERSHIP_TYPE_OPTIONS.map((option) => (
                <View key={option.value} style={styles.gridItem}>
                  <RadioCard
                    label={option.label}
                    selected={state.ownershipType === option.value}
                    onPress={() => update('ownershipType', option.value)}
                    accessibilityLabel={option.label}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {state.propertyType === 'appartement' ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>
              Informations complémentaires{' '}
              <ThemedText style={styles.optionalHint}>(optionnel)</ThemedText>
            </ThemedText>
            <View style={styles.row}>
              <WizardField
                label="Étage"
                value={state.floor}
                onChangeText={(t) => update('floor', t)}
                keyboardType="number-pad"
                placeholder="2"
                accessibilityLabel="Étage"
                containerStyle={styles.flex}
              />
              <WizardField
                label="Porte"
                value={state.door}
                onChangeText={(t) => update('door', t)}
                placeholder="A"
                accessibilityLabel="Porte"
                autoCapitalize="characters"
                containerStyle={styles.flex}
              />
            </View>
            <WizardField
              label="Numéro de lot"
              value={state.lotNumber}
              onChangeText={(t) => update('lotNumber', t)}
              placeholder="42"
              accessibilityLabel="Numéro de lot"
              autoCorrect={false}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>Caractéristiques</ThemedText>
          <View style={styles.row}>
            <WizardField
              label="Surface (m²)"
              value={state.surfaceArea}
              onChangeText={(t) => update('surfaceArea', t)}
              keyboardType="decimal-pad"
              placeholder="75"
              accessibilityLabel="Surface en m²"
              containerStyle={styles.flex}
            />
            <WizardField
              label="Nb. pièces"
              value={state.roomCount}
              onChangeText={(t) => update('roomCount', t)}
              keyboardType="number-pad"
              placeholder="3"
              accessibilityLabel="Nombre de pièces"
              containerStyle={styles.flex}
            />
          </View>
        </View>
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={() => router.push('/quote-wizard/step-4')}
        nextDisabled={!canProceed}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  optionalHint: { fontSize: 13, opacity: 0.45, fontWeight: '400' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '48.5%',
  },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
