'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle,
  Building,
  Home,
  AlertCircle,
} from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';

type UserType = 'particulier' | 'professionnel';

export default function InscriptionPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>('particulier');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    password: '',
    confirmPassword: '',
    entreprise: '',
    acceptTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      // Call the registration API
      const response = await api.auth.register({
        telephone: formData.telephone,
        mot_de_passe: formData.password,
        nom_complet: `${formData.prenom} ${formData.nom}`.trim(),
        type_compte: userType === 'professionnel' ? 'agence' : 'particulier',
      });

      if (response.data.success) {
        toast.success('Inscription réussie ! Vérifiez votre téléphone.');
        // Redirect to OTP verification
        router.push('/auth/verify-otp?phone=' + encodeURIComponent(formData.telephone));
      }
    } catch (err: any) {
      console.error('Registration error:', err);

      // Handle API errors
      if (err.response?.data) {
        const data = err.response.data;

        // Set general error message
        setError(data.message || 'Une erreur est survenue lors de l\'inscription');

        // Set field-specific errors
        if (data.errors) {
          const newFieldErrors: Record<string, string> = {};
          Object.entries(data.errors).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              newFieldErrors[field] = messages[0] as string;
            }
          });
          setFieldErrors(newFieldErrors);
        }

        // Show toast for user feedback
        toast.error(data.message || 'Erreur lors de l\'inscription');
      } else {
        setError('Une erreur de connexion est survenue. Veuillez réessayer.');
        toast.error('Erreur de connexion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
            alt="ImmoGuinée"
            width={40}
            height={40}
            className="rounded-xl"
          />
          <span className="font-bold text-xl">ImmoGuinée</span>
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
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                Créer un compte
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Rejoignez la communauté ImmoGuinée
              </p>
            </div>

            {/* User Type Selection */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setUserType('particulier')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  userType === 'particulier'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                    : 'border-neutral-200 dark:border-dark-border'
                }`}
              >
                <Home className={`w-6 h-6 mx-auto mb-2 ${
                  userType === 'particulier' ? 'text-primary-500' : 'text-neutral-400'
                }`} />
                <p className={`text-sm font-medium ${
                  userType === 'particulier' ? 'text-primary-600' : 'text-neutral-600 dark:text-neutral-300'
                }`}>
                  Particulier
                </p>
              </button>
              <button
                type="button"
                onClick={() => setUserType('professionnel')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  userType === 'professionnel'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                    : 'border-neutral-200 dark:border-dark-border'
                }`}
              >
                <Building className={`w-6 h-6 mx-auto mb-2 ${
                  userType === 'professionnel' ? 'text-primary-500' : 'text-neutral-400'
                }`} />
                <p className={`text-sm font-medium ${
                  userType === 'professionnel' ? 'text-primary-600' : 'text-neutral-600 dark:text-neutral-300'
                }`}>
                  Professionnel
                </p>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    placeholder="Prénom"
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    placeholder="Nom"
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Company Name (for professionals) */}
              {userType === 'professionnel' && (
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    name="entreprise"
                    value={formData.entreprise}
                    onChange={handleChange}
                    placeholder="Nom de l'entreprise"
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email (optionnel)"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${
                      fieldErrors.email
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:ring-primary-500/20'
                    } focus:outline-none focus:ring-2 bg-white dark:bg-dark-card text-neutral-900 dark:text-white`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <PhoneInput
                  value={formData.telephone}
                  onChange={(fullNumber) => setFormData(prev => ({ ...prev, telephone: fullNumber }))}
                  placeholder="621 00 00 00"
                  required
                  className={fieldErrors.telephone ? 'border-red-500' : ''}
                />
                {fieldErrors.telephone && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {fieldErrors.telephone}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mot de passe"
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

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  required
                  className="mt-1 w-5 h-5 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  J'accepte les{' '}
                  <Link href="/conditions" className="text-primary-500 hover:underline">
                    conditions d'utilisation
                  </Link>{' '}
                  et la{' '}
                  <Link href="/confidentialite" className="text-primary-500 hover:underline">
                    politique de confidentialité
                  </Link>
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !formData.acceptTerms}
                className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
              Déjà un compte ?{' '}
              <Link href="/auth/login" className="text-primary-500 font-semibold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-white/80 text-center text-xs">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Inscription gratuite</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Vérification SMS</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Données sécurisées</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
