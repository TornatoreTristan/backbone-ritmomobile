import { RadioCard } from '@/components/wizard/radio-card';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import type { ProjectType } from '@/services/quote-wizard';
import { validateStep } from '@/services/quote-wizard-validation';
import { useRouter } from 'expo-router';

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

  function handleSelect(value: ProjectType) {
    update('projectType', value);
    router.push('/quote-wizard/step-2');
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
        onNext={() => router.push('/quote-wizard/step-2')}
        nextDisabled={!validateStep(1, state).valid}
      />
    </>
  );
}
