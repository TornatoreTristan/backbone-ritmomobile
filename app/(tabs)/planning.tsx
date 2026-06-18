import { HeaderSearchButton } from '@/components/header-search-button';
import { OrganizationGate } from '@/components/organization-gate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PressableCard } from '@/components/ui/card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import { useColors } from '@/hooks/use-theme-color';
import {
  INTERVENTION_STATUS_LABELS,
  INTERVENTION_STATUS_TONE,
  type Intervention,
  type PlanningDay,
  getPlanning,
} from '@/services/technician';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const dayHeaderFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (isSameDay(date, today)) return "Aujourd'hui";
  if (isSameDay(date, tomorrow)) return 'Demain';
  return dayHeaderFormatter.format(date);
}

function formatSlot(iso: string, durationMinutes: number): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
}

export default function PlanningScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader
          title="Planning"
          trailing={
            <HeaderSearchButton
              type="interventions"
              accessibilityLabel="Rechercher une intervention"
            />
          }
        />
        <OrganizationGate partnerOnly={false}>
          <PlanningView />
        </OrganizationGate>
      </SafeAreaView>
    </ThemedView>
  );
}

function PlanningView() {
  const router = useRouter();
  const colors = useColors();
  const [days, setDays] = useState<PlanningDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await getPlanning();
      setDays(data);
    } catch {
      setError('Impossible de charger le planning.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    load(true);
  }, [load]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <ThemedText tone="destructive" style={styles.errorText}>
          {error}
        </ThemedText>
        <Button variant="outline" size="sm" onPress={() => load()} style={styles.retry}>
          Réessayer
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, centeredContent]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.foreground}
        />
      }>
      {days.map((day) => (
        <DaySection
          key={day.date}
          day={day}
          onPressIntervention={(id) => router.push(`/interventions/${id}`)}
        />
      ))}
    </ScrollView>
  );
}

function DaySection({
  day,
  onPressIntervention,
}: {
  day: PlanningDay;
  onPressIntervention: (id: string) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="label" tone="mutedForeground" style={styles.sectionLabel}>
          {dayLabel(day.date)}
        </ThemedText>
        <ThemedText type="label" tone="mutedForeground">
          {day.interventions.length}
        </ThemedText>
      </View>

      {day.interventions.length === 0 ? (
        <ThemedText type="muted" style={styles.sectionEmpty}>
          Aucune intervention prévue.
        </ThemedText>
      ) : (
        <View style={styles.sectionList}>
          {day.interventions.map((intervention) => (
            <PlanningRow
              key={intervention.id}
              intervention={intervention}
              onPress={() => onPressIntervention(intervention.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function PlanningRow({
  intervention,
  onPress,
}: {
  intervention: Intervention;
  onPress: () => void;
}) {
  return (
    <PressableCard onPress={onPress}>
      <View style={styles.cardTop}>
        <ThemedText type="defaultSemiBold">
          {formatSlot(intervention.scheduledAt, intervention.durationMinutes)}
        </ThemedText>
        <Badge tone={INTERVENTION_STATUS_TONE[intervention.status]}>
          {INTERVENTION_STATUS_LABELS[intervention.status]}
        </Badge>
      </View>
      <ThemedText type="muted" numberOfLines={1}>
        {intervention.prestation} · {intervention.owner.name}
      </ThemedText>
      <ThemedText type="caption" tone="mutedForeground" numberOfLines={1}>
        {intervention.propertyAddress}
      </ThemedText>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 6,
  },
  errorText: { textAlign: 'center' },
  retry: { marginTop: 12 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
  },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sectionEmpty: { paddingHorizontal: 4 },
  sectionList: { gap: 10 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
