import { OrganizationGate } from '@/components/organization-gate';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import { useColors } from '@/hooks/use-theme-color';
import { type NetworkPartner, type PartnerType, getMyNetworks } from '@/services/networks';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPE_TONE: Record<PartnerType, BadgeTone> = {
  independent: 'info',
  network: 'secondary',
  agency: 'warning',
};

const TYPE_LABELS: Record<PartnerType, string> = {
  independent: 'Indépendant',
  network: 'Réseau',
  agency: 'Agence',
};

export default function NetworksScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Réseaux" />
        <OrganizationGate>
          <NetworkList />
        </OrganizationGate>
      </SafeAreaView>
    </ThemedView>
  );
}

function NetworkList() {
  const colors = useColors();
  const [partners, setPartners] = useState<NetworkPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNetworks = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await getMyNetworks();
      setPartners(data);
    } catch {
      setError('Impossible de charger le réseau.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNetworks();
  }, [loadNetworks]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadNetworks(true);
  }, [loadNetworks]);

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
        <Button variant="outline" size="sm" onPress={() => loadNetworks()} style={styles.retry}>
          Réessayer
        </Button>
      </View>
    );
  }

  return (
    <FlatList
      data={partners}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        centeredContent,
        partners.length === 0 && styles.listContentEmpty,
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
          <ThemedText type="muted">Personne dans votre réseau pour le moment.</ThemedText>
        </View>
      }
      renderItem={({ item }) => {
        const contextLabel = item.networkName ?? null;
        return (
          <Card>
            <View style={styles.cardTop}>
              <ThemedText type="defaultSemiBold" style={styles.cardName}>
                {item.fullName}
              </ThemedText>
              <Badge tone={TYPE_TONE[item.type]}>{TYPE_LABELS[item.type]}</Badge>
            </View>
            <View style={styles.cardBottom}>
              <ThemedText type="muted" style={styles.cardEmail} numberOfLines={1}>
                {item.email ?? '—'}
              </ThemedText>
              {contextLabel ? <ThemedText type="muted">{contextLabel}</ThemedText> : null}
            </View>
          </Card>
        );
      }}
    />
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
  cardName: { flex: 1 },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardEmail: { flex: 1 },
  retry: { marginTop: 12 },
});
