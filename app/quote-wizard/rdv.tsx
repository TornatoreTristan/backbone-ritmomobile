import { ThemedText } from '@/components/themed-text';
import { WizardField } from '@/components/wizard/wizard-field';
import { WizardFooter } from '@/components/wizard/wizard-footer';
import { WizardScreen } from '@/components/wizard/wizard-screen';
import { DayPicker } from '@/components/wizard/scheduling/day-picker';
import { ManualRdvInput } from '@/components/wizard/scheduling/manual-rdv-input';
import { RdvSummaryBar } from '@/components/wizard/scheduling/rdv-summary-bar';
import { SlotGrid } from '@/components/wizard/scheduling/slot-grid';
import { TechnicianChips } from '@/components/wizard/scheduling/technician-chips';
import { Radius } from '@/constants/theme';
import { useOrganization } from '@/contexts/organization-context';
import { useQuoteWizard } from '@/contexts/quote-wizard-context';
import { useColors } from '@/hooks/use-theme-color';
import {
  getOrganizationEmployees,
  type OrganizationEmployee,
} from '@/services/organization-employees';
import {
  computeWorkingDays,
  fetchAvailabilityBatch,
  formatDayLabel,
  intersectSlots,
  type AvailabilityByDate,
  type AvailabilitySlot,
  type TechnicianAvailability,
} from '@/services/scheduling';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Computes the set of days that have at least one intersected available slot.
 * When no technicians are selected, a day is "available" if ANY tech has at
 * least one available slot on that day.
 */
function buildAvailableDays(
  availabilityByDate: AvailabilityByDate,
  selectedUserIds: string[],
): Set<string> {
  const available = new Set<string>();

  for (const [date, techs] of Object.entries(availabilityByDate)) {
    if (selectedUserIds.length === 0) {
      // No selection: available if any tech has any available slot
      const anyAvailable = techs.some((t) => t.slots.some((s) => s.available));
      if (anyAvailable) available.add(date);
    } else {
      // Selection: compute intersection for selected techs only
      const selectedTechs = techs.filter((t) =>
        selectedUserIds.includes(t.userId),
      );
      const intersection = intersectSlots(selectedTechs);
      if (intersection.length > 0) available.add(date);
    }
  }

  return available;
}

/**
 * Returns the intersected slots for the selected day.
 * If no technicians selected, returns all available slots from all techs
 * (union of available slots, deduplicated by start).
 */
