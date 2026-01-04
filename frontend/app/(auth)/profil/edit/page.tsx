'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ChevronLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { useTranslations } from '@/lib/i18n';

export default function EditProfilePage() {
  const { t } = useTranslations();
  const router = useRouter();
  const { user, refreshUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('profile.edit.photoInvalidType'));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('profile.edit.photoTooLarge'));
      return;
    }

    setIsUploadingPhoto(true);
    setError('');

    try {
      await api.auth.uploadProfilePhoto(file);
      await refreshUser();
      setSuccess(t('profile.edit.photoSuccess'));
    } catch (err: any) {
      console.error('Photo upload error:', err);
      setError(err.response?.data?.message || t('profile.edit.photoError'));
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!user?.photo_profil_url) return;

    setIsUploadingPhoto(true);
    setError('');

    try {
      await api.auth.deleteProfilePhoto();
      await refreshUser();
      setSuccess(t('profile.edit.photoDeleted'));
    } catch (err: any) {
      console.error('Photo delete error:', err);
      setError(err.response?.data?.message || t('profile.edit.photoError'));
    } finally {
      setIsUploadingPhoto(false);
    }
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
      setSuccess(t('profile.edit.success'));
      await refreshUser();
      setTimeout(() => {
        router.push('/profil');
      }, 1500);
    } catch (err: any) {
      console.error('Update profile error:', err);
      setError(err.response?.data?.message || t('profile.edit.error'));
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
            {t('profile.edit.title')}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Profile Picture */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            {user?.photo_profil_url ? (
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary-100 dark:ring-primary-500/20">
                <Image
                  src={user.photo_profil_url}
                  alt={formData.nom_complet || 'Profile'}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-4xl font-bold text-white">
                {formData.nom_complet?.charAt(0) || 'U'}
              </div>
            )}
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={isUploadingPhoto}
              className="absolute bottom-0 right-0 p-2 bg-primary-500 rounded-full shadow-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {isUploadingPhoto ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
          {user?.photo_profil_url && (
            <button
              type="button"
              onClick={handleDeletePhoto}
              disabled={isUploadingPhoto}
              className="mt-3 flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {t('profile.edit.deletePhoto')}
            </button>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            {t('profile.edit.photoHint')}
          </p>
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
              {t('profile.edit.personalInfo')}
            </h2>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('profile.edit.fullName')}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    name="nom_complet"
                    value={formData.nom_complet}
                    onChange={handleChange}
                    placeholder={t('profile.edit.fullNamePlaceholder')}
                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('profile.edit.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('profile.edit.emailPlaceholder')}
                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
                  />
                </div>
              </div>

              {/* Phone - Read only */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('profile.edit.phone')}
                  <span className="text-xs text-neutral-400 ml-2">{t('profile.edit.phoneReadOnly')}</span>
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
                  {t('profile.edit.address')}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3 w-5 h-5 text-neutral-400" />
                  <textarea
                    name="adresse"
                    value={formData.adresse}
                    onChange={handleChange}
                    placeholder={t('profile.edit.addressPlaceholder')}
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
                {t('profile.edit.saving')}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {t('profile.edit.save')}
              </>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  );
}
