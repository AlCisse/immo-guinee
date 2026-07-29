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
            refetchOnWindowFocus: false,
            retry: 1,
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
