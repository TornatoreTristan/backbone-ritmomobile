import { HeaderSearchButton, type SearchTargetType } from '@/components/header-search-button';
import { OrganizationGate } from '@/components/organization-gate';
import { Badge } from '@/components/ui/badge';
import { PressableCard } from '@/components/ui/card';
import { StaleDataNotice } from '@/components/stale-data-notice';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import {
  FOLDER_STATUS_LABELS,
  FOLDER_STATUS_TONE,
  INTERVENTION_STATUS_LABELS,
  INTERVENTION_STATUS_TONE,
} from '@/constants/status-maps';
import { Radius } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { useScreenResource } from '@/hooks/use-screen-resource';
import { useColors } from '@/hooks/use-theme-color';
import { type Folder, getMyFolders } from '@/services/folders';
import { getOrganizationFolders } from '@/services/staff-folders';
import { type Intervention, listTodayInterventions } from '@/services/technician';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Un dossier n'est « terminé » que lorsqu'il est réglé (paiement enregistré) ou
 * archivé. Un devis signé (statut `deal`) reste actif tant qu'il n'est pas payé.
 */
function isFolderCompleted(folder: Folder): boolean {
  return folder.paidAt != null || folder.status === 'archived';
}

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

function formatPrice(raw: string | null): string | null {
  if (raw === null) return null;
  const num = Number(raw);
  if (isNaN(num)) return null;
  return priceFormatter.format(num);
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { isTechnician, isStaff } = useOrganization();
  const firstName = user?.fullName?.split(' ')[0];
  const searchType: SearchTargetType = isTechnician ? 'interventions' : 'folders';
  const searchAccessibility = isTechnician
    ? 'Rechercher une intervention'
    : 'Rechercher un dossier';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader
          eyebrow={firstName ? 'BONJOUR' : undefined}
          title={firstName ?? 'Bonjour'}
          trailing={
            <HeaderSearchButton type={searchType} accessibilityLabel={searchAccessibility} />
          }
        />
        <OrganizationGate partnerOnly={false}>
          {isTechnician ? (
            <TechnicianDashboard />
          ) : isStaff ? (
            <StaffDashboard />
          ) : (
            <PartnerDashboard />
          )}
        </OrganizationGate>
      </SafeAreaView>
    </ThemedView>
  );
}

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

function formatSlot(iso: string, durationMinutes: number): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <ThemedText tone="destructive" style={styles.errorText}>
        {message}
      </ThemedText>
      <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
        <ThemedText tone="primary" style={styles.retry}>
          Réessayer
        </ThemedText>
      </Pressable>
    </View>
  );
}

