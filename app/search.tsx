import { Badge } from '@/components/ui/badge';
import { PressableCard } from '@/components/ui/card';
import { SearchBar } from '@/components/ui/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import { useOrganization } from '@/contexts/organization-context';
import { useColors } from '@/hooks/use-theme-color';
import {
  type Folder,
  type FolderStatus,
  folderMatchesQuery,
  getMyFolders,
} from '@/services/folders';
import { normalizeForSearch } from '@/services/search';
import { getOrganizationFolders } from '@/services/staff-folders';
import {
  INTERVENTION_STATUS_LABELS,
  INTERVENTION_STATUS_TONE,
  type Intervention,
  getPlanning,
  interventionMatchesQuery,
} from '@/services/technician';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

type SearchType = 'folders' | 'interventions';

const STATUS_TONE: Record<FolderStatus, 'muted' | 'info' | 'success' | 'secondary'> = {
  draft: 'muted',
  lead: 'info',
  deal: 'success',
  archived: 'secondary',
};

const STATUS_LABELS: Record<FolderStatus, string> = {
  draft: 'Brouillon',
  lead: 'Prospect',
  deal: 'Conclu',
  archived: 'Archivé',
};

const dayMonthFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const orgId = currentOrganization?.id ?? null;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = isStaff && orgId ? await getOrganizationFolders(orgId) : await getMyFolders();
      setFolders(data);
    } catch {
      setError('Impossible de charger les dossiers.');
    } finally {
      setIsLoading(false);
    }
  }, [isStaff, orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const normalizedQuery = useMemo(() => normalizeForSearch(query), [query]);
  const results = useMemo(() => {
    if (!normalizedQuery) return folders;
    return folders.filter((f) => folderMatchesQuery(f, normalizedQuery));
  }, [folders, normalizedQuery]);

  return (
    <ResultsLayout
      placeholder="Rechercher par numéro, nom ou adresse"
      accessibilityLabel="Rechercher un dossier"
      query={query}
      onChangeQuery={setQuery}
      isLoading={isLoading}
      error={error}
      onRetry={load}
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
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const days = await getPlanning();
      const flat: Intervention[] = [];
      for (const day of days) {
        for (const i of day.interventions) flat.push(i);
      }
      setInterventions(flat);
    } catch {
      setError('Impossible de charger les interventions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const normalizedQuery = useMemo(() => normalizeForSearch(query), [query]);
  const results = useMemo(() => {
    if (!normalizedQuery) return interventions;
    return interventions.filter((i) => interventionMatchesQuery(i, normalizedQuery));
  }, [interventions, normalizedQuery]);

  return (
    <ResultsLayout
      placeholder="Rechercher par dossier, client, adresse ou prestation"
      accessibilityLabel="Rechercher une intervention"
      query={query}
      onChangeQuery={setQuery}
      isLoading={isLoading}
      error={error}
      onRetry={load}
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
          <Pressable onPress={onRetry} hitSlop={8}>
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
        <Badge tone={STATUS_TONE[folder.status]}>{STATUS_LABELS[folder.status]}</Badge>
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
