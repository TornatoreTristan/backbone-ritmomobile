import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Separator } from '@/components/ui/separator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import { useColors } from '@/hooks/use-theme-color';
import {
  INTERVENTION_STATUS_LABELS,
  INTERVENTION_STATUS_TONE,
  PROPERTY_KIND_LABELS,
  type Contact,
  type Intervention,
  type PropertyDetails,
  getIntervention,
} from '@/services/technician';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
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

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function callPhone(phone: string | null) {
  if (!phone) return;
  Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
}

function openMaps(address: string) {
  const query = encodeURIComponent(address);
  const url = Platform.select({
    ios: `http://maps.apple.com/?q=${query}`,
    android: `geo:0,0?q=${query}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}`,
  });
  if (url) Linking.openURL(url);
}

export default function InterventionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getIntervention(id);
      if (!data) {
        setError('Intervention introuvable.');
      } else {
        setIntervention(data);
      }
    } catch {
      setError('Impossible de charger l’intervention.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <BackBar onBack={() => router.back()} />
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.foreground} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <ThemedText tone="destructive" style={styles.errorText}>
              {error}
            </ThemedText>
            <Button
              variant="outline"
              size="sm"
              onPress={() => router.back()}
              style={{ marginTop: 12 }}>
              Retour
            </Button>
          </View>
        ) : intervention ? (
          <InterventionDetail intervention={intervention} />
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

function InterventionDetail({ intervention }: { intervention: Intervention }) {
  const date = new Date(intervention.scheduledAt);
  // Sur le terrain, le technicien appelle d'abord le contact présent à l'adresse ;
  // à défaut, le propriétaire.
  const primaryPhone = intervention.onSiteContact?.phone ?? intervention.owner.phone;

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, centeredContent]}>
      <Hero intervention={intervention} date={date} />

      <ActionBar address={intervention.propertyAddress} phone={primaryPhone} />

      {/* Lieu d'intervention */}
      <LocationCard
        address={intervention.propertyAddress}
        complement={intervention.propertyAddressComplement}
      />

      {/* Conditions d'accès — info critique sur place, mise en avant */}
      {intervention.accessConditions ? (
        <AccessCard conditions={intervention.accessConditions} />
      ) : null}

      {/* Contacts */}
      {intervention.onSiteContact ? (
        <ContactCard label="CONTACT SUR PLACE" contact={intervention.onSiteContact} />
      ) : (
        <SectionCard label="CONTACT SUR PLACE">
          <ThemedText type="muted" tone="mutedForeground">
            Propriétaire présent sur place.
          </ThemedText>
        </SectionCard>
      )}

      <ContactCard label="PROPRIÉTAIRE" contact={intervention.owner} />

      {/* Caractéristiques du bien */}
      <SectionCard label="CARACTÉRISTIQUES DU BIEN">
        <PropertyRows property={intervention.property} />
      </SectionCard>

      {/* Notes internes */}
      {intervention.internalNotes ? (
        <SectionCard label="NOTES INTERNES">
          <ThemedText type="default" style={styles.notes}>
            {intervention.internalNotes}
          </ThemedText>
        </SectionCard>
      ) : null}

      {/* Référence dossier */}
      <ThemedText type="caption" tone="mutedForeground" style={styles.reference}>
        Dossier {intervention.folderReference}
      </ThemedText>
    </ScrollView>
  );
}

function Hero({ intervention, date }: { intervention: Intervention; date: Date }) {
  return (
    <View style={styles.heroBlock}>
      <ThemedText type="label" tone="primary" style={styles.heroDate}>
        {capitalize(dateFormatter.format(date)).toUpperCase()}
      </ThemedText>
      <ThemedText type="title" style={styles.prestation}>
        {intervention.prestation}
      </ThemedText>
      <View style={styles.heroMeta}>
        <ThemedText type="defaultSemiBold">
          {formatSlot(intervention.scheduledAt, intervention.durationMinutes)}
        </ThemedText>
        <ThemedText type="muted" tone="mutedForeground">
          {`· ${formatDuration(intervention.durationMinutes)}`}
        </ThemedText>
        <View style={styles.heroBadge}>
          <Badge tone={INTERVENTION_STATUS_TONE[intervention.status]}>
            {INTERVENTION_STATUS_LABELS[intervention.status]}
          </Badge>
        </View>
      </View>
    </View>
  );
}

