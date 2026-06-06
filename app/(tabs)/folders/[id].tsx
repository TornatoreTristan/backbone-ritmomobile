import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL } from '@/constants/api';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-theme-color';
import { ApiError } from '@/services/api';
import { centeredContent } from '@/constants/layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type FolderCategory,
  type FolderDetail,
  type FolderFile,
  type FolderFileCategory,
  type FolderInterventionSummary,
  type FolderInvoiceSummary,
  type FolderQuoteSummary,
  type FolderReport,
  type FolderStatus,
  type InterventionStatus,
  type InvoiceStatus,
  type QuoteStatus,
  getFolderById,
  getFolderFiles,
  getFolderReports,
  uploadFolderFile,
} from '@/services/folders';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

const STATUS_TONE: Record<FolderStatus, BadgeTone> = {
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

const CATEGORY_LABELS: Record<FolderCategory, string> = {
  document: 'Document',
  diagnostic: 'Diagnostic',
  photo: 'Photo',
  invoice: 'Facture',
  quote: 'Devis',
  contract: 'Contrat',
  other: 'Autre',
};

const CATEGORY_ICONS: Record<FolderCategory, string> = {
  document: 'DOC',
  diagnostic: 'DGN',
  photo: 'IMG',
  invoice: 'FAC',
  quote: 'DEV',
  contract: 'CTR',
  other: 'FIL',
};

const QUOTE_STATUS_TONE: Record<QuoteStatus, BadgeTone> = {
  draft: 'muted',
  pending: 'info',
  sent: 'info',
  accepted: 'success',
  rejected: 'destructive',
  expired: 'secondary',
  converted: 'success',
  canceled: 'muted',
};

const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
  converted: 'Converti',
  canceled: 'Annulé',
};

const INVOICE_STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  draft: 'muted',
  pending: 'info',
  sent: 'info',
  paid: 'success',
  partially_paid: 'warning',
  overdue: 'destructive',
  cancelled: 'muted',
  refunded: 'secondary',
};

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  sent: 'Envoyée',
  paid: 'Payée',
  partially_paid: 'Partiellement payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
};

const INTERVENTION_STATUS_TONE: Record<InterventionStatus, BadgeTone> = {
  scheduled: 'info',
  confirmed: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'destructive',
  rescheduled: 'warning',
};

const INTERVENTION_STATUS_LABELS: Record<InterventionStatus, string> = {
  scheduled: 'Planifiée',
  confirmed: 'Confirmée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
  rescheduled: 'Reprogrammée',
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  return dateTimeFormatter.format(date);
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  return dateFormatter.format(date);
}

function formatAmount(value: number): string {
  return priceFormatter.format(value);
}

function formatPercent(value: number): string {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${rounded}%`;
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

function formatClientAddress(folder: FolderDetail): string | null {
  const cityPart = [folder.clientPostalCode, folder.clientCity].filter(Boolean).join(' ').trim();
  if (folder.clientAddress) {
    return cityPart ? `${folder.clientAddress}, ${cityPart}` : folder.clientAddress;
  }
  return cityPart || null;
}

function pickMainIntervention(
  interventions: FolderInterventionSummary[],
): FolderInterventionSummary | null {
  if (interventions.length === 0) return null;
  const completed = interventions.filter((i) => i.status === 'completed');
  if (completed.length > 0) return completed[completed.length - 1];
  const active = interventions.filter((i) => i.status !== 'cancelled');
  return active[0] ?? interventions[0];
}

function formatDuration(minutes: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins}`;
}

type StepState = 'done' | 'current' | 'upcoming';

type ProgressStep = {
  key: string;
  label: string;
  date: string | null;
  reached: boolean;
};

/**
 * Suivi d'avancement — repris du portail web partenaire (Créé → Devis →
 * Intervention → Rapport → Réglé). On le dérive des données exposées au mobile :
 * devis, factures payées et rapports (fichiers diagnostic).
 */
