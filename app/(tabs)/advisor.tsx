import { OrganizationGate } from '@/components/organization-gate';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { centeredContent } from '@/constants/layout';
import { Radius } from '@/constants/theme';
import { useOrganization } from '@/contexts/organization-context';
import { useColors } from '@/hooks/use-theme-color';
import { type Advisor, getMyAdvisors } from '@/services/advisors';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function AdvisorScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Conseiller" />
        <OrganizationGate>
          <AdvisorContent />
        </OrganizationGate>
      </SafeAreaView>
    </ThemedView>
  );
}

function AdvisorContent() {
  const { currentOrganization } = useOrganization();
  const colors = useColors();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAdvisors = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await getMyAdvisors();
      setAdvisors(data);
    } catch {
      setError('Impossible de charger les conseillers.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAdvisors();
    }, [loadAdvisors]),
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadAdvisors(true);
  }, [loadAdvisors]);

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, centeredContent]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.foreground}
        />
      }>
      {currentOrganization ? <OrganizationCard /> : null}

      <View style={styles.section}>
        <ThemedText type="label" tone="mutedForeground" style={styles.sectionLabel}>
          VOS CONSEILLERS
        </ThemedText>

        {isLoading ? (
          <View style={styles.sectionLoading}>
            <ActivityIndicator color={colors.foreground} />
          </View>
        ) : error ? (
          <ThemedText tone="destructive" style={styles.sectionMessage}>
            {error}
          </ThemedText>
        ) : advisors.length === 0 ? (
          <ThemedText type="muted" style={styles.sectionMessage}>
            Aucun conseiller pour le moment.
          </ThemedText>
        ) : (
          <View style={styles.advisorList}>
            {advisors.map((advisor) => (
              <AdvisorRow key={advisor.id} advisor={advisor} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function OrganizationCard() {
  const { currentOrganization } = useOrganization();
  const colors = useColors();

  if (!currentOrganization) return null;

  const { name, email, phone, website, logoUrl } = currentOrganization;
  const initial = name.trim().charAt(0).toUpperCase();
  const hasContact = Boolean(email || phone || website);

  return (
    <Card>
      <View style={styles.orgHeader}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={styles.orgLogo}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View
            style={[
              styles.orgLogo,
              styles.orgLogoFallback,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}>
            <ThemedText style={[styles.orgLogoInitial, { color: colors.foreground }]}>
              {initial}
            </ThemedText>
          </View>
        )}
        <View style={styles.orgHeaderText}>
          <ThemedText type="defaultSemiBold">{name}</ThemedText>
          <ThemedText type="caption" tone="mutedForeground">
            Votre organisation
          </ThemedText>
        </View>
      </View>

      {hasContact ? (
        <View style={[styles.orgContact, { borderTopColor: colors.border }]}>
          {email ? (
            <ContactRow
              label="Email"
              value={email}
              onPress={() => Linking.openURL(`mailto:${email}`)}
            />
          ) : null}
          {phone ? (
            <ContactRow
              label="Téléphone"
              value={phone}
              onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)}
            />
          ) : null}
          {website ? (
            <ContactRow
              label="Site web"
              value={website}
              onPress={() => Linking.openURL(website.startsWith('http') ? website : `https://${website}`)}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function ContactRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.contactRow, pressed && styles.contactRowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}>
      <ThemedText type="caption" tone="mutedForeground" style={styles.contactLabel}>
        {label}
      </ThemedText>
      <ThemedText type="default" numberOfLines={1} style={styles.contactValue}>
        {value}
      </ThemedText>
    </Pressable>
  );
}

function AdvisorRow({ advisor }: { advisor: Advisor }) {
  const colors = useColors();
  const displayName = advisor.fullName ?? advisor.email;

  return (
    <Pressable
      onPress={() => Linking.openURL(`mailto:${advisor.email}`)}
      accessibilityRole="button"
      accessibilityLabel={`Contacter ${displayName} par email`}
      style={({ pressed }) => [
        styles.advisorRow,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && styles.advisorRowPressed,
      ]}>
      {advisor.avatarUrl ? (
        <Image
          source={{ uri: advisor.avatarUrl }}
          style={styles.advisorAvatar}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          style={[
            styles.advisorAvatar,
            styles.advisorAvatarFallback,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}>
          <ThemedText style={[styles.advisorInitials, { color: colors.foreground }]}>
            {getInitials(advisor.fullName)}
          </ThemedText>
        </View>
      )}
      <View style={styles.advisorText}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {displayName}
        </ThemedText>
        {advisor.fullName ? (
          <ThemedText type="muted" tone="mutedForeground" numberOfLines={1}>
            {advisor.email}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orgLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  orgLogoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  orgLogoInitial: {
    fontSize: 18,
    fontWeight: '600',
  },
  orgHeaderText: {
    flex: 1,
    gap: 2,
  },
  orgContact: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  contactRow: {
    paddingVertical: 8,
    gap: 2,
  },
  contactRowPressed: { opacity: 0.6 },
  contactLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  contactValue: {},
  section: { gap: 10 },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 4,
  },
  sectionLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  sectionMessage: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  advisorList: { gap: 10 },
  advisorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  advisorRowPressed: { opacity: 0.85 },
  advisorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  advisorAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  advisorInitials: {
    fontSize: 14,
    fontWeight: '600',
  },
  advisorText: {
    flex: 1,
    gap: 2,
  },
});
