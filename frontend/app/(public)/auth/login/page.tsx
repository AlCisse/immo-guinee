'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Lock, Loader2, ArrowRight } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { inputStyles } from '@/lib/utils';
import PhoneInput from '@/components/ui/PhoneInput';

export default function LoginPage() {
  const { login } = useAuth();
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
      setError('Veuillez remplir tous les champs');
      return;
    }

    // Le numéro est déjà formaté avec le code pays par PhoneInput
    const loginId = formData.telephone.replace(/\s/g, '');

    setIsLoading(true);

    try {
      await login(loginId, formData.mot_de_passe);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Identifiants incorrects. Veuillez réessayer.'
      );
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
      setError(`Erreur lors de la connexion avec ${provider === 'google' ? 'Google' : 'Facebook'}`);
      setSocialLoading(null);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)]">
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
          <h1 className="text-4xl font-bold mb-4 text-center">ImmoGuinée</h1>
          <p className="text-xl text-white/90 text-center max-w-md">
            La première plateforme immobilière de Guinée
          </p>
          <div className="mt-12 space-y-4 text-white/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">🏠</span>
              </div>
              <span>+10,000 annonces disponibles</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">👥</span>
              </div>
              <span>Communauté de confiance</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">🔒</span>
              </div>
              <span>Transactions sécurisées</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:p-6 lg:p-12">
        <div className="w-full max-w-md">
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
              Connexion
            </h2>
            <p className="text-sm text-neutral-500 mb-4 sm:mb-6">
              Accédez à votre compte ImmoGuinée
            </p>

            {/* Social Login Buttons */}
           {/*  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              <button
                onClick={() => handleSocialLogin('google')}
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
                  Continuer avec Google
                </span>
              </button>

              <button
                onClick={() => handleSocialLogin('facebook')}
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
                  Continuer avec Facebook
                </span>
              </button>
            </div> */}

            {/* Divider */}
            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-dark-border"></div>
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-3 sm:px-4 bg-white dark:bg-dark-card text-neutral-500">ou</span>
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
                  Numéro de téléphone
                </label>
                <PhoneInput
                  value={formData.telephone}
                  onChange={(fullNumber) => setFormData({ ...formData, telephone: fullNumber })}
                  placeholder="621 00 00 00"
                  required
                  defaultCountry="GN"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Sélectionnez votre pays - Guinée et diaspora acceptés
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Mot de passe
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
                    placeholder="Entrez votre mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-400 hover:text-neutral-600"
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
                    className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Se souvenir de moi</span>
                </label>
                <Link href={ROUTES.FORGOT_PASSWORD} className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  Mot de passe oublie ?
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
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Register link */}
            <div className="mt-6 sm:mt-8 text-center text-sm">
              <span className="text-neutral-500">Pas encore de compte ? </span>
              <Link href={ROUTES.REGISTER} className="text-primary-500 hover:text-primary-600 font-semibold">
                S'inscrire gratuitement
              </Link>
            </div>
          </div>

          {/* Features - hidden on very small screens */}
          <div className="hidden sm:grid mt-6 sm:mt-8 grid-cols-3 gap-2 sm:gap-4 text-center text-xs text-neutral-500">
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center">
                <span className="text-primary-500 text-xs sm:text-sm">✓</span>
              </div>
              Annonces gratuites
            </div>
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center">
                <span className="text-primary-500 text-xs sm:text-sm">✓</span>
              </div>
              Recherche avancée
            </div>
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center">
                <span className="text-primary-500 text-xs sm:text-sm">✓</span>
              </div>
              Messagerie sécurisée
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
