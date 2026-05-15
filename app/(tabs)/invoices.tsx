import { OrganizationGate } from '@/components/organization-gate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import { useColors } from '@/hooks/use-theme-color';
import { type Invoice, type InvoiceStatus, getMyInvoices } from '@/services/invoices';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BadgeTone } from '@/components/ui/badge';

const STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  draft: 'muted',
  pending: 'warning',
  sent: 'info',
  paid: 'success',
  partially_paid: 'warning',
  overdue: 'destructive',
  cancelled: 'secondary',
  refunded: 'secondary',
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  sent: 'Envoyée',
  paid: 'Payée',
  partially_paid: 'Partiellement payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
};

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

export default function InvoicesScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Factures" />
        <OrganizationGate>
          <InvoicesList />
        </OrganizationGate>
      </SafeAreaView>
    </ThemedView>
  );
}

function InvoicesList() {
  const colors = useColors();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await getMyInvoices();
      setInvoices(data);
    } catch {
      setError('Impossible de charger les factures.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadInvoices(true);
  }, [loadInvoices]);

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
        <Button variant="outline" size="sm" onPress={() => loadInvoices()} style={styles.retry}>
          Réessayer
        </Button>
      </View>
    );
  }

  return (
    <FlatList
      data={invoices}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        centeredContent,
        invoices.length === 0 && styles.listContentEmpty,
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
          <ThemedText type="muted">Aucune facture pour le moment.</ThemedText>
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <View style={styles.cardTop}>
            <ThemedText type="defaultSemiBold" style={styles.cardReference}>
              {item.reference}
            </ThemedText>
            <ThemedText type="defaultSemiBold">{formatPrice(item.amountTtc)}</ThemedText>
          </View>
          <View style={styles.cardBottom}>
            <ThemedText type="muted" style={styles.cardClient} numberOfLines={1}>
              {item.clientName ?? '—'}
            </ThemedText>
            <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABELS[item.status]}</Badge>
          </View>
        </Card>
      )}
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
  cardReference: { flex: 1 },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardClient: { flex: 1 },
  retry: { marginTop: 12 },
});
