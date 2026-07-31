import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { SecurityProvider } from '@/lib/security';
import { AppErrorBoundary, ErrorFallback } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import '@/lib/i18n';

// R15 — React Native n'expose pas `navigator.onLine` ni les événements
// online/offline du DOM, donc le `onlineManager` de React Query (utilisé par
// networkMode:'offlineFirst' + refetchOnReconnect) est aveugle par défaut :
// il croit l'app toujours en ligne. On câble donc l'event listener sur NetInfo
// pour que le QueryClient (R1) serve réellement le cache hors-ligne et
// resynchronise au retour réseau. Enregistré une fois au chargement du module.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    // isConnected = liaison physique (wifi/cellulaire) ;
    // isInternetReachable = accès réel à Internet. On est offline si l'un
    // des deux est faux (ex. captive portal, réseau sans sortie).
    const online =
      Boolean(state.isConnected) && state.isInternetReachable !== false;
    setOnline(online);
  });
});

// R8 — ErrorBoundary de marque pour expo-router (erreurs de rendu de route).
// expo-router appelle ce composant avec { error, retry } ; on réutilise la même
// UI (ErrorFallback) que AppErrorBoundary ci-dessous pour une cohérence totale.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <ErrorFallback error={error} onRetry={retry} />;
}

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
    // R8 — wrap l'arbre de providers dans AppErrorBoundary pour attraper toute
    // erreur runtime non gérée (ex. crash d'un provider) et afficher la UI de
    // marque plutôt qu'un écran rouge Expo.
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SecureAppWrapper />
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
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
      <View style={{ flex: 1 }}>
        {/* R15 — bannière hors-ligne superposée (se masque quand online) */}
        <OfflineBanner />
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
      </View>
    </ThemeProvider>
  );
}