function ActionBar({ address, phone }: { address: string; phone: string | null }) {
  const colors = useColors();
  return (
    <View style={styles.actionBar}>
      <Button
        onPress={() => openMaps(address)}
        accessibilityLabel="Ouvrir l’itinéraire"
        style={styles.actionFlex}
        leftIcon={<IconSymbol name="location.fill" size={16} color={colors.primaryForeground} />}>
        Itinéraire
      </Button>
      {phone ? (
        <Button
          variant="outline"
          onPress={() => callPhone(phone)}
          accessibilityLabel="Appeler le contact"
          style={styles.actionFlex}
          leftIcon={<IconSymbol name="phone.fill" size={16} color={colors.foreground} />}>
          Appeler
        </Button>
      ) : null}
    </View>
  );
}

function LocationCard({
  address,
  complement,
}: {
  address: string;
  complement: string | null;
}) {
  return (
    <SectionCard label="LIEU D’INTERVENTION">
      <ThemedText type="defaultSemiBold" style={styles.address}>
        {address}
      </ThemedText>
      {complement ? (
        <ThemedText type="muted" tone="mutedForeground">
          {complement}
        </ThemedText>
      ) : null}
    </SectionCard>
  );
}

function AccessCard({ conditions }: { conditions: string }) {
  const colors = useColors();
  return (
    <Card style={[styles.accessCard, { backgroundColor: colors.surfaceOverlay, borderColor: colors.primary }]}>
      <View style={styles.accessHeader}>
        <ThemedText style={styles.accessIcon}>🔑</ThemedText>
        <ThemedText type="label" tone="primary" style={styles.cardLabel}>
          CONDITIONS D’ACCÈS
        </ThemedText>
      </View>
      <ThemedText type="default" style={styles.accessText}>
        {conditions}
      </ThemedText>
    </Card>
  );
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <ThemedText type="label" tone="primary" style={styles.cardLabel}>
        {label}
      </ThemedText>
      {children}
    </Card>
  );
}

function ContactCard({ label, contact }: { label: string; contact: Contact }) {
  const colors = useColors();
  return (
    <SectionCard label={label}>
      <View style={styles.contactRow}>
        <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
          <ThemedText type="caption" tone="mutedForeground" style={styles.avatarInitials}>
            {getInitials(contact.name)}
          </ThemedText>
        </View>
        <View style={styles.contactInfo}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {contact.name}
          </ThemedText>
          {contact.role ? (
            <ThemedText type="caption" tone="mutedForeground">
              {contact.role}
            </ThemedText>
          ) : null}
          {contact.phone ? (
            <ThemedText type="caption" tone="mutedForeground">
              {contact.phone}
            </ThemedText>
          ) : (
            <ThemedText type="caption" tone="mutedForeground">
              Aucun téléphone renseigné
            </ThemedText>
          )}
        </View>
        {contact.phone ? (
          <Button
            size="sm"
            onPress={() => callPhone(contact.phone)}
            accessibilityLabel={`Appeler ${contact.name}`}
            style={styles.contactCallButton}
            leftIcon={<IconSymbol name="phone.fill" size={14} color={colors.primaryForeground} />}>
            Appeler
          </Button>
        ) : null}
      </View>
    </SectionCard>
  );
}

function PropertyRows({ property }: { property: PropertyDetails }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Type', value: PROPERTY_KIND_LABELS[property.kind] },
  ];
  if (property.surfaceM2 !== null) rows.push({ label: 'Surface', value: `${property.surfaceM2} m²` });
  if (property.rooms !== null) rows.push({ label: 'Pièces', value: String(property.rooms) });
  if (property.floor) rows.push({ label: 'Étage', value: property.floor });
  if (property.yearBuilt !== null) rows.push({ label: 'Année', value: String(property.yearBuilt) });
  if (property.dpe) rows.push({ label: 'DPE', value: property.dpe });

  return (
    <>
      {rows.map((row, idx) => (
        <View key={row.label}>
          {idx > 0 ? <Separator /> : null}
          <Row label={row.label} value={row.value} />
        </View>
      ))}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="muted" tone="mutedForeground">
        {label}
      </ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.rowValue}>
        {value}
      </ThemedText>
    </View>
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
    gap: 6,
  },
  errorText: { textAlign: 'center' },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  heroBlock: {
    gap: 6,
    paddingVertical: 4,
  },
  heroDate: {
    letterSpacing: 1,
  },
  prestation: {
    fontSize: 26,
    lineHeight: 32,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  heroBadge: {
    marginLeft: 'auto',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
  },
  actionFlex: {
    flex: 1,
  },
  cardLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    marginBottom: 2,
  },
  address: {
    fontSize: 16,
    lineHeight: 22,
  },
  accessCard: {
    gap: 8,
  },
  accessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accessIcon: {
    fontSize: 15,
  },
  accessText: {
    lineHeight: 21,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactCallButton: {
    flexShrink: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
  rowValue: {
    textAlign: 'right',
    flexShrink: 1,
  },
  notes: {
    lineHeight: 21,
  },
  reference: {
    textAlign: 'center',
    marginTop: 4,
  },
});
