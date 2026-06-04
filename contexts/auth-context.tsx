import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@/constants/api';
import { apiRequest, setOnUnauthorized } from '@/services/api';
import {
  clearAuth,
  getToken,
  getUser,
  saveToken,
  saveUser,
  type StoredUser,
} from '@/services/auth-storage';
import { clearCurrentOrgId } from '@/services/organization-storage';
import { setRoleOverride } from '@/services/role-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as Sentry from '@sentry/react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter, useSegments } from 'expo-router';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

type AuthContextType = {
  user: StoredUser | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithEmail: async () => {},
  signOut: async () => {},
  deleteAccount: async () => {},
});

type AuthResponse = {
  success: boolean;
  data: {
    token: string;
    user: StoredUser;
    expiresAt: string;
    isNewUser?: boolean;
  };
};

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
      scopes: ['openid', 'profile', 'email'],
    });
    restoreSession();
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      if (isSigningOutRef.current) return;
      isSigningOutRef.current = true;
      signOut().finally(() => {
        isSigningOutRef.current = false;
      });
    });
    return () => setOnUnauthorized(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.fullName ?? undefined,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  useEffect(() => {
    if (isLoading) return;

    const inLogin = segments[0] === 'login';

    if (!user && !inLogin) {
      router.replace('/login');
    } else if (user && inLogin) {
      router.replace('/');
    }
  }, [user, segments, isLoading]);

  async function restoreSession() {
    try {
      const [token, storedUser] = await Promise.all([getToken(), getUser()]);
      if (token && storedUser) {
        setUser(storedUser);
      }
    } catch {
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithGoogle() {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const { accessToken } = await GoogleSignin.getTokens();

      const response = await apiRequest<AuthResponse>('/api/v1/auth/google', {
        method: 'POST',
        body: {
          accessToken,
          deviceName: 'Ritmo Mobile',
          deviceType: 'mobile',
        },
        authenticated: false,
      });

      await saveToken(response.data.token);
      await saveUser(response.data.user);
      setUser(response.data.user);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error.code === statusCodes.IN_PROGRESS) return;
      console.error('Sign-in error: ' + (error?.code ?? error?.message ?? 'unknown'));
      throw error;
    }
  }

  async function signInWithApple() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Aucun token Apple reçu. Réessayez.");
      }

      const fullName =
        credential.fullName &&
        (credential.fullName.givenName || credential.fullName.familyName)
          ? [credential.fullName.givenName, credential.fullName.familyName]
              .filter(Boolean)
              .join(' ')
              .trim() || null
          : null;

      const response = await apiRequest<AuthResponse>('/api/v1/auth/apple', {
        method: 'POST',
        body: {
          identityToken: credential.identityToken,
          authorizationCode: credential.authorizationCode,
          fullName,
          email: credential.email,
          deviceName: 'Ritmo Mobile',
          deviceType: 'mobile',
        },
        authenticated: false,
      });

      await saveToken(response.data.token);
      await saveUser(response.data.user);
      setUser(response.data.user);
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') return;
      console.error('Apple sign-in error: ' + (error?.code ?? error?.message ?? 'unknown'));
      throw error;
    }
  }

  async function signInWithEmail(email: string, password: string) {
    const response = await apiRequest<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email,
        password,
        deviceName: 'Ritmo Mobile',
        deviceType: 'mobile',
      },
      authenticated: false,
    });

    await saveToken(response.data.token);
    await saveUser(response.data.user);
    setUser(response.data.user);
  }

  async function signOut() {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
      await GoogleSignin.signOut();
    } catch {
      // Continue logout even if requests fail
    } finally {
      await Promise.all([clearAuth(), clearCurrentOrgId(), setRoleOverride(null)]);
      setUser(null);
    }
  }

  async function deleteAccount() {
    await apiRequest('/api/v1/me', { method: 'DELETE' });
    try {
      await GoogleSignin.signOut();
    } catch {
      // ignore — la session locale est purgée juste après
    }
    await Promise.all([clearAuth(), clearCurrentOrgId(), setRoleOverride(null)]);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signInWithGoogle, signInWithApple, signInWithEmail, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}
