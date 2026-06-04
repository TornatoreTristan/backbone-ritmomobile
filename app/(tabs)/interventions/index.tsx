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
  listInterventions,
} from '@/services/technician';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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

function InterventionsList() {
  const router = useRouter();
  const colors = useColors();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await listInterventions();
      setInterventions(data);
    } catch {
      setError('Impossible de charger les interventions.');
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

  const sorted = useMemo(
    () =>
      [...interventions].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      ),
    [interventions],
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
        <Button variant="outline" size="sm" onPress={() => load()} style={styles.retry}>
          Réessayer
        </Button>
      </View>
    );
  }

  return (
    <FlatList
      data={sorted}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        centeredContent,
        sorted.length === 0 && styles.listContentEmpty,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.foreground}
        />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <ThemedText type="muted">Aucune intervention assignée.</ThemedText>
        </View>
      }
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
        {intervention.owner.name}
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
