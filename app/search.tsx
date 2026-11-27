import { Badge } from '@/components/ui/badge';
import { PressableCard } from '@/components/ui/card';
import { SearchBar } from '@/components/ui/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import {
  FOLDER_STATUS_LABELS,
  FOLDER_STATUS_TONE,
  INTERVENTION_STATUS_LABELS,
  INTERVENTION_STATUS_TONE,
} from '@/constants/status-maps';
import { useOrganization } from '@/contexts/organization-context';
import { useScreenResource } from '@/hooks/use-screen-resource';
import { useColors } from '@/hooks/use-theme-color';
import { type Folder, folderMatchesQuery, getMyFolders } from '@/services/folders';
import { normalizeForSearch } from '@/services/search';
import { getOrganizationFolders } from '@/services/staff-folders';
import {
  type Intervention,
  interventionMatchesQuery,
  listInterventions,
} from '@/services/technician';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

type SearchType = 'folders' | 'interventions';

// L'année est affichée : la recherche couvre tout l'historique, pas la semaine.
const dayMonthFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

function formatSlot(iso: string): string {
  const date = new Date(iso);
  return `${dayMonthFormatter.format(date)} · ${timeFormatter.format(date)}`;
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const type: SearchType = params.type === 'interventions' ? 'interventions' : 'folders';

  return (
    <ThemedView style={styles.container}>
      {type === 'folders' ? <FoldersResults /> : <InterventionsResults />}
    </ThemedView>
  );
}

function FoldersResults() {
  const router = useRouter();
  const colors = useColors();
  const { isStaff, currentOrganization } = useOrganization();
  const [query, setQuery] = useState('');

  const orgId = currentOrganization?.id ?? null;
  const { data, isLoading, error, reload } = useScreenResource(
    orgId ? `${isStaff ? 'staff' : 'me'}:${orgId}` : null,
    () => (isStaff && orgId ? getOrganizationFolders(orgId) : getMyFolders()),
    'Impossible de charger les dossiers.',
  );
  const folders: Folder[] = data ?? [];

  const normalizedQuery = normalizeForSearch(query);
  const results = normalizedQuery
    ? folders.filter((f) => folderMatchesQuery(f, normalizedQuery))
    : folders;

  return (
    <ResultsLayout
      placeholder="Rechercher par numéro, nom ou adresse"
      accessibilityLabel="Rechercher un dossier"
      query={query}
      onChangeQuery={setQuery}
      isLoading={isLoading}
      error={error}
      onRetry={reload}
      hasQuery={normalizedQuery.length > 0}
      totalCount={folders.length}
      resultsCount={results.length}
      emptyLabel="Aucun dossier trouvé."
      idleLabel="Saisissez un numéro, un nom ou une adresse pour rechercher."
      colors={colors}>
      {results.map((folder) => (
        <FolderResultRow
          key={folder.id}
          folder={folder}
          onPress={() => {
            Keyboard.dismiss();
            router.back();
            router.push(`/folders/${folder.id}`);
          }}
        />
      ))}
    </ResultsLayout>
  );
}

function InterventionsResults() {
  const router = useRouter();
  const colors = useColors();
  const { currentOrganization } = useOrganization();
  const [query, setQuery] = useState('');

  // Toutes les interventions du technicien, pas seulement la fenêtre du planning :
  // une intervention de la semaine passée doit rester trouvable.
  const { data, isLoading, error, reload } = useScreenResource(
    currentOrganization?.id ?? null,
    () => listInterventions(),
    'Impossible de charger les interventions.',
  );
  const interventions: Intervention[] = data ?? [];

  const normalizedQuery = normalizeForSearch(query);
  // Les plus récentes d'abord : c'est ce que l'on cherche le plus souvent.
  const results = (
    normalizedQuery
      ? interventions.filter((i) => interventionMatchesQuery(i, normalizedQuery))
      : interventions
  )
    .slice()
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return (
    <ResultsLayout
      placeholder="Rechercher par dossier, client, adresse ou prestation"
      accessibilityLabel="Rechercher une intervention"
      query={query}
      onChangeQuery={setQuery}
      isLoading={isLoading}
      error={error}
      onRetry={reload}
      hasQuery={normalizedQuery.length > 0}
      totalCount={interventions.length}
      resultsCount={results.length}
      emptyLabel="Aucune intervention trouvée."
      idleLabel="Saisissez un dossier, un client, une adresse ou une prestation pour rechercher."
      colors={colors}>
      {results.map((intervention) => (
        <InterventionResultRow
          key={intervention.id}
          intervention={intervention}
          onPress={() => {
            Keyboard.dismiss();
            router.back();
            router.push(`/interventions/${intervention.id}`);
          }}
        />
      ))}
    </ResultsLayout>
  );
}

