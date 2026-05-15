import { ThemedText } from '@/components/themed-text';
import { RadioCard } from '@/components/wizard/radio-card';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { Radius } from '@/constants/theme';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import { useColors } from '@/hooks/use-theme-color';
import type { YearRange } from '@/services/quote-wizard';
import { validateStep } from '@/services/quote-wizard-validation';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const YEAR_RANGE_OPTIONS: { value: YearRange; label: string }[] = [
  { value: 'avant_1949', label: 'Avant 1949' },
  { value: '1949_1974', label: '1949 – 1974' },
  { value: '1975_1989', label: '1975 – 1989' },
  { value: '1990_2000', label: '1990 – 2000' },
  { value: '2001_2010', label: '2001 – 2010' },
  { value: '2011_2020', label: '2011 – 2020' },
  { value: 'apres_2020', label: 'Après 2020' },
];

const CURRENT_YEAR = new Date().getFullYear();

type Mode = 'exact' | 'range';

export default function Step4Screen() {
  const router = useRouter();
  const { state, update } = useQuoteWizard();
  const colors = useColors();

  const bdnbPrefillDone = useRef(false);
  const [mode, setMode] = useState<Mode>(
    state.yearRange !== null ? 'range' : 'exact',
  );

  useEffect(() => {
    if (
      !bdnbPrefillDone.current &&
      state.bdnbSuggestedYear !== null &&
      state.exactYear === '' &&
      state.yearRange === null
    ) {
      update('exactYear', String(state.bdnbSuggestedYear));
      setMode('exact');
      bdnbPrefillDone.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exactYearNum = parseInt(state.exactYear, 10);
  const isExactYearValid =
    state.exactYear.trim().length === 4 &&
    !isNaN(exactYearNum) &&
    exactYearNum >= 1800 &&
    exactYearNum <= CURRENT_YEAR;

  const canProceed = validateStep(4, state).valid;

  function handleModeChange(next: Mode) {
    setMode(next);
    if (next === 'exact') {
      update('yearRange', null);
    } else {
      update('exactYear', '');
    }
  }

  function handleExactYearChange(text: string) {
    update('exactYear', text);
    update('yearRange', null);
  }

  function handleRangeSelect(value: YearRange) {
    update('yearRange', value);
    update('exactYear', '');
  }

  function renderTab(value: Mode, label: string, accessibilityLabel: string) {
    const isActive = mode === value;
    return (
      <Pressable
        onPress={() => handleModeChange(value)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.tab,
          {
            borderColor: isActive ? colors.foreground : colors.border,
            backgroundColor: isActive ? colors.muted : colors.surfaceSubtle,
          },
        ]}>
        <ThemedText
          style={[styles.tabLabel, isActive && { color: colors.foreground, fontWeight: '600' }]}>
          {label}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <>
      <WizardScreen
        title="Année de construction"
        subtitle="Indiquez l'année ou la période de construction du bien."
        contentStyle={{ gap: 20 }}>
        <View style={styles.tabs}>
          {renderTab('exact', 'Année exacte', 'Saisir une année exacte')}
          {renderTab('range', 'Tranche', "Choisir une tranche d'années")}
        </View>

        {mode === 'exact' ? (
          <WizardField
            label="Année de construction"
            value={state.exactYear}
            onChangeText={handleExactYearChange}
            keyboardType="number-pad"
            maxLength={4}
            placeholder={String(CURRENT_YEAR)}
            accessibilityLabel="Année de construction"
            error={
              state.exactYear.length > 0 && !isExactYearValid
                ? `Saisissez une année entre 1800 et ${CURRENT_YEAR}.`
                : null
            }
          />
        ) : (
          <View style={styles.rangeList}>
            {YEAR_RANGE_OPTIONS.map((option) => (
              <RadioCard
                key={option.value}
                label={option.label}
                selected={state.yearRange === option.value}
                onPress={() => handleRangeSelect(option.value)}
                accessibilityLabel={option.label}
              />
            ))}
          </View>
        )}
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={() => router.push('/quote-wizard/step-5')}
        nextDisabled={!canProceed}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  tabLabel: { fontSize: 14 },
  rangeList: { gap: 10 },
});
