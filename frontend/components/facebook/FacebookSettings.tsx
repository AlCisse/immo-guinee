'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Facebook,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import {
  useFacebookStatus,
  useFacebookConnect,
  useFacebookDisconnect,
  useFacebookToggleAutoPublish,
  useFacebookRefreshToken,
} from '@/lib/hooks/useFacebook';

export default function FacebookSettings() {
  const { t } = useTranslations();
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);

  const { data: status, isLoading: statusLoading } = useFacebookStatus();
  const connectMutation = useFacebookConnect();
  const disconnectMutation = useFacebookDisconnect();
  const toggleAutoPublishMutation = useFacebookToggleAutoPublish();
  const refreshTokenMutation = useFacebookRefreshToken();

  const handleConnect = async () => {
    try {
      const result = await connectMutation.mutateAsync();
      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      }
    } catch (error) {
      console.error('Facebook connect error:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      setShowConfirmDisconnect(false);
    } catch (error) {
      console.error('Facebook disconnect error:', error);
    }
  };

  const handleToggleAutoPublish = async () => {
    if (!status?.connection) return;
    try {
      await toggleAutoPublishMutation.mutateAsync(!status.connection.auto_publish_enabled);
    } catch (error) {
      console.error('Toggle auto-publish error:', error);
    }
  };

  const handleRefreshToken = async () => {
    try {
      await refreshTokenMutation.mutateAsync();
    } catch (error) {
      console.error('Refresh token error:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTokenStatus = () => {
    if (!status?.connection) return null;

    const expiresAt = new Date(status.connection.token_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (!status.connection.is_token_valid || daysUntilExpiry <= 0) {
      return {
        status: 'expired',
        icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
        text: t('facebook.tokenExpired'),
        color: 'text-red-600 dark:text-red-400',
      };
    }

    if (daysUntilExpiry <= 7) {
      return {
        status: 'expiring',
        icon: <Clock className="w-4 h-4 text-amber-500" />,
        text: t('facebook.tokenExpiresSoon', { days: daysUntilExpiry }),
        color: 'text-amber-600 dark:text-amber-400',
      };
    }

    return {
      status: 'valid',
      icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
      text: t('facebook.tokenValid', { days: daysUntilExpiry }),
      color: 'text-emerald-600 dark:text-emerald-400',
    };
  };

  if (statusLoading) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#1877F2]/10 rounded-xl flex items-center justify-center">
            <Facebook className="w-5 h-5 text-[#1877F2]" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900 dark:text-white">
              {t('facebook.title')}
            </h2>
            <p className="text-sm text-neutral-500">{t('facebook.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  const tokenStatus = getTokenStatus();

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#1877F2]/10 rounded-xl flex items-center justify-center">
          <Facebook className="w-5 h-5 text-[#1877F2]" />
        </div>
        <div>
          <h2 className="font-semibold text-neutral-900 dark:text-white">
            {t('facebook.title')}
          </h2>
          <p className="text-sm text-neutral-500">{t('facebook.subtitle')}</p>
        </div>
      </div>

      {/* Not Connected State */}
      {!status?.connected && (
        <div className="space-y-4">
          <p className="text-neutral-600 dark:text-neutral-400 text-sm">
            {t('facebook.notConnectedDescription')}
          </p>
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary-500" />
              {t('facebook.benefit1')}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary-500" />
              {t('facebook.benefit2')}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary-500" />
              {t('facebook.benefit3')}
            </li>
          </ul>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConnect}
            disabled={connectMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {connectMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LinkIcon className="w-5 h-5" />
                {t('facebook.connectButton')}
              </>
            )}
          </motion.button>
        </div>
      )}

      {/* Connected State */}
      {status?.connected && status.connection && (
        <div className="space-y-5">
          {/* Page Info */}
          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center text-white font-bold">
                {status.connection.page_name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {status.connection.page_name}
                </p>
                <div className="flex items-center gap-1 text-sm">
                  {tokenStatus?.icon}
                  <span className={tokenStatus?.color}>{tokenStatus?.text}</span>
                </div>
              </div>
            </div>
            <a
              href={`https://facebook.com/${status.connection.page_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-neutral-200 dark:hover:bg-dark-border rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-neutral-500" />
            </a>
          </div>

          {/* Token Refresh Warning */}
          {tokenStatus?.status === 'expired' && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    {t('facebook.tokenExpiredTitle')}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {t('facebook.tokenExpiredDescription')}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRefreshToken}
                    disabled={refreshTokenMutation.isPending}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {refreshTokenMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {t('facebook.refreshToken')}
                  </motion.button>
                </div>
              </div>
            </div>
          )}

          {/* Auto-Publish Toggle */}
          <div className="flex items-center justify-between p-4 border border-neutral-200 dark:border-dark-border rounded-xl">
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">
                {t('facebook.autoPublish')}
              </p>
              <p className="text-sm text-neutral-500 mt-0.5">
                {t('facebook.autoPublishDescription')}
              </p>
            </div>
            <button
              onClick={handleToggleAutoPublish}
              disabled={toggleAutoPublishMutation.isPending}
              className="focus:outline-none disabled:opacity-50"
            >
              {toggleAutoPublishMutation.isPending ? (
                <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
              ) : status.connection.auto_publish_enabled ? (
                <ToggleRight className="w-10 h-10 text-primary-500" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-neutral-400" />
              )}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {status.connection.posts_count}
              </p>
              <p className="text-sm text-neutral-500">{t('facebook.totalPosts')}</p>
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                {formatDate(status.connection.last_published_at)}
              </p>
              <p className="text-sm text-neutral-500">{t('facebook.lastPublished')}</p>
            </div>
          </div>

          {/* Disconnect Button */}
          {!showConfirmDisconnect ? (
            <button
              onClick={() => setShowConfirmDisconnect(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-neutral-200 dark:border-dark-border text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-dark-bg font-medium rounded-xl transition-colors"
            >
              <Unlink className="w-5 h-5" />
              {t('facebook.disconnectButton')}
            </button>
          ) : (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
              <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                {t('facebook.disconnectConfirm')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDisconnect(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 dark:border-dark-border text-neutral-700 dark:text-neutral-300 font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-bg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('facebook.confirmDisconnect')
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
