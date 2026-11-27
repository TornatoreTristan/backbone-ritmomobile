import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/contexts/organization-context';
import { useColors } from '@/hooks/use-theme-color';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

interface OrganizationGateProps {
  partnerOnly?: boolean;
  children: React.ReactNode;
}

export function OrganizationGate({ partnerOnly = true, children }: OrganizationGateProps) {
  // Rôles effectifs (override dev compris) : même source que la barre d'onglets.
  const { currentOrganization, isLoading, error, refresh, isPartner, effectiveRoles } =
    useOrganization();
  const colors = useColors();

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
        <ThemedText tone="destructive" style={styles.emptyTitle}>
          {error}
        </ThemedText>
        <Button variant="outline" onPress={refresh} style={styles.retry}>
          Réessayer
        </Button>
      </View>
    );
  }
  if (!currentOrganization) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.emptyTitle}>
          Vous n&apos;avez pas encore d&apos;organisation.
        </ThemedText>
        <ThemedText type="muted" style={styles.emptyHint}>
          Demandez à votre administrateur de vous inviter.
        </ThemedText>
      </View>
    );
  }
  if (effectiveRoles.length === 0) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.emptyTitle}>
          Aucun rôle ne vous est attribué dans cette organisation.
        </ThemedText>
        <ThemedText type="muted" style={styles.emptyHint}>
          Demandez à votre administrateur de vous en attribuer un.
        </ThemedText>
      </View>
    );
  }
  if (partnerOnly && !isPartner) {
    return (
      <View style={styles.center}>
        <ThemedText type="muted">
          Cette section n&apos;est pas disponible pour votre profil.
        </ThemedText>
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 6,
  },
  emptyTitle: { textAlign: 'center', fontSize: 15 },
  emptyHint: { textAlign: 'center', marginTop: 4 },
  retry: { marginTop: 12 },
});
