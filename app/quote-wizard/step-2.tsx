import { ThemedText } from '@/components/themed-text';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { Radius } from '@/constants/theme';
import { useOrganization } from '@/contexts/organization-context';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import { useColors } from '@/hooks/use-theme-color';
import { type BanSuggestion, searchAddress } from '@/services/ban-autocomplete';
import { bdnbSearch } from '@/services/quote-wizard';
import { validateStep } from '@/services/quote-wizard-validation';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function Step2Screen() {
  const router = useRouter();
  const { state, update, setBdnb } = useQuoteWizard();
  const colors = useColors();
  const { isStaff, currentOrganization } = useOrganization();
  const staffOrgId = isStaff ? (currentOrganization?.id ?? undefined) : undefined;

  const [suggestions, setSuggestions] = useState<BanSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isPostalCodeValid = /^\d{5}$/.test(state.postalCode);
  const validation = validateStep(2, state);
  const canProceed = validation.valid;

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const bdnbDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bdnbAbortRef = useRef<AbortController | null>(null);
  const bdnbKey = `${state.postalCode}|${state.address.trim()}`;
  // Adresse pour laquelle `bdnbBuilding` a été demandé. Initialisée sur l'adresse
  // courante si un bâtiment est déjà connu (retour sur l'écran) : pas de nouvel appel.
  const lastBdnbKeyRef = useRef<string>(state.bdnbBuilding ? bdnbKey : '');

  /**
   * Une seule recherche BDNB à la fois : la précédente est annulée, et seule la
   * réponse de la dernière est appliquée. Un échec vide le bâtiment plutôt que de
   * laisser celui de l'adresse précédente préremplir les étapes suivantes.
   */
  async function runBdnbSearch(address: string, postalCode: string, city: string | undefined) {
    bdnbAbortRef.current?.abort();
    const controller = new AbortController();
    bdnbAbortRef.current = controller;
    try {
      const result = await bdnbSearch({ address, postalCode, city }, staffOrgId, controller.signal);
      if (controller.signal.aborted) return;
      setBdnb(result);
    } catch {
      // BDNB non critique, silencieux
      if (controller.signal.aborted) return;
      setBdnb({ building: null });
    }
  }

  useEffect(() => {
    const trimmedAddress = state.address.trim();
    if (bdnbKey === lastBdnbKeyRef.current) return;

    // L'adresse a changé : le bâtiment connu ne lui correspond plus.
    if (bdnbDebounceRef.current) clearTimeout(bdnbDebounceRef.current);
    bdnbAbortRef.current?.abort();
    lastBdnbKeyRef.current = '';
    if (state.bdnbBuilding) setBdnb({ building: null });

    if (!isPostalCodeValid || trimmedAddress.length < 4) return;

    bdnbDebounceRef.current = setTimeout(() => {
      lastBdnbKeyRef.current = bdnbKey;
      runBdnbSearch(trimmedAddress, state.postalCode, state.propertyCity.trim() || undefined);
    }, 800);

    return () => {
      if (bdnbDebounceRef.current) clearTimeout(bdnbDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.postalCode, state.address, isPostalCodeValid]);

  useEffect(() => {
    const abortRefLocal = bdnbAbortRef;
    return () => {
      abortRefLocal.current?.abort();
    };
  }, []);

  function handleAddressChange(text: string) {
    update('address', text);
    setShowSuggestions(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      const results = await searchAddress(
        text,
        state.postalCode.length === 5 ? state.postalCode : undefined,
        controller.signal,
      );
      setSuggestions(results.slice(0, 6));
    }, 300);
  }

  async function handleSelectSuggestion(suggestion: BanSuggestion) {
    update('address', suggestion.name);
    if (!state.postalCode || state.postalCode !== suggestion.postcode) {
      update('postalCode', suggestion.postcode);
    }
    update('propertyCity', suggestion.city);
    setSuggestions([]);
    setShowSuggestions(false);

    // Clé posée avant l'appel : l'effet sur l'adresse ne relance pas la même
    // recherche en parallèle.
    if (bdnbDebounceRef.current) clearTimeout(bdnbDebounceRef.current);
    lastBdnbKeyRef.current = `${suggestion.postcode}|${suggestion.name.trim()}`;
    await runBdnbSearch(suggestion.name, suggestion.postcode, suggestion.city);
  }

  return (
    <>
      <WizardScreen
        title="Localisation"
        subtitle="Où se situe le bien à diagnostiquer ?"
        contentStyle={{ gap: 20 }}>
        <WizardField
          label="Code postal"
          value={state.postalCode}
          onChangeText={(t) => update('postalCode', t)}
          keyboardType="number-pad"
          maxLength={5}
          placeholder="75001"
          accessibilityLabel="Code postal"
          error={
            state.postalCode.length > 0 && !isPostalCodeValid
              ? 'Le code postal doit contenir 5 chiffres.'
              : null
          }
        />

        <View style={styles.autocompleteWrapper}>
          <WizardField
            label="Adresse"
            value={state.address}
            onChangeText={handleAddressChange}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="12 rue de la Paix"
            accessibilityLabel="Adresse"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {showSuggestions && suggestions.length > 0 ? (
            <View
              style={[
                styles.suggestionList,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}>
              {suggestions.map((s) => (
                <Pressable
                  key={`${s.postcode}-${s.label}`}
                  onPress={() => handleSelectSuggestion(s)}
                  accessibilityRole="button"
                  accessibilityLabel={s.label}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: pressed ? colors.muted : 'transparent',
                    },
                  ]}>
                  <ThemedText style={styles.suggestionText}>{s.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <WizardField
          label="Ville"
          value={state.propertyCity}
          onChangeText={(t) => update('propertyCity', t)}
          placeholder="Paris"
          accessibilityLabel="Ville"
          autoCorrect={false}
        />
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={() => router.push('/quote-wizard/step-3')}
        nextDisabled={!canProceed}
      />
    </>
  );
}

const styles = StyleSheet.create({
  autocompleteWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  suggestionList: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: { fontSize: 14 },
});
