import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider, KeyboardToolbar } from 'react-native-keyboard-controller';
import 'react-native-reanimated';

import { SENTRY_DSN } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { ErrorBoundary } from '@/components/error-boundary';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/auth-context';
import { OrganizationProvider } from '@/contexts/organization-context';

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: SENTRY_DSN !== '' && !__DEV__,
  debug: false,
  tracesSampleRate: 0.2,
  enableAutoSessionTracking: true,
  attachStacktrace: true,
});

export const unstable_settings = {
  anchor: '(tabs)',
};

const NAV_LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.foreground,
    border: Colors.light.border,
    primary: Colors.light.primary,
    notification: Colors.light.destructive,
  },
};

const NAV_DARK_THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.foreground,
    border: Colors.dark.border,
    primary: Colors.dark.primary,
    notification: Colors.dark.destructive,
  },
};

function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ThemeProvider value={isDark ? NAV_DARK_THEME : NAV_LIGHT_THEME}>
      <KeyboardProvider>
        <ErrorBoundary>
          <AuthProvider>
            <OrganizationProvider>
              <Stack>
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen
                  name="switch-organization"
                  options={{ presentation: 'modal', title: 'Mes organisations' }}
                />
                <Stack.Screen
                  name="settings"
                  options={{ presentation: 'modal', title: 'Paramètres' }}
                />
                <Stack.Screen
                  name="delete-account"
                  options={{ presentation: 'modal', title: 'Supprimer mon compte' }}
                />
                <Stack.Screen
                  name="search"
                  options={{ presentation: 'modal', title: 'Rechercher' }}
                />
                <Stack.Screen
                  name="quote-wizard"
                  options={{ presentation: 'modal', headerShown: false }}
                />
              </Stack>
            </OrganizationProvider>
          </AuthProvider>
        </ErrorBoundary>
        <KeyboardToolbar />
      </KeyboardProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);
