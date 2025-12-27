'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, AlertCircle, KeyRound } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { ROUTES } from '@/lib/routes';
import { useTranslations } from '@/lib/i18n';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslations();
  const phoneFromUrl = searchParams.get('phone') || '';

  const [formData, setFormData] = useState({
    telephone: phoneFromUrl,
    code: '',
    mot_de_passe: '',
    mot_de_passe_confirmation: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (phoneFromUrl) {
      setFormData(prev => ({ ...prev, telephone: phoneFromUrl }));
    }
  }, [phoneFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.mot_de_passe !== formData.mot_de_passe_confirmation) {
      setError(t('auth.resetPassword.errors.passwordsMismatch'));
      return;
    }

    // Validate password length
    if (formData.mot_de_passe.length < 8) {
      setError(t('auth.resetPassword.errors.passwordTooShort'));
      return;
    }

    // Validate code
    if (formData.code.length !== 6) {
      setError(t('auth.resetPassword.errors.invalidCode'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/reset-password', {
        telephone: formData.telephone.replace(/\s/g, ''),
        code: formData.code,
        mot_de_passe: formData.mot_de_passe,
        mot_de_passe_confirmation: formData.mot_de_passe_confirmation,
      });

      if (response.data.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push(ROUTES.LOGIN);
        }, 3000);
      } else {
        setError(response.data.message || t('auth.resetPassword.errors.generic'));
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(
        err.response?.data?.message ||
        t('auth.resetPassword.errors.generic')
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
          {t('auth.resetPassword.success.title')}
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          {t('auth.resetPassword.success.message')}
        </p>
        <Link
          href={ROUTES.LOGIN}
          className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium"
        >
          {t('auth.resetPassword.success.goToLogin')}
        </Link>
      </motion.div>
    );
  }

  return (
    <>
      {/* Back Link */}
      <Link
        href={ROUTES.FORGOT_PASSWORD}
        className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('auth.resetPassword.back')}
      </Link>

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-8 h-8 text-primary-500" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
          {t('auth.resetPassword.title')}
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          {t('auth.resetPassword.subtitle')}
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* OTP Code */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t('auth.resetPassword.code')}
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setFormData({ ...formData, code: value });
            }}
            placeholder={t('auth.resetPassword.codePlaceholder')}
            maxLength={6}
            className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono bg-neutral-50 dark:bg-dark-bg border-2 border-neutral-200 dark:border-dark-border rounded-xl focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-neutral-900 dark:text-white"
          />
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t('auth.resetPassword.newPassword')}
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.mot_de_passe}
              onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })}
              placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
              required
              minLength={8}
              className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t('auth.resetPassword.confirmPassword')}
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.mot_de_passe_confirmation}
              onChange={(e) => setFormData({ ...formData, mot_de_passe_confirmation: e.target.value })}
              placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
              required
              minLength={8}
              className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('auth.resetPassword.submitting')}
            </>
          ) : (
            t('auth.resetPassword.submit')
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-orange-500 to-primary-600 flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Header */}
      <div className="relative z-10 p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-white">
          <Image
            src="/images/iOS/Icon-60.png"
            alt="ImmoGuinee"
            width={40}
            height={40}
            className="rounded-xl"
          />
          <span className="font-bold text-xl">ImmoGuinee</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl p-8">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            }>
              <ResetPasswordContent />
            </Suspense>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
