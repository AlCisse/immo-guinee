'use client';

import { useState, useEffect } from 'react';
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
  Smartphone,
  Key,
  Copy,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import QRCode from 'qrcode';

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
  disabled,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
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
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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

// 2FA Setup Modal
function TwoFactorSetupModal({
  isOpen,
  onClose,
  setupData,
  onConfirm,
  isConfirming,
  isConfirmed,
}: {
  isOpen: boolean;
  onClose: () => void;
  setupData: { secret: string; qr_code_url: string; recovery_codes: string[] } | null;
  onConfirm: (code: string) => void;
  isConfirming: boolean;
  isConfirmed: boolean;
}) {
  const [code, setCode] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  useEffect(() => {
    if (setupData?.qr_code_url) {
      QRCode.toDataURL(setupData.qr_code_url, { width: 200 })
        .then(setQrCodeDataUrl)
        .catch(console.error);
    }
  }, [setupData?.qr_code_url]);

  // Reset code when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCode('');
      setQrCodeDataUrl('');
    }
  }, [isOpen]);

  if (!isOpen || !setupData) return null;

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(setupData.recovery_codes.join('\n'));
    toast.success('Codes copies dans le presse-papiers');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-dark-card rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
              Configuration 2FA
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-border rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isConfirmed ? (
            <>
              <div className="text-center mb-6">
                <p className="text-neutral-600 dark:text-neutral-300 mb-4">
                  Scannez ce QR code avec Google Authenticator ou une application similaire
                </p>
                {qrCodeDataUrl && (
                  <img src={qrCodeDataUrl} alt="QR Code" className="mx-auto mb-4" />
                )}
                <div className="bg-neutral-100 dark:bg-dark-bg p-3 rounded-lg">
                  <p className="text-xs text-neutral-500 mb-1">Cle secrete (si scan impossible)</p>
                  <code className="text-sm font-mono text-neutral-900 dark:text-white break-all">
                    {setupData.secret}
                  </code>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Entrez le code a 6 chiffres
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
                  maxLength={6}
                />
              </div>

              <button
                onClick={() => {
                  if (code.length === 6) {
                    onConfirm(code);
                  }
                }}
                disabled={code.length !== 6 || isConfirming}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verification...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirmer
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h4 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                  2FA Active!
                </h4>
                <p className="text-neutral-600 dark:text-neutral-300">
                  Sauvegardez ces codes de recuperation en lieu sur
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Ces codes ne seront plus affiches. Conservez-les dans un endroit securise.
                  </p>
                </div>
              </div>

              <div className="bg-neutral-100 dark:bg-dark-bg rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {setupData.recovery_codes.map((code, i) => (
                    <code key={i} className="text-sm font-mono text-neutral-900 dark:text-white">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <button
                onClick={copyRecoveryCodes}
                className="w-full py-2 border border-neutral-200 dark:border-dark-border text-neutral-700 dark:text-neutral-300 font-medium rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-border flex items-center justify-center gap-2 mb-4"
              >
                <Copy className="w-4 h-4" />
                Copier les codes
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl"
              >
                Terminer
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [setupData, setSetupData] = useState<any>(null);

  // Fetch 2FA status
  const { data: twoFAStatus, refetch: refetch2FAStatus, isLoading: is2FALoading } = useQuery({
    queryKey: ['admin-2fa-status'],
    queryFn: async () => {
      const response = await api.get('/admin/2fa/status');
      return response.data?.data;
    },
    staleTime: 0, // Always fetch fresh data
    retry: 1,
  });

  // Setup 2FA mutation
  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/admin/2fa/setup');
      return response.data?.data;
    },
    onSuccess: (data) => {
      setSetupData(data);
      setShow2FAModal(true);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la configuration');
    },
  });

  // Confirm 2FA mutation
  const confirm2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post('/admin/2fa/confirm', { code });
      return response.data;
    },
    onSuccess: () => {
      toast.success('2FA active avec succes!');
      refetch2FAStatus();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Code invalide');
    },
  });

  // Disable 2FA mutation
  const disable2FAMutation = useMutation({
    mutationFn: async ({ password, code }: { password: string; code: string }) => {
      const response = await api.post('/admin/2fa/disable', { password, code });
      return response.data;
    },
    onSuccess: () => {
      toast.success('2FA desactive');
      refetch2FAStatus();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la desactivation');
    },
  });

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

  const handle2FAToggle = async (enabled: boolean) => {
    if (enabled) {
      // Start 2FA setup
      setup2FAMutation.mutate();
    } else {
      // Show disable confirmation
      const password = prompt('Entrez votre mot de passe pour desactiver le 2FA:');
      const code = prompt('Entrez le code 2FA actuel:');
      if (password && code) {
        disable2FAMutation.mutate({ password, code });
      }
    }
  };

  const is2FAEnabled = twoFAStatus?.two_factor_enabled && twoFAStatus?.two_factor_confirmed;

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
        {/* Security Settings - Moved to top for emphasis */}
        <SettingsSection
          icon={Shield}
          title="Securite Admin"
          description="Protegez votre compte administrateur"
        >
          <div className="space-y-1 divide-y divide-neutral-100 dark:divide-dark-border">
            <div className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${is2FAEnabled ? 'bg-green-100 dark:bg-green-500/20' : 'bg-neutral-100 dark:bg-dark-bg'}`}>
                    <Smartphone className={`w-5 h-5 ${is2FAEnabled ? 'text-green-600' : 'text-neutral-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      Double authentification (2FA)
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {is2FAEnabled
                        ? 'Active - Votre compte est protege'
                        : 'Protegez votre compte avec Google Authenticator'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handle2FAToggle(!is2FAEnabled)}
                  disabled={is2FALoading || setup2FAMutation.isPending || disable2FAMutation.isPending}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    is2FAEnabled ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'
                  } ${(is2FALoading || setup2FAMutation.isPending || disable2FAMutation.isPending) ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      is2FAEnabled ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
              {is2FAEnabled && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      const code = prompt('Entrez le code 2FA actuel pour regenerer les codes:');
                      if (code) {
                        api.post('/admin/2fa/recovery-codes', { code })
                          .then((res) => {
                            const codes = res.data?.data?.recovery_codes;
                            if (codes) {
                              alert('Nouveaux codes de recuperation:\n\n' + codes.join('\n'));
                            }
                          })
                          .catch((err) => toast.error(err?.response?.data?.message || 'Erreur'));
                      }
                    }}
                    className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
                  >
                    <Key className="w-4 h-4" />
                    Regenerer codes de recuperation
                  </button>
                </div>
              )}
            </div>
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
          </div>
        </SettingsSection>

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

      {/* 2FA Setup Modal */}
      <TwoFactorSetupModal
        isOpen={show2FAModal}
        onClose={() => {
          setShow2FAModal(false);
          setSetupData(null);
          confirm2FAMutation.reset();
        }}
        setupData={setupData}
        onConfirm={(code) => confirm2FAMutation.mutate(code)}
        isConfirming={confirm2FAMutation.isPending}
        isConfirmed={confirm2FAMutation.isSuccess}
      />
    </div>
  );
}
