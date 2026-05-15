import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOrganization } from '@/contexts/organization-context';
import { useColors } from '@/hooks/use-theme-color';
import { Radius } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SwitchOrganizationModal() {
  const { organizations, currentOrganization, isLoading, switchOrganization } = useOrganization();
  const colors = useColors();
  const router = useRouter();

  async function handleSelect(id: string) {
    await switchOrganization(id);
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.foreground} />
          </View>
        ) : organizations.length === 0 ? (
          <View style={styles.center}>
            <ThemedText type="muted">Aucune organisation disponible</ThemedText>
          </View>
        ) : (
          <FlatList
            data={organizations}
            keyExtractor={(org) => org.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isActive = item.id === currentOrganization?.id;
              return (
                <Pressable
                  onPress={() => handleSelect(item.id)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderColor: isActive ? colors.foreground : colors.border,
                      backgroundColor: isActive ? colors.muted : colors.card,
                    },
                    pressed && { opacity: 0.85 },
                  ]}>
                  <View style={styles.rowContent}>
                    <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                    <ThemedText type="caption" tone="mutedForeground" style={styles.role}>
                      {item.role}
                    </ThemedText>
                  </View>
                  {isActive ? (
                    <ThemedText style={[styles.checkmark, { color: colors.foreground }]}>
                      ✓
                    </ThemedText>
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </ThemedView>
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
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  role: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
