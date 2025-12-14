'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ConnexionRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirect = searchParams.get('redirect');
    const url = redirect ? `/auth/login?redirect=${encodeURIComponent(redirect)}` : '/auth/login';
    router.replace(url);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
        <p className="text-neutral-500">Redirection...</p>
      </div>
    </div>
  );
}