function TechnicianDashboard() {
  const router = useRouter();
  const colors = useColors();
  const { currentOrganization } = useOrganization();
  // L'API reçoit une fenêtre aujourd'hui → demain en dates seules : on ne garde
  // que les rendez-vous du jour pour que le compteur « AUJOURD'HUI » soit exact.
  const { data, isLoading, isRefreshing, error, refreshFailed, reload, refresh } =
    useScreenResource(
      currentOrganization?.id ?? null,
      async () => (await listTodayInterventions()).filter((i) => isToday(i.scheduledAt)),
      'Impossible de charger les interventions du jour.',
    );
  const interventions = data ?? [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (error) {
    return <LoadError message={error} onRetry={reload} />;
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, centeredContent]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          tintColor={colors.foreground}
        />
      }>
      <StaleDataNotice visible={refreshFailed} />
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="label" tone="mutedForeground" style={styles.sectionLabel}>
            AUJOURD&apos;HUI · {interventions.length}
          </ThemedText>
          <Pressable
            onPress={() => router.push('/planning')}
            hitSlop={8}
            accessibilityRole="button">
            <ThemedText
              type="small"
              style={[styles.sectionAction, { color: colors.foreground }]}>
              Voir le planning
            </ThemedText>
          </Pressable>
        </View>

        {interventions.length === 0 ? (
          <ThemedText type="muted" style={styles.sectionEmpty}>
            Aucune intervention prévue aujourd&apos;hui.
          </ThemedText>
        ) : (
          <View style={styles.sectionList}>
            {interventions.map((intervention) => (
              <TechnicianInterventionRow
                key={intervention.id}
                intervention={intervention}
                onPress={() => router.push(`/interventions/${intervention.id}`)}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function TechnicianInterventionRow({
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
        {intervention.owner?.name
          ? `${intervention.prestation} · ${intervention.owner.name}`
          : intervention.prestation}
      </ThemedText>
      <ThemedText type="caption" tone="mutedForeground" numberOfLines={1}>
        {intervention.propertyAddress}
      </ThemedText>
    </PressableCard>
  );
}

function splitFolders(folders: Folder[]): { active: Folder[]; completed: Folder[] } {
  const active: Folder[] = [];
  const completed: Folder[] = [];
  for (const folder of folders) {
    if (isFolderCompleted(folder)) completed.push(folder);
    else active.push(folder);
  }
  return { active, completed };
}

function PartnerDashboard() {
  const { currentOrganization } = useOrganization();
  const resource = useScreenResource(
    currentOrganization?.id ?? null,
    () => getMyFolders(),
    'Impossible de charger les dossiers.',
  );

  return (
    <FolderDashboard
      resource={resource}
      cta={(onPress) => <NewQuoteCta onPress={onPress} />}
      emptyText="Aucun dossier en cours."
    />
  );
}

function StaffDashboard() {
  const { currentOrganization } = useOrganization();
  // La clé est l'organisation : au changement d'organisation, les dossiers de la
  // précédente ne sont plus affichés et sa réponse tardive est ignorée.
  const resource = useScreenResource(
    currentOrganization?.id ?? null,
    (orgId) => getOrganizationFolders(orgId),
    'Impossible de charger les dossiers.',
  );

  return (
    <FolderDashboard
      resource={resource}
      cta={(onPress) => <CreateFolderCta onPress={onPress} />}
      emptyText="Aucun dossier en cours dans l’organisation."
    />
  );
}

function FolderDashboard({
  resource,
  cta,
  emptyText,
}: {
  resource: ReturnType<typeof useScreenResource<Folder[]>>;
  cta: (onPress: () => void) => React.ReactNode;
  emptyText: string;
}) {
  const router = useRouter();
  const colors = useColors();
  const [showCompleted, setShowCompleted] = useState(false);
  const { data, isLoading, isRefreshing, error, refreshFailed, reload, refresh } = resource;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (error) {
    return <LoadError message={error} onRetry={reload} />;
  }

  const { active, completed } = splitFolders(data ?? []);

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, centeredContent]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          tintColor={colors.foreground}
        />
      }>
      {cta(() => router.push('/quote-wizard/step-1'))}

      <StaleDataNotice visible={refreshFailed} />

      <Section
        label="EN COURS"
        count={active.length}
        items={active}
        emptyText={emptyText}
        onPressItem={(id) => router.push(`/folders/${id}`)}
      />

      {completed.length > 0 ? (
        <Section
          label="TERMINÉS"
          count={completed.length}
          items={showCompleted ? completed : []}
          trailingAction={{
            label: showCompleted ? 'Masquer' : 'Afficher',
            onPress: () => setShowCompleted((v) => !v),
          }}
          onPressItem={(id) => router.push(`/folders/${id}`)}
        />
      ) : null}
    </ScrollView>
  );
}

function CreateFolderCta({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Créer un nouveau dossier"
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: colors.primary },
        pressed && styles.ctaPressed,
      ]}>
      <View style={styles.ctaText}>
        <ThemedText
          type="label"
          style={[styles.ctaEyebrow, { color: colors.primaryForeground, opacity: 0.7 }]}>
          NOUVEAU
        </ThemedText>
        <ThemedText type="h3" style={{ color: colors.primaryForeground }}>
          Créer un dossier
        </ThemedText>
      </View>
      <View style={[styles.ctaCircle, { backgroundColor: colors.primaryForeground }]}>
        <ThemedText style={[styles.ctaPlus, { color: colors.primary }]}>+</ThemedText>
      </View>
    </Pressable>
  );
}

