'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import OtpVerification from '@/components/auth/OtpVerification';
import { useTranslations } from '@/lib/i18n';

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const telephone = searchParams.get('telephone') || '';

  if (!telephone) {
    router.push('/auth/register');
    return null;
  }

  const handleSuccess = () => {
    // Navigation will be handled by AuthContext (redirects to dashboard)
  };

  const handleCancel = () => {
    router.push('/auth/register');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-dark-card p-8 rounded-2xl shadow-xl border border-neutral-200 dark:border-dark-border">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-neutral-900 dark:text-white">Immo</span>
            <span className="text-primary-500">Guinée</span>
          </h1>
        </div>

        <OtpVerification
          telephone={telephone}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

function LoadingFallback() {
  const { t } = useTranslations();
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">{t('auth.otp.loading')}</p>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyOtpContent />
    </Suspense>
  );
}
