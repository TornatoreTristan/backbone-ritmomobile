import { RadioCard } from '@/components/wizard/radio-card';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import type { GasState } from '@/services/quote-wizard';
import { validateStep } from '@/services/quote-wizard-validation';
import { useRouter } from 'expo-router';
import { useRef } from 'react';

const OPTIONS: { value: GasState; label: string }[] = [
  { value: 'oui', label: 'Oui' },
  { value: 'non', label: 'Non' },
  { value: 'ne_sait_pas', label: 'Je ne sais pas' },
];

export default function Step5Screen() {
  const router = useRouter();
  const { state, update } = useQuoteWizard();

  // Un double appui sur une carte empilait deux fois l'écran suivant.
  const lastPushRef = useRef(0);

  function goNext() {
    const now = Date.now();
    if (now - lastPushRef.current < 700) return;
    lastPushRef.current = now;
    router.push('/quote-wizard/step-6');
  }

  function handleSelect(value: GasState) {
    update('hasGas', value);
    goNext();
  }

  return (
    <>
      <WizardScreen
        title="Installation gaz"
        subtitle="Le bien dispose-t-il d'une installation au gaz ?"
        contentStyle={{ gap: 10 }}>
        {OPTIONS.map((option) => (
          <RadioCard
            key={option.value}
            label={option.label}
            selected={state.hasGas === option.value}
            onPress={() => handleSelect(option.value)}
            accessibilityLabel={option.label}
          />
        ))}
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={goNext}
        nextDisabled={!validateStep(5, state).valid}
      />
    </>
  );
}
