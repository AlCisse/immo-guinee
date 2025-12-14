'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import apiClient from '@/lib/api/client';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  User,
  Home,
  FileText,
  MessageSquare,
  AlertTriangle,
  Calendar,
  CreditCard,
  Shield,
  Loader2,
  RefreshCw,
  Star,
  XCircle,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  titre: string;
  message: string;
  data: Record<string, any> | null;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    nom_complet: string;
    telephone: string;
    email: string;
  };
}

interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  high_priority: number;
}

const NOTIFICATION_TYPES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  'listing_created': { label: 'Nouvelle annonce', icon: Home, color: 'text-blue-500' },
  'listing_approved': { label: 'Annonce approuvée', icon: Home, color: 'text-green-500' },
  'listing_rejected': { label: 'Annonce rejetée', icon: XCircle, color: 'text-red-500' },
  'contract_created': { label: 'Nouveau contrat', icon: FileText, color: 'text-blue-500' },
  'contract_signed': { label: 'Contrat signé', icon: FileText, color: 'text-green-500' },
  'contract_cancelled': { label: 'Contrat annulé', icon: FileText, color: 'text-red-500' },
  'payment_received': { label: 'Paiement reçu', icon: CreditCard, color: 'text-emerald-500' },
  'payment_reminder': { label: 'Rappel de paiement', icon: CreditCard, color: 'text-orange-500' },
  'message_received': { label: 'Nouveau message', icon: MessageSquare, color: 'text-purple-500' },
  'visit_requested': { label: 'Demande de visite', icon: Calendar, color: 'text-orange-500' },
  'visit_confirmed': { label: 'Visite confirmée', icon: Calendar, color: 'text-green-500' },
  'visit_cancelled': { label: 'Visite annulée', icon: Calendar, color: 'text-red-500' },
  'rating_received': { label: 'Nouvelle évaluation', icon: Star, color: 'text-yellow-500' },
  'dispute_opened': { label: 'Litige ouvert', icon: AlertTriangle, color: 'text-red-500' },
  'dispute_resolved': { label: 'Litige résolu', icon: AlertTriangle, color: 'text-green-500' },
  'certification_approved': { label: 'Certification approuvée', icon: Shield, color: 'text-green-500' },
  'certification_rejected': { label: 'Certification rejetée', icon: Shield, color: 'text-red-500' },
  'system': { label: 'Système', icon: Bell, color: 'text-neutral-500' },
  'welcome': { label: 'Bienvenue', icon: UserPlus, color: 'text-cyan-500' },
  'default': { label: 'Notification', icon: Bell, color: 'text-neutral-500' },
};

