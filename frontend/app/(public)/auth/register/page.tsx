'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Lock, User, Building2, Loader2, ChevronDown, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { inputStyles } from '@/lib/utils';
import PhoneInput from '@/components/ui/PhoneInput';
import toast from 'react-hot-toast';
import { useTranslations } from '@/lib/i18n';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const { t } = useTranslations();

  const accountTypes = [
    { value: 'PARTICULIER', label: t('auth.register.accountTypes.individual'), description: t('auth.register.accountTypes.individualDesc') },
    { value: 'AGENCE', label: t('auth.register.accountTypes.agency'), description: t('auth.register.accountTypes.agencyDesc') },
    { value: 'PROMOTEUR', label: t('auth.register.accountTypes.promoter'), description: t('auth.register.accountTypes.promoterDesc') },
  ];
  const [formData, setFormData] = useState({
    telephone: '',
    countryCode: 'GN',
    mot_de_passe: '',
    mot_de_passe_confirmation: '',
    nom_complet: '',
    type_compte: 'PARTICULIER' as 'PARTICULIER' | 'AGENCE' | 'PROMOTEUR',
  });
  const [acceptedCGU, setAcceptedCGU] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.telephone || !formData.mot_de_passe || !formData.nom_complet) {
      setError(t('auth.register.errors.fillAllFields'));
      return;
    }

    if (formData.mot_de_passe !== formData.mot_de_passe_confirmation) {
      setError(t('auth.register.errors.passwordMismatch'));
      return;
    }

    if (formData.mot_de_passe.length < 8) {
      setError(t('auth.register.errors.weakPassword'));
      return;
    }

    if (!acceptedCGU) {
      setError(t('auth.register.errors.acceptTerms'));
      return;
    }

    // Le numéro est déjà formaté avec le code pays par PhoneInput
    const telephone = formData.telephone.replace(/\s/g, '');

    setIsLoading(true);

    try {
      await register({
        telephone,
        mot_de_passe: formData.mot_de_passe,
        nom_complet: formData.nom_complet,
        type_compte: formData.type_compte,
      });
    } catch (err: any) {
      console.error('Registration error:', err);

      // Check if user needs to be redirected to login (account already exists and verified)
      if (err.action === 'redirect_login') {
        toast.success(t('auth.register.errors.accountExists'), {
          duration: 3000,
          icon: '👋',
        });
        router.push('/auth/login');
        return;
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          t('auth.register.errors.serverError')
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialRegister = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    try {
      // Redirect to backend OAuth endpoint with register intent
      window.location.href = `/api/auth/${provider}/redirect?intent=register`;
    } catch (err) {
      console.error(`${provider} register error:`, err);
      setError(provider === 'google' ? t('auth.register.errors.googleError') : t('auth.register.errors.facebookError'));
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-dark-bg">
      {/* Left side - Image (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-500 to-primary-700">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <Image
            src="/images/iOS/Icon-60.png"
            alt="ImmoGuinée"
            width={80}
            height={80}
            className="rounded-2xl shadow-2xl mb-8"
          />
          <h1 className="text-4xl font-bold mb-4 text-center">{t('auth.register.promo.title')}</h1>
          <p className="text-xl text-white/90 text-center max-w-md">
            {t('auth.register.promo.subtitle')}
          </p>
          <div className="mt-12 space-y-4 text-white/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">📝</span>
              </div>
              <span>{t('auth.register.promo.freeListings')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">🔔</span>
              </div>
              <span>{t('auth.register.promo.alerts')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">💬</span>
              </div>
              <span>{t('auth.register.promo.messaging')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-4 sm:p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md py-2 sm:py-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-4 sm:mb-8">
            <Image
              src="/images/iOS/Icon-60.png"
              alt="ImmoGuinée"
              width={48}
              height={48}
              className="rounded-xl mx-auto mb-2"
            />
            <h1 className="text-xl font-bold text-primary-500">ImmoGuinée</h1>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-4 sm:p-8">
            <h2 className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-white mb-1">
              {t('auth.register.createAccount')}
            </h2>
            <p className="text-sm text-neutral-500 mb-4 sm:mb-6">
              {t('auth.register.joinCommunity')}
            </p>

            {/* Social Register Buttons */}
            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              <button
                onClick={() => handleSocialRegister('google')}
                disabled={socialLoading !== null}
                className="w-full flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:bg-dark-bg dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
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
                  {t('auth.register.continueWithGoogle')}
                </span>
              </button>

              <button
                onClick={() => handleSocialRegister('facebook')}
                disabled={socialLoading !== null}
                className="w-full flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-[#1877F2] rounded-xl hover:bg-[#166FE5] transition-colors disabled:opacity-50"
              >
                {socialLoading === 'facebook' ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
                <span className="text-sm sm:text-base font-medium text-white">
                  {t('auth.register.continueWithFacebook')}
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-3 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-dark-border"></div>
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-3 sm:px-4 bg-white dark:bg-dark-card text-neutral-500">{t('auth.register.or')}</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-error-50 dark:bg-error-500/10 border-l-4 border-error-500 rounded-r-lg">
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-error-500" />
                  <p className="text-xs sm:text-sm text-error-700 dark:text-error-400">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {/* Nom Complet */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 sm:mb-2">
                  {t('auth.register.fullName')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4">
                    <User className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type="text"
                    value={formData.nom_complet}
                    onChange={(e) => setFormData({ ...formData, nom_complet: e.target.value })}
                    className={`${inputStyles.base} ${inputStyles.withIcon}`}
                    placeholder={t('auth.register.fullNamePlaceholder')}
                  />
                </div>
              </div>

              {/* Telephone */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 sm:mb-2">
                  {t('auth.register.phoneWhatsapp')} *
                </label>
                <PhoneInput
                  value={formData.telephone}
                  onChange={(fullNumber, countryCode) => setFormData({ ...formData, telephone: fullNumber, countryCode })}
                  placeholder="621 00 00 00"
                  required
                  defaultCountry="GN"
                />
              </div>

              {/* Type de compte */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 sm:mb-2">
                  {t('auth.register.accountType')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4 pointer-events-none">
                    <Building2 className="w-4 h-4 text-neutral-500" />
                  </div>
                  <select
                    value={formData.type_compte}
                    onChange={(e) => setFormData({ ...formData, type_compte: e.target.value as any })}
                    className={`${inputStyles.base} pl-9 sm:pl-11 pr-10 sm:pr-12 appearance-none cursor-pointer`}
                  >
                    {accountTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4 pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                  </div>
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 sm:mb-2">
                  {t('auth.register.password')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4">
                    <Lock className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.mot_de_passe}
                    onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })}
                    className={`${inputStyles.base} ${inputStyles.withIconRight}`}
                    placeholder={t('auth.register.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirmation mot de passe */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 sm:mb-2">
                  {t('auth.register.confirmPasswordShort')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4">
                    <Lock className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.mot_de_passe_confirmation}
                    onChange={(e) => setFormData({ ...formData, mot_de_passe_confirmation: e.target.value })}
                    className={`${inputStyles.base} ${inputStyles.withIconRight}`}
                    placeholder={t('auth.register.confirmPasswordShort')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              {/* CGU Acceptance */}
              <div className="flex items-start gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setAcceptedCGU(!acceptedCGU)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    acceptedCGU
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-neutral-300 dark:border-neutral-600 hover:border-primary-400'
                  }`}
                >
                  {acceptedCGU && <Check className="w-3 h-3 text-white" />}
                </button>
                <label className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {t('auth.register.termsAccept')}{' '}
                  <Link
                    href="/legal/conditions-utilisation"
                    target="_blank"
                    className="text-primary-500 hover:text-primary-600 font-medium hover:underline"
                  >
                    {t('auth.register.termsLink')}
                  </Link>{' '}
                  {t('auth.register.andThe')}{' '}
                  <Link
                    href="/legal/politique-confidentialite"
                    target="_blank"
                    className="text-primary-500 hover:text-primary-600 font-medium hover:underline"
                  >
                    {t('auth.register.privacy')}
                  </Link>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !acceptedCGU}
                className="w-full py-2.5 sm:py-3.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 disabled:cursor-not-allowed text-white text-sm sm:text-base font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 mt-4 sm:mt-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('auth.register.registering')}
                  </>
                ) : (
                  <>
                    {t('auth.register.registerButton')}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Login link */}
            <div className="mt-4 sm:mt-6 text-center text-sm">
              <span className="text-neutral-500">{t('auth.register.hasAccount')} </span>
              <Link href={ROUTES.LOGIN} className="text-primary-500 hover:text-primary-600 font-semibold">
                {t('auth.register.login')}
              </Link>
            </div>
          </div>

          {/* Terms */}
          <p className="mt-4 sm:mt-6 text-[10px] sm:text-xs text-center text-neutral-500 px-2">
            {t('auth.register.privacyProtection')}{' '}
            <Link href="/legal/politique-confidentialite" className="text-primary-500 hover:underline">
              {t('auth.register.privacy')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
