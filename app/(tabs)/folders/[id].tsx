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
  type FolderInvoiceSummary,
  type FolderQuoteSummary,
  type FolderStatus,
  type InvoiceStatus,
  type QuoteStatus,
  getFolderById,
  getFolderFiles,
  uploadFolderFile,
} from '@/services/folders';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
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

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  return dateFormatter.format(date);
}

function formatAmount(value: number): string {
  return priceFormatter.format(value);
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
        const [folder, files] = await Promise.all([getFolderById(id), getFolderFiles(id)]);
        setData({ folder, files });
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

  const { folder, files } = data;
  const priceHt = formatPrice(folder.finalPriceHt);
  const priceTtc = formatPrice(folder.finalPriceTtc);
  const reportFiles = files.filter((f) => f.category === 'diagnostic');
  const otherFiles = files.filter((f) => f.category !== 'diagnostic');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <BackBar onBack={() => router.back()} />
        <ScrollView contentContainerStyle={[styles.scrollContent, centeredContent]} showsVerticalScrollIndicator={false}>
        <Section title="Statut & montants">
          <View style={styles.row}>
            <ThemedText type="muted">Statut</ThemedText>
            <Badge tone={STATUS_TONE[folder.status]}>{STATUS_LABELS[folder.status]}</Badge>
          </View>
          {priceHt ? <InfoRow label="Prix HT" value={priceHt} /> : null}
          {priceTtc ? <InfoRow label="Prix TTC" value={priceTtc} /> : null}
        </Section>

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
          {reportFiles.length === 0 ? (
            <ThemedText type="muted" style={styles.emptyFiles}>
              Aucun rapport
            </ThemedText>
          ) : (
            <View>
              {reportFiles.map((file, idx) => (
                <View key={file.id}>
                  {idx > 0 ? <Separator /> : null}
                  <FileRow file={file} />
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="Fichiers">
          <AddFileButton onPress={openFilePicker} isUploading={isUploading} />
          {otherFiles.length === 0 ? (
            <ThemedText type="muted" style={styles.emptyFiles}>
              Aucun fichier
            </ThemedText>
          ) : (
            <View style={{ marginTop: 4 }}>
              {otherFiles.map((file, idx) => (
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

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <Card style={styles.section}>
      <ThemedText type="label" tone="mutedForeground" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="muted">{label}</ThemedText>
      <ThemedText style={styles.infoValue}>{value}</ThemedText>
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
      style={({ pressed }) => [
        styles.docRow,
        pressed && canOpen && { opacity: 0.6 },
      ]}>
      <View style={styles.docInfo}>
        <View style={styles.docTopRow}>
          <ThemedText style={styles.docReference} numberOfLines={1}>
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
      </View>
    </Pressable>
  );
}

function InvoiceRow({ invoice }: { invoice: FolderInvoiceSummary }) {
  const colors = useColors();
  const date = formatDate(invoice.issueDate);
  const remaining = invoice.amountTtc - invoice.amountPaid;

  return (
    <View style={styles.docRow}>
      <View style={styles.docInfo}>
        <View style={styles.docTopRow}>
          <ThemedText style={styles.docReference} numberOfLines={1}>
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
      </View>
    </View>
  );
}

function FileRow({ file }: { file: FolderFile }) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.fileRow, pressed && { opacity: 0.65 }]}
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
    paddingTop: 20,
    paddingBottom: 40,
    gap: 12,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    letterSpacing: 0.6,
    marginBottom: 4,
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
  notes: {
    lineHeight: 21,
  },
  emptyFiles: {
    textAlign: 'center',
    paddingVertical: 8,
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
  docRow: {
    paddingVertical: 10,
    gap: 4,
  },
  docInfo: {
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
