'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, refreshUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    nom_complet: '',
    email: '',
    telephone: '',
    adresse: '',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/connexion?redirect=/profil/edit');
    }
  }, [authLoading, isAuthenticated, router]);

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        nom_complet: user.nom_complet || '',
        email: user.email || '',
        telephone: user.telephone || '',
        adresse: '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Only send fields that can be updated (not telephone)
      const updateData = {
        nom_complet: formData.nom_complet,
        email: formData.email || undefined,
        adresse: formData.adresse || undefined,
      };
      await api.auth.updateProfile(updateData);
      setSuccess('Profil mis à jour avec succès');
      await refreshUser();
      setTimeout(() => {
        router.push('/profil');
      }, 1500);
    } catch (err: any) {
      console.error('Update profile error:', err);
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-neutral-200 dark:border-dark-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full"
          >
            <ChevronLeft className="w-6 h-6 text-neutral-700 dark:text-white" />
          </button>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Modifier le profil
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Profile Picture */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-4xl font-bold text-white">
              {formData.nom_complet?.charAt(0) || 'U'}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-primary-500 rounded-full shadow-lg hover:bg-primary-600 transition-colors">
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
              <p className="text-emerald-600 dark:text-emerald-400 text-sm">{success}</p>
            </div>
          )}

          {/* Name */}
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6">
            <h2 className="font-semibold text-neutral-900 dark:text-white mb-4">
              Informations personnelles
            </h2>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    name="nom_complet"
                    value={formData.nom_complet}
                    onChange={handleChange}
                    placeholder="Votre nom complet"
                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="votre@email.com"
                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
                  />
                </div>
              </div>

              {/* Phone - Read only */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Téléphone
                  <span className="text-xs text-neutral-400 ml-2">(non modifiable)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    readOnly
                    disabled
                    className="w-full pl-12 pr-4 py-3 bg-neutral-100 dark:bg-dark-bg/50 border border-neutral-200 dark:border-dark-border rounded-xl text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Adresse
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3 w-5 h-5 text-neutral-400" />
                  <textarea
                    name="adresse"
                    value={formData.adresse}
                    onChange={handleChange}
                    placeholder="Votre adresse"
                    rows={3}
                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer les modifications
              </>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  );
}