function buildSteps(folder: FolderDetail, reports: FolderReport[]): ProgressStep[] {
  const hasQuote = folder.quotes.length > 0;
  const hasReport = reports.length > 0;
  const isPaid =
    folder.paidAt != null || folder.invoices.some((invoice) => invoice.status === 'paid');

  const interventions = folder.interventions ?? [];
  const mainIntervention = pickMainIntervention(interventions);
  const interventionDone = interventions.some((i) => i.status === 'completed');
  const interventionReached =
    interventions.length > 0 && (interventionDone || hasReport || isPaid);
  const interventionDate = formatDate(
    mainIntervention?.completedAt ?? mainIntervention?.scheduledAt ?? null,
  );

  return [
    { key: 'created', label: 'Créé', date: formatDate(folder.createdAt), reached: true },
    {
      key: 'quote',
      label: 'Devis',
      date: hasQuote ? formatDate(folder.quotes[0].issueDate) : null,
      reached: hasQuote,
    },
    {
      key: 'intervention',
      label: 'Intervention',
      date: interventionDate,
      reached: interventionReached,
    },
    {
      key: 'report',
      label: 'Rapport',
      date: hasReport ? formatDate(reports[0].createdAt) : null,
      reached: hasReport,
    },
    { key: 'paid', label: 'Réglé', date: null, reached: isPaid },
  ];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function categoryFromMime(mimeType: string): FolderFileCategory {
  if (mimeType.startsWith('image/')) return 'photo';
  return 'document';
}

type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
};

async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
  };
}

async function pickFromGallery(): Promise<PickedFile | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission refusée',
      "Autorisez l'accès à la galerie dans les réglages de votre iPhone pour joindre des photos.",
    );
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsMultipleSelection: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const filename = asset.fileName ?? `photo-${Date.now()}.jpg`;
  const mimeType = asset.mimeType ?? 'image/jpeg';
  return { uri: asset.uri, name: filename, mimeType };
}

async function pickFromCamera(): Promise<PickedFile | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission refusée',
      "Autorisez l'accès à l'appareil photo dans les réglages de votre iPhone pour prendre des photos.",
    );
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.85,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const filename = asset.fileName ?? `photo-${Date.now()}.jpg`;
  const mimeType = asset.mimeType ?? 'image/jpeg';
  return { uri: asset.uri, name: filename, mimeType };
}

