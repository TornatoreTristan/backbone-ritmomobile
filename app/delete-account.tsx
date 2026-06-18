import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColors } from '@/hooks/use-theme-color';
import { ApiError } from '@/services/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DeleteAccountModal() {
  const { user, deleteAccount } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expectedEmail = (user?.email ?? '').trim().toLowerCase();
  const isMatch = expectedEmail.length > 0 && confirmation.trim().toLowerCase() === expectedEmail;

  async function handleDelete() {
    if (!isMatch || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await deleteAccount();
      router.dismissAll();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible de supprimer le compte pour le moment. Réessayez plus tard.";
      Alert.alert('Erreur', message);
      setIsSubmitting(false);
    }
  }

  function confirmAndDelete() {
    Alert.alert(
      'Supprimer définitivement ce compte ?',
      "Cette action est irréversible. Vous serez déconnecté et vos données ne seront plus accessibles depuis l'application.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: handleDelete },
      ],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['bottom']}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <ThemedText type="h2">Supprimer mon compte</ThemedText>
              <ThemedText tone="mutedForeground" style={styles.paragraph}>
                La suppression de votre compte est définitive. Vos accès à
                l&apos;application Ritmo seront révoqués immédiatement.
              </ThemedText>
            </View>

            <View
              style={[
                styles.callout,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}>
              <ThemedText type="defaultSemiBold">Ce qui sera supprimé</ThemedText>
              <ThemedText tone="mutedForeground" style={styles.calloutItem}>
                • Vos informations de profil (nom, email, avatar)
              </ThemedText>
              <ThemedText tone="mutedForeground" style={styles.calloutItem}>
                • Vos sessions et appareils enregistrés
              </ThemedText>
              <ThemedText tone="mutedForeground" style={styles.calloutItem}>
                • Vos préférences locales sur cet appareil
              </ThemedText>
              <ThemedText tone="mutedForeground" style={[styles.calloutItem, styles.calloutNote]}>
                Les dossiers et documents partagés avec votre organisation
                peuvent être conservés conformément aux obligations légales et
                contractuelles de Ritmo.
              </ThemedText>
            </View>

            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Confirmer avec votre email</ThemedText>
              <ThemedText type="caption" tone="mutedForeground">
                Saisissez{' '}
                <ThemedText type="defaultSemiBold">{user?.email ?? ''}</ThemedText>{' '}
                pour activer le bouton de suppression.
              </ThemedText>
              <TextInput
                value={confirmation}
                onChangeText={setConfirmation}
                placeholder="votre.email@exemple.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isSubmitting}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                accessibilityLabel="Saisir votre email pour confirmer la suppression"
              />
            </View>

            <Pressable
              onPress={confirmAndDelete}
              disabled={!isMatch || isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Supprimer définitivement mon compte"
              accessibilityState={{ disabled: !isMatch || isSubmitting }}
              style={({ pressed }) => [
                styles.destructiveButton,
                {
                  backgroundColor: colors.destructive,
                  opacity: !isMatch || isSubmitting ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}>
              {isSubmitting ? (
                <ActivityIndicator color={colors.destructiveForeground} />
              ) : (
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: colors.destructiveForeground }}>
                  Supprimer définitivement mon compte
                </ThemedText>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.back()}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Annuler"
              style={({ pressed }) => [
                styles.cancelButton,
                { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}>
              <ThemedText type="defaultSemiBold">Annuler</ThemedText>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    padding: Spacing[5],
    gap: Spacing[5],
  },
  section: { gap: Spacing[2] },
  paragraph: { marginTop: Spacing[1] },
  callout: {
    padding: Spacing[4],
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing[1],
  },
  calloutItem: { marginTop: Spacing[1] },
  calloutNote: { marginTop: Spacing[3] },
  input: {
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    borderWidth: 1,
    borderRadius: Radius.lg,
    fontSize: 16,
  },
  destructiveButton: {
    paddingVertical: Spacing[4],
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingVertical: Spacing[4],
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
