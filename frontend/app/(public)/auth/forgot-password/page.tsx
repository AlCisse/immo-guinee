'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Phone, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';
import { apiClient } from '@/lib/api/client';
import { ROUTES } from '@/lib/routes';
import { useTranslations } from '@/lib/i18n';

type Step = 'phone' | 'success';

export default function ForgotPasswordPage() {
  const { t } = useTranslations();
  const [step, setStep] = useState<Step>('phone');
  const [telephone, setTelephone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!telephone) {
      setError(t('auth.forgotPassword.errors.phoneRequired'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/forgot-password', {
        telephone: telephone.replace(/\s/g, ''),
      });

      if (response.data.success) {
        setStep('success');
      } else {
        setError(response.data.message || t('auth.forgotPassword.errors.generic'));
      }
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(
        err.response?.data?.message ||
        t('auth.forgotPassword.errors.generic')
      );
    } finally {
      setIsLoading(false);
    }
  };

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
            {step === 'phone' ? (
              <>
                {/* Back Link */}
                <Link
                  href={ROUTES.LOGIN}
                  className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('auth.forgotPassword.backToLogin')}
                </Link>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary-100 dark:bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-primary-500" />
                  </div>
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                    {t('auth.forgotPassword.title')}
                  </h1>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {t('auth.forgotPassword.subtitle')}
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

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      {t('auth.forgotPassword.phone')}
                    </label>
                    <PhoneInput
                      value={telephone}
                      onChange={(fullNumber) => setTelephone(fullNumber)}
                      placeholder="621 00 00 00"
                      required
                      defaultCountry="GN"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('auth.forgotPassword.sending')}
                      </>
                    ) : (
                      t('auth.forgotPassword.sendCode')
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* Success Step */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
                  {t('auth.forgotPassword.codeSent')}
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  {t('auth.forgotPassword.codeSentMessage')}
                </p>

                <div className="space-y-3">
                  <Link
                    href={`/auth/reset-password?phone=${encodeURIComponent(telephone)}`}
                    className="block w-full py-3.5 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-orange-600 transition-all text-center shadow-lg shadow-primary-500/25"
                  >
                    {t('auth.forgotPassword.enterCode')}
                  </Link>
                  <button
                    onClick={() => {
                      setStep('phone');
                      setError('');
                    }}
                    className="w-full py-3 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-medium transition-colors"
                  >
                    {t('auth.forgotPassword.resendCode')}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