type ScreenData = {
  folder: FolderDetail;
  files: FolderFile[];
  reports: FolderReport[];
};

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();

  const [data, setData] = useState<ScreenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [folder, files, reports] = await Promise.all([
          getFolderById(id),
          getFolderFiles(id),
          // Les rapports sont secondaires : un échec (ou backend non déployé) ne
          // doit pas bloquer l'affichage du dossier.
          getFolderReports(id).catch(() => [] as FolderReport[]),
        ]);
        setData({ folder, files, reports });
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setErrorMessage("Accès refusé. Vous n'êtes pas autorisé à consulter ce dossier.");
        } else if (err instanceof ApiError && err.status === 404) {
          setErrorMessage('Dossier introuvable.');
        } else {
          setErrorMessage('Impossible de charger le dossier. Veuillez réessayer.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [id]);

  const reloadFiles = useCallback(async () => {
    try {
      const files = await getFolderFiles(id);
      setData((prev) => (prev ? { ...prev, files } : prev));
    } catch {
      // échec silencieux — la liste existante reste affichée
    }
  }, [id]);

  const handleUpload = useCallback(
    async (picked: PickedFile) => {
      setIsUploading(true);
      try {
        const category = categoryFromMime(picked.mimeType);
        await uploadFolderFile(id, picked, category);
        await reloadFiles();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Une erreur est survenue.';
        Alert.alert("Erreur lors de l'upload", message);
      } finally {
        setIsUploading(false);
      }
    },
    [id, reloadFiles],
  );

  const openFilePicker = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Document', 'Photo de la galerie', 'Prendre une photo'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          let picked: PickedFile | null = null;
          if (buttonIndex === 1) picked = await pickDocument();
          else if (buttonIndex === 2) picked = await pickFromGallery();
          else if (buttonIndex === 3) picked = await pickFromCamera();
          if (picked) await handleUpload(picked);
        },
      );
    } else {
      Alert.alert('Ajouter un fichier', 'Choisissez une source', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Document',
          onPress: async () => {
            const picked = await pickDocument();
            if (picked) await handleUpload(picked);
          },
        },
        {
          text: 'Photo de la galerie',
          onPress: async () => {
            const picked = await pickFromGallery();
            if (picked) await handleUpload(picked);
          },
        },
        {
          text: 'Prendre une photo',
          onPress: async () => {
            const picked = await pickFromCamera();
            if (picked) await handleUpload(picked);
          },
        },
      ]);
    }
  }, [handleUpload]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <BackBar onBack={() => router.back()} />
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.foreground} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (errorMessage || !data) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <BackBar onBack={() => router.back()} />
          <View style={styles.center}>
            <ThemedText tone="destructive" style={styles.errorText}>
              {errorMessage ?? 'Une erreur est survenue.'}
            </ThemedText>
            <Button variant="outline" size="sm" onPress={() => router.back()} style={{ marginTop: 12 }}>
              Retour
            </Button>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { folder, files, reports } = data;
  const priceHt = formatPrice(folder.finalPriceHt);
  const priceTtc = formatPrice(folder.finalPriceTtc);
  const discountTtc = folder.discountAmountTtc ?? 0;
  const discountPercent = folder.discountPercent ?? 0;
  const hasDiscount = discountTtc > 0 || discountPercent > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <BackBar onBack={() => router.back()} />
        <ScrollView contentContainerStyle={[styles.scrollContent, centeredContent]} showsVerticalScrollIndicator={false}>
        <FolderHeader folder={folder} />

        <ProgressTimeline folder={folder} reports={reports} />

        {(folder.interventions?.length ?? 0) > 0 ? (
          <Section title="Intervention">
            {folder.interventions.map((intervention, idx) => (
              <View key={intervention.id}>
                {idx > 0 ? <Separator /> : null}
                <InterventionRow intervention={intervention} />
              </View>
            ))}
          </Section>
        ) : null}

        {priceHt || priceTtc || hasDiscount ? (
          <Section title="Montants">
            {hasDiscount && folder.originalPriceTtc ? (
              <InfoRow label="Prix initial TTC" value={formatAmount(folder.originalPriceTtc)} muted />
            ) : null}
            {hasDiscount ? (
              <DiscountRow amountTtc={discountTtc} percent={folder.discountPercent} />
            ) : null}
            {priceHt ? <InfoRow label="Prix HT" value={priceHt} /> : null}
            {priceTtc ? <InfoRow label="Prix TTC" value={priceTtc} /> : null}
          </Section>
        ) : null}

        {folder.prestations.length > 0 ? (
          <Section title="Prestations">
            <View style={styles.prestationList}>
              {folder.prestations.map((prestation) => (
                <PrestationBadge key={prestation.id} prestation={prestation} />
              ))}
            </View>
          </Section>
        ) : null}

        <Section title="Bien immobilier">
          {folder.propertyAddress ? (
            <InfoRow label="Adresse" value={folder.propertyAddress} />
          ) : (
            <ThemedText type="muted">Adresse non renseignée</ThemedText>
          )}
        </Section>

        <Section title="Informations client">
          <InfoRow label="Nom" value={folder.clientName} />
          {folder.clientEmail ? <InfoRow label="Email" value={folder.clientEmail} /> : null}
          {folder.clientPhone ? <InfoRow label="Téléphone" value={folder.clientPhone} /> : null}
          {formatClientAddress(folder) ? (
            <InfoRow label="Adresse" value={formatClientAddress(folder)!} />
          ) : null}
        </Section>

        {folder.partnerNotes ? (
          <Section title="Notes">
            <ThemedText style={styles.notes}>{folder.partnerNotes}</ThemedText>
          </Section>
        ) : null}

        <Section title="Devis">
          {folder.quotes.length === 0 ? (
            <ThemedText type="muted" style={styles.emptyFiles}>
              Aucun devis
            </ThemedText>
          ) : (
            folder.quotes.map((quote, idx) => (
              <View key={quote.id}>
                {idx > 0 ? <Separator /> : null}
                <QuoteRow quote={quote} />
              </View>
            ))
          )}
        </Section>

        <Section title="Factures">
          {folder.invoices.length === 0 ? (
            <ThemedText type="muted" style={styles.emptyFiles}>
              Aucune facture
            </ThemedText>
          ) : (
            folder.invoices.map((invoice, idx) => (
              <View key={invoice.id}>
                {idx > 0 ? <Separator /> : null}
                <InvoiceRow invoice={invoice} />
              </View>
            ))
          )}
        </Section>

        <Section title="Rapports">
          {reports.length === 0 ? (
            <ThemedText type="muted" style={styles.emptyFiles}>
              Aucun rapport
            </ThemedText>
          ) : (
            <View>
              {reports.map((report, idx) => (
                <View key={report.id}>
                  {idx > 0 ? <Separator /> : null}
                  <ReportRow report={report} />
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="Fichiers">
          <ThemedText type="muted" style={styles.fileHelp}>
            Ajoutez des documents clients comme les anciens diagnostics, factures de rénovation, etc.
          </ThemedText>
          <AddFileButton onPress={openFilePicker} isUploading={isUploading} />
          {files.length === 0 ? (
            <ThemedText type="muted" style={styles.emptyFiles}>
              Aucun fichier
            </ThemedText>
          ) : (
            <View style={{ marginTop: 4 }}>
              {files.map((file, idx) => (
                <View key={file.id}>
                  {idx > 0 ? <Separator /> : null}
                  <FileRow file={file} />
                </View>
              ))}
            </View>
          )}
        </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function FolderHeader({ folder }: { folder: FolderDetail }) {
  const colors = useColors();
  const interventionAddress = folder.propertyAddress ?? formatClientAddress(folder);

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <ThemedText type="label" tone="primary" style={styles.headerReference}>
          DOSSIER {folder.reference}
        </ThemedText>
        <Badge tone={STATUS_TONE[folder.status]}>{STATUS_LABELS[folder.status]}</Badge>
      </View>
      <ThemedText type="title" style={styles.headerTitle}>
        {folder.clientName}
      </ThemedText>
      {interventionAddress ? (
        <View style={styles.headerSubtitle}>
          <View style={[styles.pin, { borderColor: colors.mutedForeground }]} />
          <ThemedText type="muted" style={styles.headerAddress}>
            {interventionAddress}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function ProgressTimeline({
  folder,
  reports,
}: {
  folder: FolderDetail;
  reports: FolderReport[];
}) {
  const colors = useColors();
  const steps = buildSteps(folder, reports);
  const lastReached = steps.reduce((acc, step, index) => (step.reached ? index : acc), 0);
  const currentLabel = steps[lastReached]?.label ?? '—';

  return (
    <Card style={styles.timelineCard}>
      <View style={styles.timelineHeader}>
        <ThemedText type="label" tone="primary" style={styles.sectionTitle}>
          AVANCEMENT
        </ThemedText>
        <Badge tone="success">{currentLabel}</Badge>
      </View>

      <View style={styles.timeline}>
        {steps.map((step, index) => {
          const state: StepState =
            index < lastReached ? 'done' : index === lastReached ? 'current' : 'upcoming';
          const isLast = index === steps.length - 1;
          const lineColor = index < lastReached ? colors.primary : colors.border;

          return (
            <View key={step.key} style={styles.tlRow}>
              <View style={styles.tlRail}>
                <StepDot state={state} />
                {!isLast ? (
                  <View style={[styles.tlLine, { backgroundColor: lineColor }]} />
                ) : null}
              </View>
              <View style={[styles.tlContent, isLast && styles.tlContentLast]}>
                <ThemedText
                  type="defaultSemiBold"
                  style={{
                    color: state === 'upcoming' ? colors.mutedForeground : colors.foreground,
                  }}>
                  {step.label}
                </ThemedText>
                {step.date ? (
                  <ThemedText type="caption" tone="mutedForeground">
                    {step.date}
                  </ThemedText>
                ) : state === 'current' ? (
                  <ThemedText type="caption" tone="primary">
                    En cours
                  </ThemedText>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function StepDot({ state }: { state: StepState }) {
  const colors = useColors();

  if (state === 'done') {
    return (
      <View style={[styles.dot, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        <ThemedText style={[styles.dotCheck, { color: colors.primaryForeground }]}>✓</ThemedText>
      </View>
    );
  }

  if (state === 'current') {
    return (
      <View
        style={[
          styles.dot,
          { backgroundColor: colors.primary + '1A', borderColor: colors.primary },
        ]}>
        <View style={[styles.dotInner, { backgroundColor: colors.primary }]} />
      </View>
    );
  }

  return <View style={[styles.dot, { backgroundColor: colors.card, borderColor: colors.border }]} />;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <Card style={styles.section}>
      <ThemedText type="label" tone="primary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </Card>
  );
}

function InfoRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <ThemedText type="muted">{label}</ThemedText>
      <ThemedText type={muted ? 'muted' : undefined} style={muted ? styles.infoValueMuted : styles.infoValue}>
        {value}
      </ThemedText>
    </View>
  );
}

function DiscountRow({ amountTtc, percent }: { amountTtc: number; percent: number | null }) {
  const colors = useColors();
  const suffix = percent && percent > 0 ? ` (−${formatPercent(percent)})` : '';
  return (
    <View style={styles.row}>
      <ThemedText type="muted" style={{ color: colors.primary }}>
        {`Remise partenaire${suffix}`}
      </ThemedText>
      <ThemedText style={[styles.infoValue, { color: colors.primary }]}>
        {`−${formatAmount(amountTtc)}`}
      </ThemedText>
    </View>
  );
}

function AddFileButton({ onPress, isUploading }: { onPress: () => void; isUploading: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={isUploading}
      style={({ pressed }) => [
        styles.addFile,
        { borderColor: colors.border },
        (pressed || isUploading) && { opacity: 0.5 },
      ]}>
      {isUploading ? (
        <>
          <ActivityIndicator size="small" color={colors.mutedForeground} />
          <ThemedText type="muted">Upload en cours...</ThemedText>
        </>
      ) : (
        <ThemedText type="muted" style={{ fontWeight: '500' }}>
          + Ajouter un fichier
        </ThemedText>
      )}
    </Pressable>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.backBar}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Retour"
        style={({ pressed }) => [
          styles.backButton,
          { backgroundColor: colors.muted, borderColor: colors.border },
          pressed && { opacity: 0.7 },
        ]}>
        <ThemedText style={[styles.backChevron, { color: colors.foreground }]}>‹</ThemedText>
      </Pressable>
    </View>
  );
}

function PrestationBadge({
  prestation,
}: {
  prestation: FolderDetail['prestations'][number];
}) {
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

function QuoteRow({ quote }: { quote: FolderQuoteSummary }) {
  const colors = useColors();
  const date = formatDate(quote.issueDate);
  const canOpen = quote.publicToken !== null;

  function handleOpen() {
    if (quote.publicToken) {
      Linking.openURL(`${API_URL}/quote/${quote.publicToken}`);
    }
  }

  return (
    <Pressable
      onPress={canOpen ? handleOpen : undefined}
      disabled={!canOpen}
      accessibilityRole={canOpen ? 'button' : undefined}
      accessibilityLabel={canOpen ? `Ouvrir le devis ${quote.reference}` : undefined}
      style={({ pressed }) => [
        canOpen ? styles.docRowTappable : styles.docRow,
        pressed && canOpen && { backgroundColor: colors.surfaceOverlay },
      ]}>
      <View style={styles.docInfo}>
        <View style={styles.docTopRow}>
          <ThemedText
            style={[styles.docReference, canOpen && { color: colors.primary }]}
            numberOfLines={1}>
            {quote.reference}
          </ThemedText>
          <Badge tone={QUOTE_STATUS_TONE[quote.status]}>
            {QUOTE_STATUS_LABELS[quote.status]}
          </Badge>
        </View>
        <View style={styles.docBottomRow}>
          <ThemedText type="caption" tone="mutedForeground">
            {date ?? '—'}
          </ThemedText>
          <ThemedText type="defaultSemiBold" style={{ color: colors.foreground }}>
            {formatAmount(quote.amountTtc)}
          </ThemedText>
        </View>
        {canOpen ? (
          <ThemedText type="caption" tone="primary" style={styles.openHint}>
            Ouvrir le devis ↗
          </ThemedText>
        ) : null}
      </View>
      {canOpen ? <RowChevron /> : null}
    </Pressable>
  );
}

function RowChevron() {
  const colors = useColors();
  return (
    <ThemedText style={[styles.chevron, { color: colors.mutedForeground }]}>›</ThemedText>
  );
}

function InvoiceRow({ invoice }: { invoice: FolderInvoiceSummary }) {
  const colors = useColors();
  const date = formatDate(invoice.issueDate);
  const remaining = invoice.amountTtc - invoice.amountPaid;
  const canOpen = invoice.url !== null;

  return (
    <Pressable
      onPress={canOpen ? () => WebBrowser.openBrowserAsync(invoice.url!) : undefined}
      disabled={!canOpen}
      accessibilityRole={canOpen ? 'button' : undefined}
      accessibilityLabel={canOpen ? `Ouvrir la facture ${invoice.reference}` : undefined}
      style={({ pressed }) => [
        canOpen ? styles.docRowTappable : styles.docRow,
        pressed && canOpen && { backgroundColor: colors.surfaceOverlay },
      ]}>
      <View style={styles.docInfo}>
        <View style={styles.docTopRow}>
          <ThemedText
            style={[styles.docReference, canOpen && { color: colors.primary }]}
            numberOfLines={1}>
            {invoice.reference}
          </ThemedText>
          <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>
            {INVOICE_STATUS_LABELS[invoice.status]}
          </Badge>
        </View>
        <View style={styles.docBottomRow}>
          <ThemedText type="caption" tone="mutedForeground">
            {date ?? '—'}
            {invoice.amountPaid > 0 && remaining > 0
              ? ` · Reste ${formatAmount(remaining)}`
              : ''}
          </ThemedText>
          <ThemedText type="defaultSemiBold" style={{ color: colors.foreground }}>
            {formatAmount(invoice.amountTtc)}
          </ThemedText>
        </View>
        {canOpen ? (
          <ThemedText type="caption" tone="primary" style={styles.openHint}>
            Ouvrir la facture ↗
          </ThemedText>
        ) : null}
      </View>
      {canOpen ? <RowChevron /> : null}
    </Pressable>
  );
}

function InterventionRow({ intervention }: { intervention: FolderInterventionSummary }) {
  const rawDate = formatDateTime(intervention.scheduledAt);
  const dateLabel = rawDate ? rawDate.charAt(0).toUpperCase() + rawDate.slice(1) : 'Date à définir';
  const duration = formatDuration(intervention.durationMinutes);
  const hasTechnician =
    !!intervention.technicianName ||
    !!intervention.technicianEmail ||
    !!intervention.technicianPhone ||
    !!intervention.technicianAvatarUrl;

  return (
    <View style={styles.interventionRow}>
      <View style={styles.interventionTop}>
        <ThemedText type="defaultSemiBold" style={styles.interventionDate}>
          {dateLabel}
        </ThemedText>
        <Badge tone={INTERVENTION_STATUS_TONE[intervention.status]}>
          {INTERVENTION_STATUS_LABELS[intervention.status]}
        </Badge>
      </View>
      {duration ? (
        <ThemedText type="caption" tone="mutedForeground">
          {duration}
        </ThemedText>
      ) : null}
      {hasTechnician ? <TechnicianBlock intervention={intervention} /> : null}
    </View>
  );
}

function TechnicianBlock({ intervention }: { intervention: FolderInterventionSummary }) {
  const colors = useColors();
  const name = intervention.technicianName ?? 'Technicien';
  const email = intervention.technicianEmail;
  const phone = intervention.technicianPhone;

  return (
    <View style={[styles.techRow, { borderTopColor: colors.border }]}>
      {intervention.technicianAvatarUrl ? (
        <Image
          source={{ uri: intervention.technicianAvatarUrl }}
          style={styles.techAvatar}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.techAvatar, styles.techAvatarFallback, { backgroundColor: colors.muted }]}>
          <ThemedText type="caption" tone="mutedForeground" style={styles.techInitials}>
            {getInitials(name)}
          </ThemedText>
        </View>
      )}
      <View style={styles.techInfo}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {name}
        </ThemedText>
        {email ? (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${email}`)}
            hitSlop={6}
            accessibilityRole="link"
            accessibilityLabel={`Envoyer un email à ${name}`}>
            <ThemedText type="caption" tone="primary" numberOfLines={1}>
              {email}
            </ThemedText>
          </Pressable>
        ) : null}
        {phone ? (
          <ThemedText type="caption" tone="mutedForeground">
            {phone}
          </ThemedText>
        ) : null}
      </View>
      {phone ? (
        <Button
          size="sm"
          onPress={() => Linking.openURL(`tel:${phone}`)}
          accessibilityLabel={`Appeler ${name}`}
          style={styles.techCallButton}>
          Appeler
        </Button>
      ) : null}
    </View>
  );
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function ReportRow({ report }: { report: FolderReport }) {
  const colors = useColors();
  const date = formatDate(report.createdAt);
  const meta = [date, formatBytes(report.size)].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(report.url)}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le rapport ${report.filename}`}
      style={({ pressed }) => [
        styles.docRowTappable,
        pressed && { backgroundColor: colors.surfaceOverlay },
      ]}>
      <View style={styles.docInfo}>
        <ThemedText style={[styles.docReference, { color: colors.primary }]} numberOfLines={1}>
          {report.filename}
        </ThemedText>
        <ThemedText type="caption" tone="mutedForeground">
          {meta || 'PDF'}
        </ThemedText>
        <ThemedText type="caption" tone="primary" style={styles.openHint}>
          Ouvrir le rapport ↗
        </ThemedText>
      </View>
      <RowChevron />
    </Pressable>
  );
}

function FileRow({ file }: { file: FolderFile }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(file.url)}
      style={({ pressed }) => [
        styles.fileRow,
        pressed && { backgroundColor: colors.surfaceOverlay },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${file.originalName}`}>
      <View style={[styles.fileIcon, { backgroundColor: colors.muted }]}>
        <ThemedText type="caption" tone="mutedForeground" style={styles.fileIconLabel}>
          {CATEGORY_ICONS[file.category]}
        </ThemedText>
      </View>
      <View style={styles.fileInfo}>
        <ThemedText style={styles.fileName} numberOfLines={1}>
          {file.originalName}
        </ThemedText>
        <ThemedText type="caption" tone="mutedForeground">
          {CATEGORY_LABELS[file.category]} · {formatBytes(file.size)}
        </ThemedText>
      </View>
      <RowChevron />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  backBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 28,
    marginTop: -2,
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
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },
  header: {
    paddingTop: 4,
    paddingBottom: 4,
    gap: 6,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerReference: {
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pin: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
  },
  headerAddress: {
    flex: 1,
  },
  timelineCard: {
    gap: 14,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeline: {
    gap: 0,
  },
  tlRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tlRail: {
    width: 28,
    alignItems: 'center',
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
    gap: 1,
  },
  tlContentLast: {
    paddingBottom: 0,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCheck: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
  },
  dotInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    letterSpacing: 0.6,
    marginBottom: 4,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  infoValue: {
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  infoValueMuted: {
    textAlign: 'right',
    flex: 1,
    textDecorationLine: 'line-through',
  },
  notes: {
    lineHeight: 21,
  },
  emptyFiles: {
    textAlign: 'center',
    paddingVertical: 8,
  },
  fileHelp: {
    marginBottom: 4,
    lineHeight: 19,
  },
  addFile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: Radius.md,
  },
  fileIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  fileIconLabel: {
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  fileInfo: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  prestationList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  prestationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  prestationIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  prestationLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  interventionRow: {
    paddingVertical: 8,
    gap: 4,
  },
  interventionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  interventionDate: {
    flex: 1,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  techAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
  },
  techAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  techInitials: {
    fontWeight: '700',
  },
  techInfo: {
    flex: 1,
    gap: 2,
  },
  techCallButton: {
    flexShrink: 0,
  },
  docRow: {
    paddingVertical: 10,
    gap: 4,
  },
  docRowTappable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: Radius.md,
  },
  chevron: {
    fontSize: 26,
    lineHeight: 26,
    fontWeight: '400',
    marginTop: -2,
    flexShrink: 0,
  },
  openHint: {
    fontWeight: '600',
    marginTop: 1,
  },
  docInfo: {
    flex: 1,
    gap: 6,
  },
  docTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  docReference: {
    fontWeight: '600',
    flex: 1,
  },
  docBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
