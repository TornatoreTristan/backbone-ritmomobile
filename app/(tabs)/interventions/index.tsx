import { OrganizationGate } from '@/components/organization-gate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PressableCard } from '@/components/ui/card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StaleDataNotice } from '@/components/stale-data-notice';
import { centeredContent } from '@/constants/layout';
import { INTERVENTION_STATUS_LABELS, INTERVENTION_STATUS_TONE } from '@/constants/status-maps';
import { useOrganization } from '@/contexts/organization-context';
import { useScreenResource } from '@/hooks/use-screen-resource';
import { useColors } from '@/hooks/use-theme-color';
import { type Intervention, listInterventions } from '@/services/technician';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const dayFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

function formatSlot(iso: string, durationMinutes: number): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
}

export default function InterventionsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Interventions" />
        <OrganizationGate partnerOnly={false}>
          <InterventionsList />
        </OrganizationGate>
      </SafeAreaView>
    </ThemedView>
  );
}

type InterventionSection = { title: string; data: Intervention[] };

function startTime(intervention: Intervention): number {
  return new Date(intervention.scheduledAt).getTime();
}

/**
 * À venir d'abord (de la plus proche à la plus lointaine), puis l'historique
 * (de la plus récente à la plus ancienne). Une intervention reste « à venir »
 * jusqu'à la fin de son créneau, sauf si elle est terminée ou annulée.
 */
function buildSections(interventions: Intervention[]): InterventionSection[] {
  const now = Date.now();
  const upcoming: Intervention[] = [];
  const past: Intervention[] = [];
  for (const intervention of interventions) {
    const end = startTime(intervention) + intervention.durationMinutes * 60_000;
    const isClosed = intervention.status === 'completed' || intervention.status === 'cancelled';
    if (!isClosed && end >= now) upcoming.push(intervention);
    else past.push(intervention);
  }
  upcoming.sort((a, b) => startTime(a) - startTime(b));
  past.sort((a, b) => startTime(b) - startTime(a));

  const sections: InterventionSection[] = [];
  if (upcoming.length > 0) sections.push({ title: 'À venir', data: upcoming });
  if (past.length > 0) sections.push({ title: 'Passées', data: past });
  return sections;
}

function InterventionsList() {
  const router = useRouter();
  const colors = useColors();
  const { currentOrganization } = useOrganization();
  const { data, isLoading, isRefreshing, error, refreshFailed, reload, refresh } =
    useScreenResource(
      currentOrganization?.id ?? null,
      () => listInterventions(),
      'Impossible de charger les interventions.',
    );

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
        <Button variant="outline" size="sm" onPress={reload} style={styles.retry}>
          Réessayer
        </Button>
      </View>
    );
  }

  const sections = buildSections(data ?? []);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={[
        styles.listContent,
        centeredContent,
        sections.length === 0 && styles.listContentEmpty,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          tintColor={colors.foreground}
        />
      }
      ListHeaderComponent={<StaleDataNotice visible={refreshFailed} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <ThemedText type="muted">Aucune intervention assignée.</ThemedText>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <ThemedText
          type="label"
          tone="mutedForeground"
          style={styles.sectionLabel}
          accessibilityRole="header">
          {section.title} · {section.data.length}
        </ThemedText>
      )}
      renderItem={({ item }) => (
        <InterventionRow
          intervention={item}
          onPress={() => router.push(`/interventions/${item.id}`)}
        />
      )}
    />
  );
}

function InterventionRow({
  intervention,
  onPress,
}: {
  intervention: Intervention;
  onPress: () => void;
}) {
  return (
    <PressableCard onPress={onPress}>
      <View style={styles.cardTop}>
        <ThemedText type="defaultSemiBold" style={styles.cardReference}>
          {intervention.prestation}
        </ThemedText>
        <Badge tone={INTERVENTION_STATUS_TONE[intervention.status]}>
          {INTERVENTION_STATUS_LABELS[intervention.status]}
        </Badge>
      </View>
      <ThemedText type="muted" numberOfLines={1}>
        {intervention.owner?.name ?? '—'}
      </ThemedText>
      <ThemedText type="caption" tone="mutedForeground" numberOfLines={1}>
        {intervention.propertyAddress}
      </ThemedText>
      <View style={styles.cardFooter}>
        <ThemedText type="small" tone="mutedForeground">
          {dayFormatter.format(new Date(intervention.scheduledAt))}
        </ThemedText>
        <ThemedText type="small" tone="mutedForeground">
          {formatSlot(intervention.scheduledAt, intervention.durationMinutes)}
        </ThemedText>
      </View>
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  listContentEmpty: { flex: 1 },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardReference: { flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  retry: { marginTop: 12 },
});