type ResultsLayoutProps = {
  placeholder: string;
  accessibilityLabel: string;
  query: string;
  onChangeQuery: (next: string) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  hasQuery: boolean;
  totalCount: number;
  resultsCount: number;
  emptyLabel: string;
  idleLabel: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
};

function ResultsLayout({
  placeholder,
  accessibilityLabel,
  query,
  onChangeQuery,
  isLoading,
  error,
  onRetry,
  hasQuery,
  resultsCount,
  emptyLabel,
  idleLabel,
  colors,
  children,
}: ResultsLayoutProps) {
  return (
    <View style={styles.body}>
      <View style={[styles.searchHeader, centeredContent]}>
        <SearchBar
          value={query}
          onChangeText={onChangeQuery}
          onClear={() => onChangeQuery('')}
          placeholder={placeholder}
          accessibilityLabel={accessibilityLabel}
          autoFocus
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.foreground} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText tone="destructive" style={styles.errorText}>
            {error}
          </ThemedText>
          <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
            <ThemedText tone="primary" style={styles.retry}>
              Réessayer
            </ThemedText>
          </Pressable>
        </View>
      ) : !hasQuery ? (
        <View style={styles.center}>
          <ThemedText type="muted" style={styles.idleText}>
            {idleLabel}
          </ThemedText>
        </View>
      ) : resultsCount === 0 ? (
        <View style={styles.center}>
          <ThemedText type="muted">{emptyLabel}</ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, centeredContent]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <ThemedText type="label" tone="mutedForeground" style={styles.resultsCount}>
            {resultsCount} RÉSULTAT{resultsCount > 1 ? 'S' : ''}
          </ThemedText>
          <View style={styles.list}>{children}</View>
        </ScrollView>
      )}
    </View>
  );
}

function FolderResultRow({ folder, onPress }: { folder: Folder; onPress: () => void }) {
  return (
    <PressableCard onPress={onPress}>
      <View style={styles.rowTop}>
        <ThemedText type="defaultSemiBold" style={styles.flex1}>
          #{folder.reference}
        </ThemedText>
        <Badge tone={FOLDER_STATUS_TONE[folder.status]}>
          {FOLDER_STATUS_LABELS[folder.status]}
        </Badge>
      </View>
      <ThemedText type="muted" numberOfLines={1}>
        {folder.clientName}
      </ThemedText>
      {folder.propertyAddress ? (
        <ThemedText type="caption" tone="mutedForeground" numberOfLines={1}>
          {folder.propertyAddress}
        </ThemedText>
      ) : null}
    </PressableCard>
  );
}

function InterventionResultRow({
  intervention,
  onPress,
}: {
  intervention: Intervention;
  onPress: () => void;
}) {
  return (
    <PressableCard onPress={onPress}>
      <View style={styles.rowTop}>
        <ThemedText type="defaultSemiBold">{formatSlot(intervention.scheduledAt)}</ThemedText>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1 },
  searchHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 6,
  },
  errorText: { textAlign: 'center' },
  retry: { marginTop: 12, fontWeight: '500' },
  idleText: { textAlign: 'center' },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  resultsCount: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 4,
  },
  list: { gap: 10 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  flex1: { flex: 1 },
});
