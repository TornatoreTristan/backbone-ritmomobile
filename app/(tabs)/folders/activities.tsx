import { FolderDock, type DockKey } from '@/components/folder-dock';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import { ApiError } from '@/services/api';
import {
  type ActivityStatus,
  type ActivityType,
  type FolderActivity,
  type FolderEmail,
  type FolderTimelineEntry,
  getFolderActivities,
  getFolderEmails,
  getFolderTimeline,
} from '@/services/folder-activities';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Segment = 'activites' | 'mail' | 'historique';

const SEGMENT_TITLES: Record<Segment, string> = {
  activites: 'Activités',
  mail: 'Mail',
  historique: 'Historique',
};

const TYPE_LABELS: Record<ActivityType, string> = {
  email: 'Email',
  phone: 'Appel',
  sms: 'SMS',
  meeting: 'Rendez-vous',
  diagnostic: 'Diagnostic',
  note: 'Note',
  other: 'Autre',
};

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TYPE_ICON: Record<ActivityType, IoniconName> = {
  email: 'mail',
  phone: 'call',
  sms: 'chatbubble-ellipses',
  meeting: 'calendar',
  diagnostic: 'clipboard',
  note: 'create',
  other: 'ellipsis-horizontal',
};

const TYPE_ACCENT: Record<ActivityType, string> = {
  email: '#2563EB',
  phone: '#16A34A',
  sms: '#0D9488',
  meeting: '#7C3AED',
  diagnostic: '#EA580C',
  note: '#64748B',
  other: '#64748B',
};

const STATUS_LABELS: Record<ActivityStatus, string> = {
  completed: 'Terminée',
  upcoming: 'À venir',
  overdue: 'En retard',
  pending: 'En attente',
};

const STATUS_TONE: Record<ActivityStatus, BadgeTone> = {
  completed: 'success',
  upcoming: 'info',
  overdue: 'destructive',
  pending: 'muted',
};

const EMAIL_STATUS_LABELS: Record<string, string> = {
  sent: 'Envoyé',
  delivered: 'Délivré',
  opened: 'Ouvert',
  clicked: 'Cliqué',
  bounced: 'Rejeté',
  failed: 'Échec',
  pending: 'En attente',
  queued: 'En file',
  complained: 'Spam',
};

const EMAIL_STATUS_TONE: Record<string, BadgeTone> = {
  sent: 'info',
  delivered: 'success',
  opened: 'success',
  clicked: 'success',
  bounced: 'destructive',
  failed: 'destructive',
  pending: 'muted',
  queued: 'muted',
  complained: 'warning',
};

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  return dateTimeFormatter.format(date);
}

