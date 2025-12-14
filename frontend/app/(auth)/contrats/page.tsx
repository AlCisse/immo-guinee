'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

// Redirect /contrats to /dashboard/mes-contrats
export default function ContratsRedirectPage() {
  useEffect(() => {
    // Client-side redirect
    window.location.href = '/dashboard/mes-contrats';
  }, []);

  // Fallback loading state while redirecting
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
        <p className="text-neutral-500">Redirection vers vos contrats...</p>
      </div>
    </div>
  );
}
