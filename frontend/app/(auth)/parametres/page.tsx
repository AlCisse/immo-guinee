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
import { useTranslations } from '@/lib/i18n';

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
  const { t } = useTranslations();
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
      alert(t('settings.account.passwordMismatch'));
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
                {t('settings.title')}
              </h1>
              <p className="text-white/80 text-sm md:text-base">
                {t('settings.subtitle')}
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
              {t('settings.savedSuccess')}
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
              {t('settings.account.title')}
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            <Link
              href="/profil"
              className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors"
            >
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">{t('settings.account.myProfile')}</p>
                <p className="text-sm text-neutral-500">{t('settings.account.myProfileDesc')}</p>
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
                  <p className="font-medium text-neutral-900 dark:text-white">{t('settings.account.password')}</p>
                  <p className="text-sm text-neutral-500">{t('settings.account.passwordDesc')}</p>
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
                    {t('settings.account.currentPassword')}
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
                    {t('settings.account.newPassword')}
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
                    {t('settings.account.confirmPassword')}
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
                      {t('settings.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {t('settings.account.changePassword')}
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
              {t('settings.appearance.title')}
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon className="w-5 h-5 text-neutral-500" /> : <Sun className="w-5 h-5 text-neutral-500" />}
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">{t('settings.appearance.darkMode')}</p>
                  <p className="text-sm text-neutral-500">{t('settings.appearance.darkModeDesc')}</p>
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
                  <p className="font-medium text-neutral-900 dark:text-white">{t('settings.appearance.language')}</p>
                  <p className="text-sm text-neutral-500">{t('language.fr')}</p>
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
              {t('settings.notifications.title')}
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            {/* Channels */}
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">{t('settings.notifications.channels')}</p>
              <div className="space-y-3">
                {[
                  { key: 'email' as const, icon: Mail, labelKey: 'settings.notifications.email' },
                  { key: 'whatsapp' as const, icon: MessageSquare, labelKey: 'settings.notifications.whatsapp' },
                  { key: 'sms' as const, icon: Smartphone, labelKey: 'settings.notifications.sms' },
                  { key: 'push' as const, icon: Bell, labelKey: 'settings.notifications.push' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-neutral-500" />
                      <span className="text-neutral-900 dark:text-white">{t(item.labelKey)}</span>
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
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">{t('settings.notifications.types')}</p>
              <div className="space-y-3">
                {[
                  { key: 'nouveauxBiens' as const, labelKey: 'settings.notifications.newListings' },
                  { key: 'messages' as const, labelKey: 'settings.notifications.newMessages' },
                  { key: 'alertesPrix' as const, labelKey: 'settings.notifications.priceAlerts' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-neutral-900 dark:text-white text-sm">{t(item.labelKey)}</span>
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
              {t('settings.privacy.title')}
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            <Link
              href="/conditions"
              className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors"
            >
              <span className="text-neutral-900 dark:text-white">{t('settings.privacy.terms')}</span>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </Link>
            <Link
              href="/confidentialite"
              className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors"
            >
              <span className="text-neutral-900 dark:text-white">{t('settings.privacy.privacyPolicy')}</span>
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
              {t('settings.saving')}
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {t('settings.save')}
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
            <h2 className="font-semibold text-red-600 dark:text-red-400">{t('settings.danger.title')}</h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors text-left"
            >
              <LogOut className="w-5 h-5 text-neutral-500" />
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">{t('settings.danger.logout')}</p>
                <p className="text-sm text-neutral-500">{t('settings.danger.logoutDesc')}</p>
              </div>
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-600">{t('settings.danger.deleteAccount')}</p>
                <p className="text-sm text-neutral-500">{t('settings.danger.deleteAccountDesc')}</p>
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
                {t('settings.danger.deleteConfirmTitle')}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                {t('settings.danger.deleteConfirmDesc')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-neutral-100 dark:bg-dark-bg text-neutral-700 dark:text-neutral-300 font-medium rounded-xl hover:bg-neutral-200 dark:hover:bg-dark-border transition-colors"
                >
                  {t('settings.danger.cancel')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
                >
                  {t('settings.danger.delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
