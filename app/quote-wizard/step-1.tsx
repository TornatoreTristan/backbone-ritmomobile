import { RadioCard } from '@/components/wizard/radio-card';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import type { ProjectType } from '@/services/quote-wizard';
import { validateStep } from '@/services/quote-wizard-validation';
import { useRouter } from 'expo-router';
import { useRef } from 'react';

const OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'vente', label: 'Vente' },
  { value: 'location', label: 'Location' },
  { value: 'avant_travaux', label: 'Avant travaux' },
  { value: 'avant_demolition', label: 'Avant démolition' },
  { value: 'gestion_locative', label: 'Gestion locative' },
];

export default function Step1Screen() {
  const router = useRouter();
  const { state, update } = useQuoteWizard();

  // Un double appui sur une carte empilait deux fois l'écran suivant.
  const lastPushRef = useRef(0);

  function goNext() {
    const now = Date.now();
    if (now - lastPushRef.current < 700) return;
    lastPushRef.current = now;
    router.push('/quote-wizard/step-2');
  }

  function handleSelect(value: ProjectType) {
    update('projectType', value);
    goNext();
  }

  return (
    <>
      <WizardScreen
        title="Type de projet"
        subtitle="Quel type de projet souhaitez-vous diagnostiquer ?"
        contentStyle={{ gap: 10 }}>
        {OPTIONS.map((option) => (
          <RadioCard
            key={option.value}
            label={option.label}
            selected={state.projectType === option.value}
            onPress={() => handleSelect(option.value)}
            accessibilityLabel={option.label}
          />
        ))}
      </WizardScreen>

      <WizardFooter
        showBack={false}
        onNext={goNext}
        nextDisabled={!validateStep(1, state).valid}
      />
    </>
  );
}
