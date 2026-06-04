import { showAbandonConfirm } from '@/components/wizard/confirm-abandon-sheet';
import { WizardHeader } from '@/components/wizard/wizard-header';
import { useOrganization } from '@/contexts/organization-context';
import { QuoteWizardProvider, useQuoteWizard } from '@/contexts/quote-wizard-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, View } from 'react-native';
import { KeyboardToolbar } from 'react-native-keyboard-controller';

function stepFromSegments(segments: string[], isStaff: boolean): number {
  const last = segments[segments.length - 1];
  const match = last?.match(/^step-(\d+)$/);
  if (isStaff) {
    // Ordre staff : step-1..7 (1-7) → pricing (8) → rdv (9) → step-8..11 (10-13) → step-12 récap (14)
    if (last === 'pricing') return 8;
    if (last === 'rdv') return 9;
    if (match) {
      const n = parseInt(match[1], 10);
      if (n <= 7) return n;
      if (n === 12) return 14;
      return n + 2; // step-8..11 → 10..13
    }
    return 1;
  }
  // Ordre partner : step-1..11 (1-11) → step-12 récap (12)
  if (match) {
    return parseInt(match[1], 10);
  }
  return 1;
}

function WizardLayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const { isStaff } = useOrganization();
  const {
    resetAndClear,
    hasPendingState,
    pendingStep,
    restoreState,
    discardState,
    setCurrentStep,
  } = useQuoteWizard();
  const totalSteps = isStaff ? 14 : 12;
  const currentStep = stepFromSegments(segments, isStaff);
  const promptShownRef = useRef(false);

  useEffect(() => {
    setCurrentStep(currentStep);
  }, [currentStep, setCurrentStep]);

  useEffect(() => {
    if (!hasPendingState || promptShownRef.current) return;
    promptShownRef.current = true;
    Alert.alert(
      'Reprendre votre devis ?',
      'Vous avez un devis en cours. Souhaitez-vous le reprendre ou repartir de zéro ?',
      [
        {
          text: 'Repartir de zéro',
          style: 'destructive',
          onPress: () => {
            discardState();
          },
        },
        {
          text: 'Reprendre',
          style: 'default',
          onPress: async () => {
            await restoreState();
            // Cap at step 6: suggestions/gridTotal aren't persisted (too volumineux
            // pour SecureStore), donc on force le re-fetch au step 6.
            const target = Math.min(Math.max(pendingStep, 1), 6);
            if (target > 1) {
              router.push(`/quote-wizard/step-${target}` as never);
            }
          },
        },
      ],
      { cancelable: false },
    );
  }, [hasPendingState, pendingStep, discardState, restoreState, router]);

  function handleClose() {
    showAbandonConfirm(async () => {
      await resetAndClear();
      router.dismissAll();
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <WizardHeader step={currentStep} totalSteps={totalSteps} onClose={handleClose} />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      <KeyboardToolbar />
    </View>
  );
}

export default function QuoteWizardLayout() {
  return (
    <QuoteWizardProvider>
      <WizardLayoutInner />
    </QuoteWizardProvider>
  );
}