export default function AdminNotificationsPage() {
  const [filters, setFilters] = useState<{
    search?: string;
    type?: string;
    is_read?: boolean;
    page?: number;
  }>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'notifications', filters],
    queryFn: async () => {
      const params: Record<string, any> = { ...filters };
      // Convert is_read to the format expected by the backend
      if (filters.is_read !== undefined) {
        params.is_read = filters.is_read ? '1' : '0';
      }
      const response = await apiClient.get('/admin/notifications', { params });
      return response.data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiClient.post('/admin/notifications/mark-read', { notification_ids: ids });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      setSelectedIds([]);
      toast.success('Notifications marquées comme lues');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/admin/notifications/mark-all-read');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      toast.success('Toutes les notifications marquées comme lues');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiClient.post('/admin/notifications/delete', { notification_ids: ids });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      setSelectedIds([]);
      toast.success('Notifications supprimées');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setFilters({ ...filters, search: formData.get('search') as string, page: 1 });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n: Notification) => n.id));
    }
  };

  const notifications: Notification[] = data?.data || [];
  const stats: NotificationStats = data?.stats || { total: 0, unread: 0, read: 0, high_priority: 0 };
  const meta = data?.meta || { total: 0, last_page: 1, current_page: 1, per_page: 20 };

  const getNotificationInfo = (type: string) => {
    return NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES['default'];
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return d.toLocaleDateString('fr-FR');
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      'URGENT': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
      'HIGH': 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
      'NORMAL': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      'LOW': 'bg-neutral-100 text-neutral-600 dark:bg-neutral-500/20 dark:text-neutral-400',
    };
    return styles[priority] || styles['NORMAL'];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Bell className="w-7 h-7 text-primary-500" />
            Notifications
          </h1>
          <p className="text-gray-600 dark:text-neutral-400 mt-1">
            Gérez toutes les notifications de la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          {stats.unread > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              Tout marquer comme lu
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.total}</p>
              <p className="text-sm text-neutral-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-xl">
              <BellOff className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.unread}</p>
              <p className="text-sm text-neutral-500">Non lues</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-xl">
              <CheckCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.read}</p>
              <p className="text-sm text-neutral-500">Lues</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.high_priority}</p>
              <p className="text-sm text-neutral-500">Priorité haute</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft">
        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              name="search"
              placeholder="Rechercher dans les notifications..."
              className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
          >
            Rechercher
          </button>
        </form>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <Filter className="w-5 h-5 text-neutral-400" />
            <select
              value={filters.is_read === undefined ? '' : filters.is_read ? 'read' : 'unread'}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  const { is_read, ...rest } = filters;
                  setFilters({ ...rest, page: 1 });
                } else {
                  setFilters({ ...filters, is_read: value === 'read', page: 1 });
                }
              }}
              className="px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Toutes les notifications</option>
              <option value="unread">Non lues</option>
              <option value="read">Lues</option>
            </select>

            <select
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined, page: 1 })}
              className="px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tous les types</option>
              <option value="welcome">Bienvenue</option>
              <option value="listing_approved">Annonce approuvée</option>
              <option value="listing_rejected">Annonce rejetée</option>
              <option value="message_received">Nouveau message</option>
              <option value="visit_requested">Demande de visite</option>
              <option value="visit_confirmed">Visite confirmée</option>
              <option value="contract_created">Contrat créé</option>
              <option value="payment_received">Paiement reçu</option>
              <option value="rating_received">Évaluation reçue</option>
              <option value="system">Système</option>
            </select>

            {(filters.is_read !== undefined || filters.search || filters.type) && (
              <button
                onClick={() => setFilters({})}
                className="text-sm text-primary-500 hover:text-primary-600 font-medium"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => markAsReadMutation.mutate(selectedIds)}
                disabled={markAsReadMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-200 dark:hover:bg-green-500/20 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Marquer comme lues ({selectedIds.length})
              </button>
              <button
                onClick={() => deleteMutation.mutate(selectedIds)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer ({selectedIds.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
            <p className="text-neutral-500">Aucune notification trouvée</p>
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="px-6 py-3 bg-neutral-50 dark:bg-dark-hover border-b border-neutral-200 dark:border-dark-border flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedIds.length === notifications.length && notifications.length > 0}
                onChange={selectAll}
                className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {selectedIds.length > 0 ? `${selectedIds.length} sélectionnée(s)` : 'Tout sélectionner'}
              </span>
            </div>

            {/* Notification Items */}
            <div className="divide-y divide-neutral-100 dark:divide-dark-border">
              {notifications.map((notification: Notification, index: number) => {
                const info = getNotificationInfo(notification.type);
                const IconComponent = info.icon;

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={clsx(
                      'flex items-start gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors cursor-pointer',
                      !notification.is_read && 'bg-blue-50/50 dark:bg-blue-500/5'
                    )}
                    onClick={() => toggleSelect(notification.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(notification.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(notification.id);
                      }}
                      className="mt-1 w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                    />

                    <div className={clsx('p-2 rounded-xl', !notification.is_read ? 'bg-white dark:bg-dark-card' : 'bg-neutral-100 dark:bg-dark-hover')}>
                      <IconComponent className={clsx('w-5 h-5', info.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={clsx(
                              'text-sm',
                              !notification.is_read ? 'font-semibold text-neutral-900 dark:text-white' : 'font-medium text-neutral-700 dark:text-neutral-300'
                            )}>
                              {notification.titre}
                            </p>
                            {notification.priority && notification.priority !== 'NORMAL' && (
                              <span className={clsx('px-2 py-0.5 text-xs rounded-full font-medium', getPriorityBadge(notification.priority))}>
                                {notification.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-neutral-400">{formatDate(notification.created_at)}</p>
                          {!notification.is_read && (
                            <span className="inline-block mt-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                      </div>

                      {notification.user && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-6 h-6 bg-neutral-200 dark:bg-dark-hover rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-neutral-500" />
                          </div>
                          <span className="text-xs text-neutral-500">
                            {notification.user.nom_complet} ({notification.user.telephone})
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <span className={clsx('px-2 py-0.5 text-xs rounded-full', info.color.replace('text-', 'bg-').replace('500', '100'), info.color)}>
                          {info.label}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Page {meta.current_page} sur {meta.last_page} ({meta.total} notifications)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
              disabled={(filters.page || 1) <= 1}
              className="px-4 py-2 text-sm bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Précédent
            </button>
            <button
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
              disabled={(filters.page || 1) >= meta.last_page}
              className="px-4 py-2 text-sm bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
