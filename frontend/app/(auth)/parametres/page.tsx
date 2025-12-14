'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  Smartphone,
  Mail,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Check,
  ChevronRight,
  LogOut,
  Trash2,
  User,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface NotificationSettings {
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
  push: boolean;
  nouveauxBiens: boolean;
  messages: boolean;
  alertesPrix: boolean;
}

export default function ParametresPage() {
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    whatsapp: true,
    sms: false,
    push: true,
    nouveauxBiens: true,
    messages: true,
    alertesPrix: false,
  });

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSaving(false);
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDeleteAccount = async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    logout();
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-500 pt-6 pb-8 md:pt-8 md:pb-12">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <Link
              href="/"
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Parametres
              </h1>
              <p className="text-white/80 text-sm md:text-base">
                Gerez vos preferences
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">
        {/* Success Message */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-green-100 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl flex items-center gap-3"
          >
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-400 font-medium">
              Parametres enregistres avec succes !
            </p>
          </motion.div>
        )}

        {/* Account Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-dark-border">
            <h2 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              Compte
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            <Link
              href="/profil"
              className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors"
            >
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Mon profil</p>
                <p className="text-sm text-neutral-500">Modifier vos informations personnelles</p>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </Link>

            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Mot de passe</p>
                  <p className="text-sm text-neutral-500">Changer votre mot de passe</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-neutral-400 transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} />
            </button>

            {/* Password Form */}
            {showPasswordForm && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleChangePassword}
                className="px-4 py-4 bg-neutral-50 dark:bg-dark-bg space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card focus:outline-none focus:border-primary-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card focus:outline-none focus:border-primary-500"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Changer le mot de passe
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </div>
        </motion.div>

        {/* Appearance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-dark-border">
            <h2 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-500" />
              Apparence
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon className="w-5 h-5 text-neutral-500" /> : <Sun className="w-5 h-5 text-neutral-500" />}
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Mode sombre</p>
                  <p className="text-sm text-neutral-500">Activer le theme sombre</p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`w-12 h-7 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-primary-500' : 'bg-neutral-200'}`}
              >
                <motion.div
                  animate={{ x: isDarkMode ? 20 : 0 }}
                  className="w-5 h-5 bg-white rounded-full shadow"
                />
              </button>
            </div>

            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Langue</p>
                  <p className="text-sm text-neutral-500">Francais</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </div>
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-dark-border">
            <h2 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-500" />
              Notifications
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            {/* Channels */}
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Canaux</p>
              <div className="space-y-3">
                {[
                  { key: 'email' as const, icon: Mail, label: 'Email' },
                  { key: 'whatsapp' as const, icon: MessageSquare, label: 'WhatsApp' },
                  { key: 'sms' as const, icon: Smartphone, label: 'SMS' },
                  { key: 'push' as const, icon: Bell, label: 'Notifications push' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-neutral-500" />
                      <span className="text-neutral-900 dark:text-white">{item.label}</span>
                    </div>
                    <button
                      onClick={() => handleNotificationChange(item.key)}
                      className={`w-12 h-7 rounded-full p-1 transition-colors ${notifications[item.key] ? 'bg-primary-500' : 'bg-neutral-200'}`}
                    >
                      <motion.div
                        animate={{ x: notifications[item.key] ? 20 : 0 }}
                        className="w-5 h-5 bg-white rounded-full shadow"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Types */}
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Types de notifications</p>
              <div className="space-y-3">
                {[
                  { key: 'nouveauxBiens' as const, label: 'Nouveaux biens correspondant a vos criteres' },
                  { key: 'messages' as const, label: 'Nouveaux messages' },
                  { key: 'alertesPrix' as const, label: 'Alertes de baisse de prix' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-neutral-900 dark:text-white text-sm">{item.label}</span>
                    <button
                      onClick={() => handleNotificationChange(item.key)}
                      className={`w-12 h-7 rounded-full p-1 transition-colors ${notifications[item.key] ? 'bg-primary-500' : 'bg-neutral-200'}`}
                    >
                      <motion.div
                        animate={{ x: notifications[item.key] ? 20 : 0 }}
                        className="w-5 h-5 bg-white rounded-full shadow"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Privacy Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-dark-border">
            <h2 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-500" />
              Confidentialite
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            <Link
              href="/conditions"
              className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors"
            >
              <span className="text-neutral-900 dark:text-white">Conditions d'utilisation</span>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </Link>
            <Link
              href="/confidentialite"
              className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors"
            >
              <span className="text-neutral-900 dark:text-white">Politique de confidentialite</span>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </Link>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Enregistrer les parametres
            </>
          )}
        </motion.button>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden border border-red-200 dark:border-red-500/20"
        >
          <div className="px-4 py-3 border-b border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5">
            <h2 className="font-semibold text-red-600 dark:text-red-400">Zone de danger</h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors text-left"
            >
              <LogOut className="w-5 h-5 text-neutral-500" />
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Se deconnecter</p>
                <p className="text-sm text-neutral-500">Deconnexion de votre compte</p>
              </div>
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-600">Supprimer mon compte</p>
                <p className="text-sm text-neutral-500">Cette action est irreversible</p>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Supprimer votre compte ?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Cette action est irreversible. Toutes vos donnees, annonces et messages seront definitivement supprimes.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-neutral-100 dark:bg-dark-bg text-neutral-700 dark:text-neutral-300 font-medium rounded-xl hover:bg-neutral-200 dark:hover:bg-dark-border transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
