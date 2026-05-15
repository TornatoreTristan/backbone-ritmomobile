import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColors } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function SettingsModal() {
  const { user, signOut } = useAuth();
  const colors = useColors();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.dismissAll();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.profile}>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatar}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}>
              <ThemedText style={[styles.avatarInitials, { color: colors.foreground }]}>
                {getInitials(user?.fullName)}
              </ThemedText>
            </View>
          )}
          <View style={styles.profileText}>
            {user?.fullName ? (
              <ThemedText type="h3">{user.fullName}</ThemedText>
            ) : null}
            {user?.email ? (
              <ThemedText type="muted" tone="mutedForeground">
                {user.email}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.actions}>
          <Pressable
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
            style={({ pressed }) => [
              styles.action,
              { borderColor: colors.border, backgroundColor: colors.card },
              pressed && styles.actionPressed,
            ]}>
            <ThemedText type="defaultSemiBold" tone="destructive">
              Se déconnecter
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '600',
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  action: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  actionPressed: { opacity: 0.85 },
});
