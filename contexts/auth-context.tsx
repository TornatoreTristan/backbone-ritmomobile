import { GOOGLE_WEB_CLIENT_ID } from '@/constants/api';
import { apiRequest } from '@/services/api';
import {
  clearAuth,
  getToken,
  getUser,
  saveToken,
  saveUser,
  type StoredUser,
} from '@/services/auth-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useRouter, useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

type AuthContextType = {
  user: StoredUser | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      scopes: ['openid', 'profile', 'email'],
    });
    restoreSession();
  }, []);

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

      const response = await apiRequest<{
        success: boolean;
        data: {
          token: string;
          user: StoredUser;
          expiresAt: string;
          isNewUser: boolean;
        };
      }>('/api/v1/auth/google', {
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
      console.error('Sign-in error:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
      await GoogleSignin.signOut();
    } catch {
      // Continue logout even if requests fail
    } finally {
      await clearAuth();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
