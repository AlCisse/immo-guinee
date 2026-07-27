'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Lock, Loader2, ArrowRight, Shield, MessageCircle, Home } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { inputStyles } from '@/lib/utils';
import PhoneInput from '@/components/ui/PhoneInput';
import AuthTopControls from '@/components/auth/AuthTopControls';
import { useTranslations } from '@/lib/i18n';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslations();
  const [formData, setFormData] = useState({
    telephone: '',
    mot_de_passe: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.telephone || !formData.mot_de_passe) {
      setError(t('auth.login.errors.fillAllFields'));
      return;
    }

    // Le numéro est déjà formaté avec le code pays par PhoneInput
    const loginId = formData.telephone.replace(/\s/g, '');

    setIsLoading(true);

    try {
      await login(loginId, formData.mot_de_passe);
    } catch (err: any) {
      console.error('Login error:', err);
      // Map the HTTP status to a localized message. Never surface the raw axios
      // string ("Request failed with status code 401") to the user. No status
      // (network/timeout) or 5xx falls through to serverError.
      const status = err?.response?.status;
      let errorKey = 'auth.login.errors.serverError';
      if (status === 401) errorKey = 'auth.login.errors.invalidCredentials';
      else if (status === 400 || status === 422) errorKey = 'auth.login.errors.invalidInput';
      else if (status === 403) errorKey = 'auth.login.errors.accountLocked';
      else if (status === 429) errorKey = 'auth.login.errors.tooManyAttempts';
      setError(t(errorKey));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    try {
      // Redirect to backend OAuth endpoint
      window.location.href = `/api/auth/${provider}/redirect`;
    } catch (err) {
      console.error(`${provider} login error:`, err);
      setError(provider === 'google' ? t('auth.login.errors.googleError') : t('auth.login.errors.facebookError'));
      setSocialLoading(null);
    }
  };

  return (
    <div className="flex min-h-[100dvh] lg:min-h-screen overflow-x-hidden">
      {/* Left side - Brand panel (hidden on mobile) — matches the design mockup */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden text-white flex-col justify-between p-10 xl:p-14"
        style={{ background: 'linear-gradient(155deg, #c0421c, #DB5327 55%, #e8703a)' }}
      >
        {/* soft radial highlights */}
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            background:
              'radial-gradient(50% 55% at 85% 10%, rgba(255,255,255,.22), transparent 60%), radial-gradient(45% 50% at 5% 95%, rgba(0,0,0,.18), transparent 60%)',
          }}
        />

        {/* top: logo + wordmark */}
        <div className="relative flex items-center gap-2.5 font-bold text-lg tracking-tight">
          <span className="w-9 h-9 rounded-[10px] bg-white/15 backdrop-blur-sm grid place-items-center">
            <Home className="w-5 h-5" />
          </span>
          ImmoGuinée
        </div>

        {/* middle: headline + trust list */}
        <div className="relative">
          <h2 className="text-3xl xl:text-[2.5rem] font-bold leading-[1.12] max-w-[15ch]">
            {t('auth.brand.headline')}
          </h2>
          <p className="mt-4 text-white/90 text-base max-w-[42ch]">
            {t('auth.brand.subtitle')}
          </p>
          <div className="mt-8 space-y-4 max-w-md">
            {[
              { Icon: Shield, title: t('home.trust.verifiedTitle'), desc: t('home.trust.verifiedDesc') },
              { Icon: Lock, title: t('home.trust.depositTitle'), desc: t('home.trust.depositDesc') },
              { Icon: MessageCircle, title: t('home.trust.whatsappTitle'), desc: t('home.trust.whatsappDesc') },
            ].map(({ Icon, title, desc }, i) => (
              <div key={i} className="flex gap-3.5 items-start">
                <div className="shrink-0 w-[30px] h-[30px] rounded-[9px] bg-white/[.18] grid place-items-center">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-[.98rem] leading-tight">{title}</div>
                  <div className="text-[.86rem] text-white/80 mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* bottom: testimonial */}
        <div className="relative flex items-center gap-3.5 bg-white/[.12] backdrop-blur-sm rounded-[13px] p-4">
          <div className="shrink-0 w-[38px] h-[38px] rounded-full bg-white/90 text-primary-700 grid place-items-center font-bold">
            MC
          </div>
          <div>
            <div className="text-[.86rem]">« {t('auth.brand.testimonialQuote')} »</div>
            <div className="text-[.78rem] text-white/80 mt-0.5">{t('auth.brand.testimonialAuthor')}</div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="relative flex-1 flex items-center justify-center px-4 py-6 sm:p-6 lg:p-12 w-full max-w-full overflow-x-hidden">
        {/* Top-right controls (language + theme) — the auth screens are full-bleed
            so they carry their own controls, matching the mockup. */}
        <AuthTopControls className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20" />

        <div className="w-full max-w-md mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <Image
              src="/images/iOS/Icon-60.png"
              alt="ImmoGuinée"
              width={48}
              height={48}
              className="rounded-xl mx-auto mb-2"
            />
            <h1 className="text-xl font-bold text-primary-500">ImmoGuinée</h1>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-5 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-1">
              {t('auth.login.title')}
            </h2>
            <p className="text-sm text-neutral-500 mb-4 sm:mb-6">
              {t('auth.login.accessAccount')}
            </p>

            {/* Social Login Buttons */}
            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={socialLoading !== null}
                className="w-full flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
              >
                {socialLoading === 'google' ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-neutral-500" />
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span className="text-sm sm:text-base font-medium text-neutral-700 dark:text-neutral-300">
                  {t('auth.login.continueWithGoogle')}
                </span>
              </button>

              <button
                onClick={() => handleSocialLogin('facebook')}
                disabled={socialLoading !== null}
                className="w-full flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
              >
                {socialLoading === 'facebook' ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-neutral-500" />
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
                <span className="text-sm sm:text-base font-medium text-neutral-700 dark:text-neutral-300">
                  {t('auth.login.continueWithFacebook')}
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-dark-border"></div>
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-3 sm:px-4 bg-white dark:bg-dark-card text-neutral-500">{t('auth.login.or')}</span>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-error-50 dark:bg-error-500/10 border-l-4 border-error-500 rounded-r-lg">
                <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Phone Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('auth.login.phoneLabel')}
                </label>
                <PhoneInput
                  value={formData.telephone}
                  onChange={(fullNumber) => setFormData({ ...formData, telephone: fullNumber })}
                  placeholder="621 00 00 00"
                  required
                  defaultCountry="GN"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  {t('auth.login.phoneHint')}
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('auth.login.password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.mot_de_passe}
                    onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })}
                    className={`${inputStyles.base} ${inputStyles.withIconRight}`}
                    placeholder={t('auth.login.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-400"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-neutral-300 dark:border-dark-border text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{t('auth.login.rememberMe')}</span>
                </label>
                <Link href={ROUTES.FORGOT_PASSWORD} className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 sm:py-3.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm sm:text-base font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('auth.login.loggingIn')}
                  </>
                ) : (
                  <>
                    {t('auth.login.loginButton')}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Register link */}
            <div className="mt-6 sm:mt-8 text-center text-sm">
              <span className="text-neutral-500">{t('auth.login.noAccount')} </span>
              <Link href={ROUTES.REGISTER} className="text-primary-500 hover:text-primary-600 font-semibold">
                {t('auth.login.registerFree')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