export default function FolderActivitiesScreen() {
  const { folderId, tab } = useLocalSearchParams<{ folderId: string; tab?: string }>();
  const colors = useColors();
  const router = useRouter();

  const [segment, setSegment] = useState<Segment>(() =>
    tab === 'mail' || tab === 'historique' ? tab : 'activites',
  );
  const [activities, setActivities] = useState<FolderActivity[]>([]);
  const [emails, setEmails] = useState<FolderEmail[]>([]);
  const [timeline, setTimeline] = useState<FolderTimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!folderId) {
        setErrorMessage('Dossier introuvable.');
        setIsLoading(false);
        return;
      }
      if (!silent) setIsLoading(true);
      setErrorMessage(null);
      try {
        if (segment === 'activites') setActivities(await getFolderActivities(folderId));
        else if (segment === 'mail') setEmails(await getFolderEmails(folderId));
        else setTimeline(await getFolderTimeline(folderId));
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setErrorMessage("Accès refusé. Vous n'êtes pas autorisé à consulter ce dossier.");
        } else if (err instanceof ApiError && err.status === 404) {
          setErrorMessage('Dossier introuvable.');
        } else {
          setErrorMessage('Impossible de charger les données. Veuillez réessayer.');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [folderId, segment],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    load(true);
  }, [load]);

  const handleDock = useCallback(
    (key: DockKey) => {
      if (key === 'infos') {
        // Retour à la fiche du dossier ouvert (pas à l'accueil).
        router.navigate({ pathname: '/folders/[id]', params: { id: folderId } });
        return;
      }
      setSegment(key);
    },
    [router, folderId],
  );

  const isEmpty =
    (segment === 'activites' && activities.length === 0) ||
    (segment === 'mail' && emails.length === 0) ||
    (segment === 'historique' && timeline.length === 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          <ThemedText type="title" style={styles.topTitle}>
            {SEGMENT_TITLES[segment]}
          </ThemedText>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.foreground} />
          </View>
        ) : errorMessage ? (
          <View style={styles.center}>
            <ThemedText tone="destructive" style={styles.errorText}>
              {errorMessage}
            </ThemedText>
            <Button variant="outline" size="sm" onPress={() => load()} style={{ marginTop: 12 }}>
              Réessayer
            </Button>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, centeredContent]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.foreground}
              />
            }>
            {isEmpty ? (
              <ThemedText type="muted" style={styles.empty}>
                {segment === 'mail'
                  ? 'Aucun email'
                  : segment === 'historique'
                    ? 'Aucun événement'
                    : 'Aucune activité'}
              </ThemedText>
            ) : segment === 'activites' ? (
              <View style={styles.list}>
                {activities.map((a) => (
                  <ActivityCard key={a.id} activity={a} />
                ))}
              </View>
            ) : segment === 'mail' ? (
              <View style={styles.list}>
                {emails.map((e) => (
                  <EmailCard key={e.id} email={e} />
                ))}
              </View>
            ) : (
              <View style={styles.timeline}>
                {timeline.map((entry, idx) => (
                  <TimelineRow
                    key={entry.id}
                    entry={entry}
                    isLast={idx === timeline.length - 1}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}

        <FolderDock active={segment} onSelect={handleDock} />
      </SafeAreaView>
    </ThemedView>
  );
}

/** Rend un texte avec du **gras** markdown léger, sans afficher les astérisques. */
function RichText({ text, style }: { text: string; style?: object }) {
  const segments = text.split('**');
  return (
    <ThemedText style={style}>
      {segments.map((seg, i) =>
        i % 2 === 1 ? (
          <ThemedText key={i} style={styles.bold}>
            {seg}
          </ThemedText>
        ) : (
          seg
        ),
      )}
    </ThemedText>
  );
}

function FeedRow({
  icon,
  accent,
  title,
  badge,
  description,
  meta,
  onPress,
  openLabel,
}: {
  icon: IoniconName;
  accent: string;
  title: string;
  badge?: { label: string; tone: BadgeTone };
  description?: string | null;
  meta?: string;
  onPress?: () => void;
  openLabel?: string;
}) {
  const colors = useColors();

  const inner = (
    <View style={styles.cardRow}>
      <View style={[styles.iconCircle, { backgroundColor: accent + '1A' }]}>
        <Ionicons name={icon} size={17} color={accent} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle} numberOfLines={2}>
            {title}
          </ThemedText>
          {badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
        </View>
        {description ? <RichText text={description} style={styles.cardBody} /> : null}
        {meta ? (
          <ThemedText type="caption" tone="mutedForeground" style={styles.cardMeta}>
            {meta}
          </ThemedText>
        ) : null}
        {onPress && openLabel ? (
          <ThemedText type="caption" tone="primary" style={styles.openHint}>
            {openLabel} ↗
          </ThemedText>
        ) : null}
      </View>
      {onPress ? (
        <ThemedText style={[styles.cardChevron, { color: colors.mutedForeground }]}>›</ThemedText>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Card style={styles.card}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          style={({ pressed }) => pressed && { opacity: 0.6 }}>
          {inner}
        </Pressable>
      </Card>
    );
  }

  return <Card style={styles.card}>{inner}</Card>;
}

function ActivityCard({ activity }: { activity: FolderActivity }) {
  const meta = [TYPE_LABELS[activity.type], formatRelative(activity.createdAt), activity.author?.name]
    .filter(Boolean)
    .join(' · ');

  return (
    <FeedRow
      icon={TYPE_ICON[activity.type]}
      accent={TYPE_ACCENT[activity.type]}
      title={activity.subject}
      badge={{ label: STATUS_LABELS[activity.status], tone: STATUS_TONE[activity.status] }}
      description={activity.description}
      meta={meta}
    />
  );
}

function EmailCard({ email }: { email: FolderEmail }) {
  const tone = EMAIL_STATUS_TONE[email.status] ?? 'muted';
  const label = EMAIL_STATUS_LABELS[email.status] ?? email.status;
  const opens =
    email.opensCount > 0
      ? `${email.opensCount} ouverture${email.opensCount > 1 ? 's' : ''}${
          email.clicksCount > 0 ? ` · ${email.clicksCount} clic${email.clicksCount > 1 ? 's' : ''}` : ''
        }`
      : null;
  const meta = [formatRelative(email.sentAt ?? email.createdAt), email.recipient, opens]
    .filter(Boolean)
    .join(' · ');

  return (
    <FeedRow
      icon="mail"
      accent={TYPE_ACCENT.email}
      title={email.subject || '(sans objet)'}
      badge={{ label, tone }}
      meta={meta}
      onPress={email.previewUrl ? () => WebBrowser.openBrowserAsync(email.previewUrl!) : undefined}
      openLabel={email.previewUrl ? "Ouvrir l'email" : undefined}
    />
  );
}

function TimelineRow({ entry, isLast }: { entry: FolderTimelineEntry; isLast: boolean }) {
  const colors = useColors();
  const meta = [formatRelative(entry.createdAt), entry.author?.name].filter(Boolean).join(' · ');

  return (
    <View style={styles.tlRow}>
      <View style={styles.tlRail}>
        <View style={[styles.tlDot, { backgroundColor: colors.primary, borderColor: colors.background }]} />
        {!isLast ? <View style={[styles.tlLine, { backgroundColor: colors.border }]} /> : null}
      </View>
      <View style={[styles.tlContent, isLast && styles.tlContentLast]}>
        <RichText text={entry.description} style={styles.tlText} />
        {meta ? (
          <ThemedText type="caption" tone="mutedForeground">
            {meta}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  topTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 110,
    gap: 12,
  },
  list: {
    gap: 10,
  },
  card: {
    paddingVertical: 14,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  cardContent: {
    flex: 1,
    gap: 5,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  cardBody: {
    lineHeight: 20,
    opacity: 0.85,
  },
  cardMeta: {
    marginTop: 1,
  },
  openHint: {
    fontWeight: '600',
    marginTop: 2,
  },
  cardChevron: {
    fontSize: 26,
    lineHeight: 26,
    fontWeight: '400',
    marginTop: -2,
    alignSelf: 'center',
    flexShrink: 0,
  },
  bold: {
    fontWeight: '700',
  },
  timeline: {
    paddingTop: 4,
  },
  tlRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tlRail: {
    width: 16,
    alignItems: 'center',
  },
  tlDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 4,
  },
  tlLine: {
    width: 2,
    flex: 1,
    marginTop: 2,
    borderRadius: 1,
  },
  tlContent: {
    flex: 1,
    paddingBottom: 18,
    gap: 2,
  },
  tlContentLast: {
    paddingBottom: 0,
  },
  tlText: {
    lineHeight: 20,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 24,
  },
});
