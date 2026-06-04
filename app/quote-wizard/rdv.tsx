import { ThemedText } from '@/components/themed-text';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { Radius } from '@/constants/theme';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import { useOrganization } from '@/contexts/organization-context';
import { useColors } from '@/hooks/use-theme-color';
import {
  getOrganizationEmployees,
  type OrganizationEmployee,
} from '@/services/organization-employees';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

export default function RdvScreen() {
  const router = useRouter();
  const { state, update } = useQuoteWizard();
  const { currentOrganization } = useOrganization();
  const colors = useColors();

  const [employees, setEmployees] = useState<OrganizationEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrganization) return;
    setLoadingEmployees(true);
    setEmployeesError(null);
    getOrganizationEmployees(currentOrganization.id)
      .then(setEmployees)
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : 'Erreur lors du chargement des techniciens';
        setEmployeesError(msg);
      })
      .finally(() => setLoadingEmployees(false));
  }, [currentOrganization]);

  function toggleTechnician(id: string) {
    const current = state.staffTechnicianIds;
    const next = current.includes(id)
      ? current.filter((t) => t !== id)
      : [...current, id];
    update('staffTechnicianIds', next);
  }

  return (
    <>
      <WizardScreen
        title="Prise de rendez-vous"
        subtitle="Optionnel — vous pouvez planifier l'intervention plus tard."
        contentStyle={{ gap: 20 }}>

        <View style={styles.section}>
          <WizardField
            label="Date et heure"
            optional
            value={state.staffRdvDate ?? ''}
            onChangeText={(t) => update('staffRdvDate', t.trim() === '' ? null : t.trim())}
            placeholder="AAAA-MM-JJTHH:MM:SS.000Z"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Date et heure du rendez-vous au format ISO 8601"
          />
          <ThemedText style={[styles.fieldHint, { color: colors.mutedForeground }]}>
            Format ISO 8601 — ex : 2026-06-10T09:00:00.000Z
          </ThemedText>
        </View>

        <WizardField
          label="Durée (minutes)"
          optional
          value={state.staffRdvDurationMinutes}
          onChangeText={(t) => update('staffRdvDurationMinutes', t)}
          placeholder="60"
          keyboardType="number-pad"
          accessibilityLabel="Durée du rendez-vous en minutes"
        />

        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            Techniciens
            <ThemedText style={styles.optionalHint}>{' (optionnel)'}</ThemedText>
          </ThemedText>

          {loadingEmployees ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <ThemedText style={styles.loadingText}>Chargement des techniciens...</ThemedText>
            </View>
          ) : employeesError ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: colors.destructive + '18', borderColor: colors.destructive },
              ]}>
              <ThemedText style={[styles.errorText, { color: colors.destructive }]}>
                {employeesError}
              </ThemedText>
            </View>
          ) : employees.length === 0 ? (
            <ThemedText style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Aucun technicien disponible dans cette organisation.
            </ThemedText>
          ) : (
            <View style={styles.technicianList}>
              {employees.map((emp) => {
                const selected = state.staffTechnicianIds.includes(emp.id);
                return (
                  <Pressable
                    key={emp.id}
                    onPress={() => toggleTechnician(emp.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={emp.fullName}
                    style={[
                      styles.technicianRow,
                      {
                        backgroundColor: selected
                          ? colors.primary + '15'
                          : colors.surfaceSubtle,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary : 'transparent',
                        },
                      ]}>
                      {selected ? (
                        <ThemedText style={styles.checkmark}>✓</ThemedText>
                      ) : null}
                    </View>
                    <ThemedText style={styles.technicianName}>{emp.fullName}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={() => router.push('/quote-wizard/step-8')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6 },
  sectionLabel: { fontSize: 13, fontWeight: '500' },
  optionalHint: { fontSize: 13, opacity: 0.45, fontWeight: '400' },
  fieldHint: { fontSize: 12, marginTop: -2 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, opacity: 0.6 },
  errorBox: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: 14,
  },
  errorText: { fontSize: 13, lineHeight: 18 },
  emptyText: { fontSize: 13 },
  technicianList: { gap: 8 },
  technicianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 14,
  },
  technicianName: { fontSize: 14, fontWeight: '500', flex: 1 },
});