function NewQuoteCta({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Demander un nouveau devis"
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: colors.primary },
        pressed && styles.ctaPressed,
      ]}>
      <View style={styles.ctaText}>
        <ThemedText
          type="label"
          style={[styles.ctaEyebrow, { color: colors.primaryForeground, opacity: 0.7 }]}>
          NOUVEAU
        </ThemedText>
        <ThemedText
          type="h3"
          style={{ color: colors.primaryForeground }}>
          Demander un nouveau devis
        </ThemedText>
      </View>
      <View
        style={[styles.ctaCircle, { backgroundColor: colors.primaryForeground }]}>
        <ThemedText
          style={[styles.ctaPlus, { color: colors.primary }]}>
          +
        </ThemedText>
      </View>
    </Pressable>
  );
}

interface SectionProps {
  label: string;
  count: number;
  items: Folder[];
  emptyText?: string;
  trailingAction?: { label: string; onPress: () => void };
  onPressItem: (id: string) => void;
}

function Section({
  label,
  count,
  items,
  emptyText,
  trailingAction,
  onPressItem,
}: SectionProps) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="label" tone="mutedForeground" style={styles.sectionLabel}>
          {label} · {count}
        </ThemedText>
        {trailingAction ? (
          <Pressable onPress={trailingAction.onPress} hitSlop={8} accessibilityRole="button">
            <ThemedText
              type="small"
              style={[styles.sectionAction, { color: colors.foreground }]}>
              {trailingAction.label}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {items.length === 0 ? (
        emptyText ? (
          <ThemedText type="muted" style={styles.sectionEmpty}>
            {emptyText}
          </ThemedText>
        ) : null
      ) : (
        <View style={styles.sectionList}>
          {items.map((item) => (
            <FolderRow key={item.id} folder={item} onPress={() => onPressItem(item.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

function FolderRow({ folder, onPress }: { folder: Folder; onPress: () => void }) {
  const price = formatPrice(folder.finalPriceTtc);
  return (
    <PressableCard onPress={onPress}>
      <View style={styles.cardTop}>
        <ThemedText type="defaultSemiBold" style={styles.cardReference}>
          #{folder.reference}
        </ThemedText>
        {price !== null ? <ThemedText type="defaultSemiBold">{price}</ThemedText> : null}
      </View>
      <ThemedText type="muted" numberOfLines={1}>
        {folder.clientName}
      </ThemedText>
      {folder.propertyAddress ? (
        <ThemedText type="caption" tone="mutedForeground" numberOfLines={1}>
          {folder.propertyAddress}
        </ThemedText>
      ) : null}
      {folder.prestations.length > 0 ? (
        <View style={styles.prestationList}>
          {folder.prestations.map((prestation) => (
            <PrestationBadge key={prestation.id} prestation={prestation} />
          ))}
        </View>
      ) : null}
      <View style={styles.cardFooter}>
        <Badge tone={FOLDER_STATUS_TONE[folder.status]}>
          {FOLDER_STATUS_LABELS[folder.status]}
        </Badge>
      </View>
    </PressableCard>
  );
}

function PrestationBadge({ prestation }: { prestation: Folder['prestations'][number] }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.prestationBadge,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}>
      {prestation.iconUrl ? (
        <Image
          source={{ uri: prestation.iconUrl }}
          style={styles.prestationIcon}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <ThemedText style={[styles.prestationLabel, { color: colors.foreground }]}>
        {prestation.name}
      </ThemedText>
    </View>
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
  retry: { marginTop: 12, fontWeight: '500' },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: Radius.xl,
  },
  ctaPressed: { opacity: 0.9 },
  ctaText: { flex: 1, gap: 4 },
  ctaEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  ctaCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPlus: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '500',
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
  sectionAction: {
    fontWeight: '500',
  },
  sectionEmpty: {
    paddingHorizontal: 4,
  },
  sectionList: { gap: 10 },
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
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  prestationList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  prestationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  prestationIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  prestationLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
