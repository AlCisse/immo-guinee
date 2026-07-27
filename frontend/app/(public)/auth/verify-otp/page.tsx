'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import OtpVerification from '@/components/auth/OtpVerification';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';
import AuthTopControls from '@/components/auth/AuthTopControls';
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
    <div className="flex min-h-[100dvh] lg:min-h-screen overflow-x-hidden">
      {/* Left brand panel (shared, matches the mockup) */}
      <AuthBrandPanel />

      {/* Right: OTP form */}
      <div className="relative flex-1 flex items-center justify-center px-4 py-6 sm:p-6 lg:p-12 w-full max-w-full overflow-x-hidden">
        <AuthTopControls className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20" />
        <div className="w-full max-w-md mx-auto">
          <OtpVerification
            telephone={telephone}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
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
