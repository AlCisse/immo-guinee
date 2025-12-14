'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  User,
  Phone,
  Building2,
  UserCircle,
  Briefcase,
  Home,
  ChevronRight,
  CheckCircle,
  MessageCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

const accountTypes = [
  {
    id: 'PARTICULIER',
    label: 'Particulier',
    description: 'Je cherche à louer ou acheter un bien',
    icon: UserCircle,
  },
  {
    id: 'PROPRIETAIRE',
    label: 'Propriétaire',
    description: 'Je souhaite mettre mes biens en location/vente',
    icon: Home,
  },
  {
    id: 'AGENT',
    label: 'Agent immobilier',
    description: 'Je gère des biens pour des clients',
    icon: Briefcase,
  },
  {
    id: 'AGENCE',
    label: 'Agence immobilière',
    description: 'Je représente une agence immobilière',
    icon: Building2,
  },
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Get provider info from URL
  const provider = searchParams.get('provider');
  const userName = searchParams.get('name') || user?.name || '';

  const handleSubmit = async () => {
    if (!accountType) {
      setError('Veuillez sélectionner un type de compte');
      return;
    }

    if (!phone || phone.length < 8) {
      setError('Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Call API to update profile
      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          account_type: accountType,
          phone: `+224${phone}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du profil');
      }

      // Update local user state
      if (updateProfile) {
        await updateProfile({
          accountType,
          phone: `+224${phone}`,
        });
      }

      // Redirect to dashboard or home
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-neutral-200 dark:border-dark-border px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Link href="/" className="p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full">
            <ArrowLeft className="w-5 h-5 text-neutral-700 dark:text-white" />
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-neutral-900 dark:text-white">
              Complétez votre profil
            </h1>
            <p className="text-sm text-neutral-500">Étape {step} sur 2</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-dark-card border-b border-neutral-200 dark:border-dark-border">
        <div className="max-w-lg mx-auto">
          <div className="h-1 bg-neutral-100 dark:bg-dark-bg">
            <motion.div
              className="h-full bg-primary-500"
              initial={{ width: '0%' }}
              animate={{ width: step === 1 ? '50%' : '100%' }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto">
          {/* Welcome Message */}
          {provider && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center gap-3"
            >
              <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-full">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-300">
                  Bienvenue {userName} !
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Connexion avec {provider === 'google' ? 'Google' : 'Facebook'} réussie
                </p>
              </div>
            </motion.div>
          )}

          {step === 1 ? (
            /* Step 1: Account Type */
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-500/10 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-primary-500" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                  Quel type de compte souhaitez-vous ?
                </h2>
                <p className="text-neutral-500">
                  Cela nous aide à personnaliser votre expérience
                </p>
              </div>

              <div className="space-y-3">
                {accountTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = accountType === type.id;

                  return (
                    <motion.button
                      key={type.id}
                      onClick={() => setAccountType(type.id)}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                          : 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-primary-200'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${
                        isSelected
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-100 dark:bg-dark-bg text-neutral-600 dark:text-neutral-300'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${
                          isSelected
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-neutral-900 dark:text-white'
                        }`}>
                          {type.label}
                        </p>
                        <p className="text-sm text-neutral-500">{type.description}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-6 h-6 text-primary-500" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <motion.button
                onClick={() => {
                  if (accountType) {
                    setStep(2);
                    setError('');
                  } else {
                    setError('Veuillez sélectionner un type de compte');
                  }
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={!accountType}
                className={`w-full mt-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                  accountType
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'bg-neutral-200 dark:bg-dark-border text-neutral-400 cursor-not-allowed'
                }`}
              >
                Continuer
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          ) : (
            /* Step 2: Phone Number */
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-500/10 rounded-full flex items-center justify-center">
                  <Phone className="w-8 h-8 text-primary-500" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                  Votre numéro de téléphone
                </h2>
                <p className="text-neutral-500">
                  Idéal si vous avez WhatsApp pour recevoir les notifications
                </p>
              </div>

              <div className="space-y-4">
                {/* Phone Input */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Numéro de téléphone (WhatsApp)
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2 px-4 py-3 bg-neutral-100 dark:bg-dark-bg rounded-xl text-neutral-600 dark:text-neutral-300 font-medium">
                      <span className="text-lg">🇬🇳</span>
                      <span>+224</span>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 9) {
                          setPhone(value);
                        }
                      }}
                      placeholder="620 12 34 56"
                      className="flex-1 px-4 py-3 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <MessageCircle className="w-4 h-4" />
                    <span>Recevez des notifications instantanées via WhatsApp</span>
                  </div>
                </div>

                {/* Account Type Summary */}
                <div className="p-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-500/20 rounded-lg">
                        {accountTypes.find(t => t.id === accountType)?.icon && (
                          (() => {
                            const Icon = accountTypes.find(t => t.id === accountType)!.icon;
                            return <Icon className="w-5 h-5 text-primary-500" />;
                          })()
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500">Type de compte</p>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {accountTypes.find(t => t.id === accountType)?.label}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      className="text-sm text-primary-500 font-medium"
                    >
                      Modifier
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl"
                  >
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </motion.div>
                )}
              </div>

              <div className="mt-8 space-y-3">
                <motion.button
                  onClick={handleSubmit}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={isSubmitting || !phone}
                  className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                    phone && !isSubmitting
                      ? 'bg-primary-500 text-white hover:bg-primary-600'
                      : 'bg-neutral-200 dark:bg-dark-border text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      Terminer l'inscription
                      <CheckCircle className="w-5 h-5" />
                    </>
                  )}
                </motion.button>

                <button
                  onClick={() => setStep(1)}
                  className="w-full py-3 text-neutral-600 dark:text-neutral-400 font-medium"
                >
                  Retour
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-neutral-400">
          En continuant, vous acceptez nos{' '}
          <Link href="/conditions" className="text-primary-500 hover:underline">
            conditions d'utilisation
          </Link>
        </p>
      </div>
    </div>
  );
}
