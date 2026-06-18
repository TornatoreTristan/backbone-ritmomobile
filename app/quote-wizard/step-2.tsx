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
  const lastBdnbKeyRef = useRef<string>('');

  useEffect(() => {
    const trimmedAddress = state.address.trim();
    const key = `${state.postalCode}|${trimmedAddress}`;
    if (
      !isPostalCodeValid ||
      trimmedAddress.length < 4 ||
      key === lastBdnbKeyRef.current
    ) {
      return;
    }

    if (bdnbDebounceRef.current) clearTimeout(bdnbDebounceRef.current);
    bdnbAbortRef.current?.abort();

    bdnbDebounceRef.current = setTimeout(async () => {
      lastBdnbKeyRef.current = key;
      try {
        const result = await bdnbSearch({
          address: trimmedAddress,
          postalCode: state.postalCode,
          city: state.propertyCity.trim() || undefined,
        }, staffOrgId);
        setBdnb(result);
      } catch {
        // BDNB non critique, silencieux
      }
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

    try {
      const result = await bdnbSearch({
        address: suggestion.name,
        postalCode: suggestion.postcode,
        city: suggestion.city,
      }, staffOrgId);
      setBdnb(result);
    } catch {
      // BDNB non critique, silencieux
    }
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
