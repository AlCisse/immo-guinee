import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { SecurityProvider } from '@/lib/security';
import '@/lib/i18n';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        // Resilience for the Guinean network context (frequent 2G/3G, drops):
        // keep cached data for 24h so the app stays usable offline, and serve
        // the cache when the network is down instead of showing an error.
        gcTime: 24 * 60 * 60 * 1000, // 24 hours
        networkMode: 'offlineFirst',
        refetchOnReconnect: true,
        // Don't retry client errors (4xx) — they won't resolve by repeating.
        // Network/5xx errors retry with exponential backoff (capped at 30s).
        retry: (failureCount: number, error: Error) => {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (typeof status === 'number' && status >= 400 && status < 500) return false;
          return failureCount < 3;
        },
        retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000),
      },
      mutations: {
        // Mutations are queued when offline and replayed on reconnect, so a
        // favorite toggle / message send made on a flaky network isn't lost.
        networkMode: 'offlineFirst',
      },
    },
  }));

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SecureAppWrapper />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function SecureAppWrapper() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <SecurityProvider enabled={isAuthenticated} onLogout={logout}>
      <RootLayoutNav />
    </SecurityProvider>
  );
}

function RootLayoutNav() {
  // Mobile is explicitly light-only (see useColorScheme.ts). Dark mode is scaffolded in
  // Colors.dark / themeColors.dark but not wired to screens.
  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerBackTitle: '',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="publish" options={{ headerShown: false }} />
        <Stack.Screen name="listing/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
