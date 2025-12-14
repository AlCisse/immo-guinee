'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Bell,
  Shield,
  CreditCard,
  Mail,
  MessageSquare,
  Globe,
  Palette,
  Database,
  Server,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Settings Section Component
function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
          <Icon className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {title}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// Toggle Switch Component
function ToggleSwitch({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-neutral-900 dark:text-white">{label}</p>
        {description && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-6' : ''
          }`}
        />
      </button>
    </div>
  );
}

// Input Field Component
function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  description?: string;
}) {
  return (
    <div className="py-3">
      <label className="block font-medium text-neutral-900 dark:text-white mb-1">
        {label}
      </label>
      {description && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">{description}</p>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900 dark:text-white"
      />
    </div>
  );
}

// Select Field Component
function SelectField({
  label,
  value,
  onChange,
  options,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  description?: string;
}) {
  return (
    <div className="py-3">
      <label className="block font-medium text-neutral-900 dark:text-white mb-1">
        {label}
      </label>
      {description && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">{description}</p>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900 dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // General
    siteName: 'ImmoGuinee',
    siteDescription: 'Plateforme immobiliere de reference en Guinee',
    maintenanceMode: false,

    // Notifications
    emailNotifications: true,
    smsNotifications: true,
    whatsappNotifications: true,
    pushNotifications: false,

    // Moderation
    autoApproveListings: false,
    requirePhoneVerification: true,
    requireEmailVerification: false,
    moderationStrictness: 'medium',

    // Payments
    commissionRate: '5',
    minimumWithdrawal: '100000',
    paymentMethods: ['orange_money', 'mtn_momo'],

    // Listings
    maxPhotosPerListing: '10',
    listingDuration: '90',
    premiumDuration: '30',

    // Security
    maxLoginAttempts: '5',
    sessionTimeout: '60',
    twoFactorAuth: false,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Parametres enregistres avec succes');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-500 pt-6 pb-12 md:pt-8 md:pb-16 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Parametres
              </h1>
              <p className="text-white/80">
                Configuration generale de la plateforme
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl shadow-lg disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Enregistrer
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-8 space-y-6">
        {/* General Settings */}
        <SettingsSection
          icon={Globe}
          title="Parametres generaux"
          description="Configuration de base de la plateforme"
        >
          <div className="space-y-1 divide-y divide-neutral-100 dark:divide-dark-border">
            <InputField
              label="Nom du site"
              value={settings.siteName}
              onChange={(value) => updateSetting('siteName', value)}
            />
            <InputField
              label="Description"
              value={settings.siteDescription}
              onChange={(value) => updateSetting('siteDescription', value)}
            />
            <ToggleSwitch
              enabled={settings.maintenanceMode}
              onChange={(value) => updateSetting('maintenanceMode', value)}
              label="Mode maintenance"
              description="Desactive l'acces au site pour les utilisateurs"
            />
          </div>
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection
          icon={Bell}
          title="Notifications"
          description="Gestion des canaux de notification"
        >
          <div className="space-y-1 divide-y divide-neutral-100 dark:divide-dark-border">
            <ToggleSwitch
              enabled={settings.emailNotifications}
              onChange={(value) => updateSetting('emailNotifications', value)}
              label="Notifications email"
              description="Envoyer des emails aux utilisateurs"
            />
            <ToggleSwitch
              enabled={settings.smsNotifications}
              onChange={(value) => updateSetting('smsNotifications', value)}
              label="Notifications SMS"
              description="Envoyer des SMS aux utilisateurs"
            />
            <ToggleSwitch
              enabled={settings.whatsappNotifications}
              onChange={(value) => updateSetting('whatsappNotifications', value)}
              label="Notifications WhatsApp"
              description="Envoyer des messages WhatsApp via WAHA"
            />
            <ToggleSwitch
              enabled={settings.pushNotifications}
              onChange={(value) => updateSetting('pushNotifications', value)}
              label="Notifications push"
              description="Notifications push web et mobile"
            />
          </div>
        </SettingsSection>

        {/* Moderation Settings */}
        <SettingsSection
          icon={Shield}
          title="Moderation"
          description="Regles de moderation du contenu"
        >
          <div className="space-y-1 divide-y divide-neutral-100 dark:divide-dark-border">
            <ToggleSwitch
              enabled={settings.autoApproveListings}
              onChange={(value) => updateSetting('autoApproveListings', value)}
              label="Approbation automatique"
              description="Publier les annonces sans moderation manuelle"
            />
            <ToggleSwitch
              enabled={settings.requirePhoneVerification}
              onChange={(value) => updateSetting('requirePhoneVerification', value)}
              label="Verification telephone obligatoire"
              description="Les utilisateurs doivent verifier leur numero"
            />
            <ToggleSwitch
              enabled={settings.requireEmailVerification}
              onChange={(value) => updateSetting('requireEmailVerification', value)}
              label="Verification email obligatoire"
              description="Les utilisateurs doivent verifier leur email"
            />
            <SelectField
              label="Niveau de moderation"
              value={settings.moderationStrictness}
              onChange={(value) => updateSetting('moderationStrictness', value)}
              options={[
                { value: 'low', label: 'Faible - Moderation minimale' },
                { value: 'medium', label: 'Moyen - Moderation standard' },
                { value: 'high', label: 'Eleve - Moderation stricte' },
              ]}
            />
          </div>
        </SettingsSection>

        {/* Payment Settings */}
        <SettingsSection
          icon={CreditCard}
          title="Paiements"
          description="Configuration des paiements et commissions"
        >
          <div className="space-y-1 divide-y divide-neutral-100 dark:divide-dark-border">
            <InputField
              label="Taux de commission (%)"
              value={settings.commissionRate}
              onChange={(value) => updateSetting('commissionRate', value)}
              type="number"
              description="Pourcentage preleve sur chaque transaction"
            />
            <InputField
              label="Retrait minimum (GNF)"
              value={settings.minimumWithdrawal}
              onChange={(value) => updateSetting('minimumWithdrawal', value)}
              type="number"
              description="Montant minimum pour un retrait"
            />
          </div>
        </SettingsSection>

        {/* Listings Settings */}
        <SettingsSection
          icon={Database}
          title="Annonces"
          description="Configuration des annonces"
        >
          <div className="space-y-1 divide-y divide-neutral-100 dark:divide-dark-border">
            <InputField
              label="Photos maximum par annonce"
              value={settings.maxPhotosPerListing}
              onChange={(value) => updateSetting('maxPhotosPerListing', value)}
              type="number"
            />
            <InputField
              label="Duree de publication (jours)"
              value={settings.listingDuration}
              onChange={(value) => updateSetting('listingDuration', value)}
              type="number"
              description="Duree avant expiration d'une annonce"
            />
            <InputField
              label="Duree premium (jours)"
              value={settings.premiumDuration}
              onChange={(value) => updateSetting('premiumDuration', value)}
              type="number"
              description="Duree d'une mise en avant premium"
            />
          </div>
        </SettingsSection>

        {/* Security Settings */}
        <SettingsSection
          icon={Shield}
          title="Securite"
          description="Parametres de securite de la plateforme"
        >
          <div className="space-y-1 divide-y divide-neutral-100 dark:divide-dark-border">
            <InputField
              label="Tentatives de connexion max"
              value={settings.maxLoginAttempts}
              onChange={(value) => updateSetting('maxLoginAttempts', value)}
              type="number"
              description="Nombre de tentatives avant blocage"
            />
            <InputField
              label="Timeout session (minutes)"
              value={settings.sessionTimeout}
              onChange={(value) => updateSetting('sessionTimeout', value)}
              type="number"
              description="Duree d'inactivite avant deconnexion"
            />
            <ToggleSwitch
              enabled={settings.twoFactorAuth}
              onChange={(value) => updateSetting('twoFactorAuth', value)}
              label="Double authentification"
              description="Activer la 2FA pour les comptes admin"
            />
          </div>
        </SettingsSection>

        {/* System Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Information systeme
              </h3>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p>Version: 1.0.0</p>
                <p>Environnement: Production</p>
                <p>Derniere mise a jour: {new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
