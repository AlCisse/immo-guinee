'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, Suspense } from 'react';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { LocaleProvider } from '@/lib/i18n';
import NavigationProgress from '@/components/ui/NavigationProgress';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            // Keep fetched data in the cache for a full day so screens already
            // visited stay usable when the connection drops (common on mobile
            // networks in Guinea) instead of falling back to a spinner.
            gcTime: 24 * 60 * 60 * 1000,
            refetchOnWindowFocus: false,
            // Serve cached data immediately and only hit the network when it's
            // usable — avoids instant errors while offline/flaky.
            networkMode: 'offlineFirst',
            // Auto-refresh stale data as soon as connectivity comes back.
            refetchOnReconnect: true,
            // F7: retry transient failures (network blips, 5xx) with exponential
            // backoff, but never retry a genuine client error (401/403/404/422)
            // — that just delays the real handling (e.g. the 401 refresh flow).
            retry: (failureCount, error: any) => {
              const status = error?.response?.status;
              if (typeof status === 'number' && status >= 400 && status < 500) {
                return false;
              }
              return failureCount < 3;
            },
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
          },
          mutations: {
            // Mutations wait for a live connection rather than failing instantly
            // offline; they fire when the network returns.
            networkMode: 'offlineFirst',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              // Charte « Argile de Conakry », dark-aware via Tailwind className
              // (avoids hardcoded hex that ignored the theme). Base = neutral
              // surface; success/error keep their semantic accent as a left border.
              className:
                '!bg-white dark:!bg-dark-card !text-neutral-900 dark:!text-white !rounded-xl !shadow-soft !border !border-neutral-200 dark:!border-dark-border !px-4 !py-3',
              success: {
                className:
                  '!bg-white dark:!bg-dark-card !text-neutral-900 dark:!text-white !rounded-xl !shadow-soft !border-l-4 !border-success-500 !px-4 !py-3',
                iconTheme: { primary: '#10b981', secondary: '#fff' },
              },
              error: {
                className:
                  '!bg-white dark:!bg-dark-card !text-neutral-900 dark:!text-white !rounded-xl !shadow-soft !border-l-4 !border-error-500 !px-4 !py-3',
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
