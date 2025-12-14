'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider } from '@/lib/auth/AuthContext';
import NavigationProgress from '@/components/ui/NavigationProgress';

// Only import devtools in development - using lazy import to avoid including in production bundle
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((mod) => ({
          default: mod.ReactQueryDevtools,
        }))
      )
    : () => null;

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

  // Only render devtools on client to avoid hydration mismatch
  const [showDevtools, setShowDevtools] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setShowDevtools(true);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </AuthProvider>
      {showDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
