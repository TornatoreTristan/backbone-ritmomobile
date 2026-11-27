import { OrganizationGate } from '@/components/organization-gate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, PressableCard } from '@/components/ui/card';
import { StaleDataNotice } from '@/components/stale-data-notice';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_TONE } from '@/constants/status-maps';
import { useOrganization } from '@/contexts/organization-context';
import { useScreenResource } from '@/hooks/use-screen-resource';
import { useColors } from '@/hooks/use-theme-color';
import { type Invoice, getMyInvoices } from '@/services/invoices';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * Une date seule (`YYYY-MM-DD`) est lue comme minuit UTC par `new Date` : dans un
 * fuseau à l'ouest de Greenwich, le jour affiché serait la veille. On la
 * construit donc en heure locale.
 */
function formatDate(value: string | null): string | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (isNaN(date.getTime())) return null;
  return dateFormatter.format(date);
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
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  // Clé = organisation : la liste est rechargée au changement d'organisation et à
  // chaque retour sur l'onglet (une facture réglée entre-temps change de statut).
  const { data, isLoading, isRefreshing, error, refreshFailed, reload, refresh } =
    useScreenResource(
      currentOrganization?.id ?? null,
      () => getMyInvoices(),
      'Impossible de charger les factures.',
    );
  const invoices: Invoice[] = data ?? [];

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
          onRefresh={refresh}
          tintColor={colors.foreground}
        />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <ThemedText type="muted">Aucune facture pour le moment.</ThemedText>
        </View>
      }
      ListHeaderComponent={<StaleDataNotice visible={refreshFailed} />}
      renderItem={({ item }) => {
        const folderId = item.folderId;
        if (!folderId) {
          return (
            <Card>
              <InvoiceCardContent invoice={item} />
            </Card>
          );
        }
        return (
          <PressableCard
            onPress={() => router.push(`/folders/${folderId}`)}
            accessibilityLabel={`Facture ${item.reference}, ouvrir le dossier`}>
            <InvoiceCardContent invoice={item} />
          </PressableCard>
        );
      }}
    />
  );
}

function InvoiceCardContent({ invoice }: { invoice: Invoice }) {
  const issueDate = formatDate(invoice.issueDate);
  const dueDate = formatDate(invoice.dueDate);
  const dates = [
    issueDate ? `Émise le ${issueDate}` : null,
    dueDate ? `Échéance le ${dueDate}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <View style={styles.cardTop}>
        <ThemedText type="defaultSemiBold" style={styles.cardReference}>
          {invoice.reference}
        </ThemedText>
        <ThemedText type="defaultSemiBold">{formatPrice(invoice.amountTtc)}</ThemedText>
      </View>
      <View style={styles.cardBottom}>
        <ThemedText type="muted" style={styles.cardClient} numberOfLines={1}>
          {invoice.clientName ?? '—'}
        </ThemedText>
        <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>
          {INVOICE_STATUS_LABELS[invoice.status]}
        </Badge>
      </View>
      {dates ? (
        <ThemedText type="caption" tone="mutedForeground">
          {dates}
        </ThemedText>
      ) : null}
    </>
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