function getSlotsForDay(
  availabilityByDate: AvailabilityByDate,
  date: string,
  selectedUserIds: string[],
): AvailabilitySlot[] {
  const techs: TechnicianAvailability[] = availabilityByDate[date] ?? [];

  if (selectedUserIds.length === 0) {
    // Union: collect all available slots from all techs, deduplicated by start
    const seen = new Set<string>();
    const slots: AvailabilitySlot[] = [];
    for (const tech of techs) {
      for (const slot of tech.slots) {
        if (slot.available && !seen.has(slot.start)) {
          seen.add(slot.start);
          slots.push(slot);
        }
      }
    }
    slots.sort((a, b) => a.start.localeCompare(b.start));
    return slots;
  }

  const selectedTechs = techs.filter((t) => selectedUserIds.includes(t.userId));
  return intersectSlots(selectedTechs);
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function RdvScreen() {
  const router = useRouter();
  const { state, update } = useQuoteWizard();
  const { currentOrganization } = useOrganization();
  const colors = useColors();

  // --- Employee loading ---
  const [employees, setEmployees] = useState<OrganizationEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  // --- Availability ---
  const [availabilityByDate, setAvailabilityByDate] = useState<AvailabilityByDate>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [noAgendas, setNoAgendas] = useState(false);

  // --- UI state ---
  const [workingDays] = useState<string[]>(() => computeWorkingDays(22));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  // Debounce ref for availability fetching
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sequence counter for race-condition guard (MAJ-3)
  const fetchIdRef = useRef(0);

  // Load employees once on mount
  useEffect(() => {
    if (!currentOrganization) return;
    setLoadingEmployees(true);
    setEmployeesError(null);
    getOrganizationEmployees(currentOrganization.id)
      .then(setEmployees)
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : 'Erreur lors du chargement des techniciens';
        setEmployeesError(msg);
      })
      .finally(() => setLoadingEmployees(false));
  }, [currentOrganization]);

  // MAJ-4: single shared fetch function called by both the effect and retryAvailability
  function doFetchAvailability(
    orgId: string,
    days: string[],
    userIds: string[],
    duration: number,
  ) {
    // MAJ-3: stamp this fetch with a unique id
    fetchIdRef.current += 1;
    const myFetchId = fetchIdRef.current;

    setLoadingAvailability(true);
    setAvailabilityError(null);
    setNoAgendas(false);

    fetchAvailabilityBatch(orgId, days, userIds, duration)
      .then((data) => {
        // MAJ-3: discard stale responses
        if (fetchIdRef.current !== myFetchId) return;

        setAvailabilityByDate(data);

        // Detect the "no agenda connected" case: all dates are present but
        // every tech has zero slots (empty slots array or all unavailable).
        const allEmpty = Object.values(data).every((techs) =>
          techs.every((t) => t.slots.length === 0),
        );
        setNoAgendas(allEmpty);

        // Auto-select first day with available slots
        const available = buildAvailableDays(data, userIds);
        const firstAvailable = days.find((d) => available.has(d));
        setSelectedDay(firstAvailable ?? days[0] ?? null);
      })
      .catch((err: unknown) => {
        if (fetchIdRef.current !== myFetchId) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Erreur lors du chargement des disponibilités';
        setAvailabilityError(msg);
      })
      .finally(() => {
        if (fetchIdRef.current !== myFetchId) return;
        setLoadingAvailability(false);
      });
  }

  // Fetch availability whenever selected techs or duration changes (debounced)
  useEffect(() => {
    if (!currentOrganization) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const duration =
        state.staffRdvDurationMinutes.trim() !== ''
          ? parseInt(state.staffRdvDurationMinutes.trim(), 10)
          : 60;

      if (isNaN(duration) || duration <= 0) return;

      // MAJ-2: reset previously chosen slot before launching the new fetch
      update('staffRdvDate', null);

      doFetchAvailability(
        currentOrganization.id,
        workingDays,
        state.staffTechnicianIds,
        duration,
      );
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization, state.staffTechnicianIds, state.staffRdvDurationMinutes]);

  function toggleTechnician(userId: string) {
    const current = state.staffTechnicianIds;
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    update('staffTechnicianIds', next);
  }

  function handleSelectSlot(slot: AvailabilitySlot) {
    update('staffRdvDate', slot.start);
  }

  function handleSelectDay(day: string) {
    setSelectedDay(day);
    // Clear the selected slot if it belongs to another day
    if (state.staffRdvDate && !state.staffRdvDate.startsWith(day)) {
      update('staffRdvDate', null);
    }
  }

  function retryAvailability() {
    if (!currentOrganization) return;
    const duration =
      state.staffRdvDurationMinutes.trim() !== ''
        ? parseInt(state.staffRdvDurationMinutes.trim(), 10)
        : 60;
    if (isNaN(duration) || duration <= 0) return;

    // MAJ-4: delegate entirely to the shared function (no duplication)
    doFetchAvailability(
      currentOrganization.id,
      workingDays,
      state.staffTechnicianIds,
      duration,
    );
  }

  // Derived values
  const availableDays = buildAvailableDays(availabilityByDate, state.staffTechnicianIds);
  const daySlots =
    selectedDay !== null
      ? getSlotsForDay(availabilityByDate, selectedDay, state.staffTechnicianIds)
      : [];

  // The start ISO of the currently selected slot (only valid if it matches
  // the selected day)
  const selectedSlotStart =
    state.staffRdvDate && selectedDay && state.staffRdvDate.startsWith(selectedDay)
      ? state.staffRdvDate
      : null;

  // Manual input value: ISO string or empty string
  const manualValue = state.staffRdvDate ?? '';

  return (
    <>
      <WizardScreen
        title="Prise de rendez-vous"
        subtitle="Optionnel — vous pouvez planifier l'intervention plus tard."
        contentStyle={{ gap: 20 }}>

        {/* Durée */}
        <WizardField
          label="Durée (minutes)"
          optional
          value={state.staffRdvDurationMinutes}
          onChangeText={(t) => update('staffRdvDurationMinutes', t)}
          placeholder="60"
          keyboardType="number-pad"
          accessibilityLabel="Durée du rendez-vous en minutes"
        />

        {/* Technicien chips */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            Techniciens
            <ThemedText style={[styles.optionalHint, { color: colors.mutedForeground }]}>
              {' (optionnel)'}
            </ThemedText>
          </ThemedText>

          {loadingEmployees ? (
            <View style={styles.row}>
              <ActivityIndicator size="small" color={colors.primary} />
              <ThemedText style={[styles.loadingText, { color: colors.mutedForeground }]}>
                Chargement des techniciens…
              </ThemedText>
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
            <TechnicianChips
              employees={employees}
              selectedUserIds={state.staffTechnicianIds}
              onToggle={toggleTechnician}
            />
          )}
        </View>

        {/* Agenda vide */}
        {noAgendas && !loadingAvailability ? (
          <View
            style={[
              styles.infoBox,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}>
            <ThemedText style={[styles.infoText, { color: colors.mutedForeground }]}>
              {`Aucun agenda connecté — les techniciens n'ont pas connecté leur Google Calendar. Vous pouvez saisir le RDV manuellement.`}
            </ThemedText>
          </View>
        ) : null}

        {/* Erreur availability */}
        {availabilityError && !loadingAvailability ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: colors.destructive + '18', borderColor: colors.destructive },
            ]}>
            <ThemedText style={[styles.errorText, { color: colors.destructive }]}>
              {availabilityError}
            </ThemedText>
            <Pressable
              onPress={retryAvailability}
              accessibilityRole="button"
              accessibilityLabel="Réessayer de charger les disponibilités"
              style={[styles.retryButton, { borderColor: colors.destructive }]}>
              <ThemedText style={[styles.retryText, { color: colors.destructive }]}>
                Réessayer
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {/* Day picker */}
        {!noAgendas ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Jours disponibles</ThemedText>
            <DayPicker
              days={workingDays}
              availableDays={availableDays}
              selectedDay={selectedDay}
              loading={loadingAvailability}
              onSelectDay={handleSelectDay}
            />
          </View>
        ) : null}

        {/* Slot grid */}
        {!noAgendas && !loadingAvailability && selectedDay !== null ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>
              Créneaux — {formatDayLabel(selectedDay)}
            </ThemedText>
            <SlotGrid
              slots={daySlots}
              selectedSlotStart={selectedSlotStart}
              onSelectSlot={handleSelectSlot}
            />
          </View>
        ) : null}

        {/* RDV summary */}
        <RdvSummaryBar
          rdvDate={state.staffRdvDate}
          durationMinutes={state.staffRdvDurationMinutes}
        />

        {/* Manual fallback link */}
        <Pressable
          onPress={() => setShowManual((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={
            showManual ? 'Masquer la saisie manuelle' : 'Saisir la date manuellement'
          }
          style={styles.manualLink}>
          <ThemedText style={[styles.manualLinkText, { color: colors.mutedForeground }]}>
            {showManual ? 'Masquer la saisie manuelle' : 'Saisir manuellement'}
          </ThemedText>
        </Pressable>

        {showManual ? (
          <ManualRdvInput
            value={manualValue}
            onChangeText={(t) => update('staffRdvDate', t === '' ? null : t)}
          />
        ) : null}

      </WizardScreen>

      <WizardFooter
        onBack={() => router.back()}
        onNext={() => router.push('/quote-wizard/step-8')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '500' },
  optionalHint: { fontSize: 13, fontWeight: '400' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13 },
  errorBox: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 10,
  },
  errorText: { fontSize: 13, lineHeight: 18 },
  retryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: { fontSize: 13, fontWeight: '600' },
  infoBox: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: 14,
  },
  infoText: { fontSize: 13, lineHeight: 18 },
  emptyText: { fontSize: 13 },
  manualLink: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  manualLinkText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
