import { showAbandonConfirm } from '@/components/wizard/confirm-abandon-sheet';
import { WizardHeader } from '@/components/wizard/wizard-header';
import { QuoteWizardProvider, useQuoteWizard } from '@/contexts/quote-wizard-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, View } from 'react-native';

const TOTAL_STEPS = 12;

function stepFromSegments(segments: string[]): number {
  const last = segments[segments.length - 1];
  const match = last?.match(/^step-(\d+)$/);
  if (match) return parseInt(match[1], 10);
  return 1;
}

function WizardLayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const {
    resetAndClear,
    hasPendingState,
    pendingStep,
    restoreState,
    discardState,
    setCurrentStep,
  } = useQuoteWizard();
  const currentStep = stepFromSegments(segments);
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
      <WizardHeader step={currentStep} totalSteps={TOTAL_STEPS} onClose={handleClose} />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
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
