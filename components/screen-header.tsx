import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { useColors } from '@/hooks/use-theme-color';
import { centeredContent } from '@/constants/layout';
import { Radius } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  /** Small uppercase label rendered above the title (e.g. "BONJOUR"). */
  eyebrow?: string;
  /** Slot rendered on the right of the top bar (e.g. + button). */
  trailing?: React.ReactNode;
}

function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function ScreenHeader({ title, eyebrow, trailing }: ScreenHeaderProps) {
  const { user } = useAuth();
  const { currentOrganization, isLoading } = useOrganization();
  const colors = useColors();
  const router = useRouter();

  const orgName = isLoading
    ? '...'
    : currentOrganization
      ? currentOrganization.name
      : 'Aucune organisation';
  const logoUrl = currentOrganization?.logoUrl ?? null;
  const initial = currentOrganization?.name?.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <View style={[styles.wrapper, centeredContent]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.push('/switch-organization')}
          hitSlop={8}
          style={styles.orgSwitcher}
          accessibilityRole="button"
          accessibilityLabel="Changer d'organisation">
          <View
            style={[
              styles.orgChip,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}>
            {currentOrganization ? (
              logoUrl ? (
                <Image
                  source={{ uri: logoUrl }}
                  style={styles.logo}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={[styles.logoFallback, { backgroundColor: colors.foreground }]}>
                  <ThemedText
                    style={[styles.logoInitial, { color: colors.background }]}>
                    {initial}
                  </ThemedText>
                </View>
              )
            ) : null}
            <ThemedText
              type="small"
              style={{ color: colors.foreground, fontWeight: '500' }}
              numberOfLines={1}>
              {orgName}
            </ThemedText>
            <ThemedText type="small" tone="mutedForeground">
              ▾
            </ThemedText>
          </View>
        </Pressable>

        <View style={styles.actions}>
          {trailing}
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir les paramètres">
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
          </Pressable>
        </View>
      </View>

      <View style={styles.titleBlock}>
        {eyebrow ? (
          <ThemedText
            type="label"
            tone="mutedForeground"
            style={styles.eyebrow}>
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  orgSwitcher: {
    flexShrink: 1,
  },
  orgChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  logo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    resizeMode: 'cover',
  },
  logoFallback: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitial: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
  },
  titleBlock: {
    paddingTop: 4,
    gap: 2,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {},
});
