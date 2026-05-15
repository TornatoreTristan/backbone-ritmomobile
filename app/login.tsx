import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { GoogleLogo } from '@/components/icons/google-logo';
import { Input } from '@/components/ui/input';
import { Radius } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColors, useScheme } from '@/hooks/use-theme-color';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FORGOT_PASSWORD_URL = 'https://backbone.ritmodiag.com/forgot-password';
const TERMS_URL = 'https://backbone.ritmodiag.com/cgu';
const PRIVACY_URL = 'https://backbone.ritmodiag.com/confidentialite';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple, signInWithEmail, isLoading } = useAuth();
  const colors = useColors();
  const scheme = useScheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [signingInGoogle, setSigningInGoogle] = useState(false);
  const [signingInApple, setSigningInApple] = useState(false);
  const [signingInEmail, setSigningInEmail] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const busy = signingInGoogle || signingInApple || signingInEmail;

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    }
  }, []);

  async function handleGoogleSignIn() {
    setError(null);
    setSigningInGoogle(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message || 'Erreur de connexion');
    } finally {
      setSigningInGoogle(false);
    }
  }

  async function handleAppleSignIn() {
    if (busy) return;
    setError(null);
    setSigningInApple(true);
    try {
      await signInWithApple();
    } catch (e: any) {
      setError(e.message || 'Erreur de connexion Apple');
    } finally {
      setSigningInApple(false);
    }
  }

  async function handleEmailSignIn() {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }
    setSigningInEmail(true);
    try {
      await signInWithEmail(trimmedEmail, password);
    } catch (e: any) {
      setError(e.message || 'Identifiants incorrects');
    } finally {
      setSigningInEmail(false);
    }
  }

  function handleForgotPassword() {
    Linking.openURL(FORGOT_PASSWORD_URL).catch(() => {
      setError("Impossible d'ouvrir la page de réinitialisation.");
    });
  }

  function openLegal(url: string) {
    Linking.openURL(url).catch(() => {
      setError("Impossible d'ouvrir le lien.");
    });
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.fillCenter}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.brandRow}>
              <Image
                source={require('@/assets/images/favicon.png')}
                style={styles.logoMark}
                contentFit="contain"
              />
              <ThemedText type="defaultSemiBold" style={styles.brandName}>
                Groupe RITMO
              </ThemedText>
            </View>

            <View style={styles.center}>
              <View style={styles.formBlock}>
                <ThemedText type="h1" style={styles.title}>
                  Connexion à votre compte
                </ThemedText>
                <ThemedText type="muted" style={styles.subtitle}>
                  Accédez à vos dossiers, factures et réseau.
                </ThemedText>

                <View style={styles.fieldGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Email
                  </ThemedText>
                  <Input
                    value={email}
                    onChangeText={setEmail}
                    placeholder="vous@exemple.com"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    editable={!busy}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Mot de passe
                  </ThemedText>
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    textContentType="password"
                    editable={!busy}
                    returnKeyType="done"
                    onSubmitEditing={handleEmailSignIn}
                  />
                </View>

                <Button
                  full
                  loading={signingInEmail}
                  disabled={busy}
                  onPress={handleEmailSignIn}
                  style={styles.submitButton}>
                  Se connecter
                </Button>

                <Pressable
                  onPress={handleForgotPassword}
                  disabled={busy}
                  style={styles.forgotWrapper}>
                  <ThemedText type="link" style={styles.forgotText}>
                    Mot de passe oublié ?
                  </ThemedText>
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <ThemedText type="muted" style={styles.dividerText}>
                    ou
                  </ThemedText>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                {appleAvailable ? (
                  signingInApple ? (
                    <View style={[styles.appleButton, styles.appleLoading]}>
                      <ActivityIndicator color={colors.foreground} />
                    </View>
                  ) : (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={
                        AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                      }
                      buttonStyle={
                        scheme === 'dark'
                          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                      }
                      cornerRadius={Radius.md}
                      style={styles.appleButton}
                      onPress={handleAppleSignIn}
                    />
                  )
                ) : null}

                <Button
                  variant="outline"
                  full
                  loading={signingInGoogle}
                  disabled={busy}
                  onPress={handleGoogleSignIn}
                  leftIcon={<GoogleLogo size={18} />}
                  style={[
                    styles.googleButton,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}>
                  Continuer avec Google
                </Button>

                {error ? (
                  <ThemedText tone="destructive" style={styles.error}>
                    {error}
                  </ThemedText>
                ) : null}
              </View>
            </View>

            <ThemedText type="caption" tone="mutedForeground" style={styles.legal}>
              En vous connectant, vous acceptez les{' '}
              <ThemedText
                type="caption"
                tone="primary"
                style={styles.legalLink}
                onPress={() => openLegal(TERMS_URL)}
                accessibilityRole="link"
                accessibilityLabel="Lire les conditions d'utilisation">
                conditions d&apos;utilisation
              </ThemedText>
              {' '}et la{' '}
              <ThemedText
                type="caption"
                tone="primary"
                style={styles.legalLink}
                onPress={() => openLegal(PRIVACY_URL)}
                accessibilityRole="link"
                accessibilityLabel="Lire la politique de confidentialité">
                politique de confidentialité
              </ThemedText>
              {' '}Ritmo.
            </ThemedText>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fillCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  brandName: {
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  formBlock: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 14,
    gap: 6,
  },
  label: {
    fontSize: 13,
  },
  submitButton: {
    marginTop: 4,
  },
  forgotWrapper: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
  },
  forgotText: {
    fontSize: 13,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 13,
  },
  appleButton: {
    width: '100%',
    height: 44,
    marginBottom: 8,
  },
  appleLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  googleButton: {
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  error: {
    marginTop: 14,
    textAlign: 'center',
  },
  legal: {
    textAlign: 'center',
  },
  legalLink: {
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});
