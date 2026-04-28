import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useState } from 'react';

export default function LoginScreen() {
  const { signInWithGoogle, isLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message || 'Erreur de connexion');
    } finally {
      setSigningIn(false);
    }
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Ritmo
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Connectez-vous pour continuer
        </ThemedText>
      </View>

      <View style={styles.buttonContainer}>
        {signingIn ? (
          <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
        ) : (
          <GoogleSigninButton
            size={GoogleSigninButton.Size.Wide}
            color={
              colorScheme === 'dark'
                ? GoogleSigninButton.Color.Dark
                : GoogleSigninButton.Color.Light
            }
            onPress={handleGoogleSignIn}
          />
        )}

        {error && (
          <ThemedText style={styles.error}>{error}</ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 40,
    marginBottom: 12,
  },
  subtitle: {
    opacity: 0.6,
    fontSize: 16,
  },
  buttonContainer: {
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  error: {
    color: '#e74c3c',
    marginTop: 16,
    textAlign: 'center',
  },
});
