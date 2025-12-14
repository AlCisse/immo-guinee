import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

// ==================== TYPES ====================

export interface ModeratorStats {
  pending_count: number;
  reported_count: number;
  flagged_users_count: number;
  today_actions: number;
  my_stats: {
    total_actions: number;
    today: number;
    this_week: number;
    approvals: number;
    rejections: number;
  };
  urgent_items: UrgentItem[];
}

export interface UrgentItem {
  type: 'listing' | 'report';
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export interface ModerationListing {
  id: string;
  reference: string;
  titre: string;
  type_bien: string;
  type_transaction: string;
  prix: number;
  devise: string;
  ville: string;
  quartier: string;
  statut: string;
  reports_count: number;
  photos: { id: string; url: string; is_primary: boolean }[];
  photos_count: number;
  description: string;
  surface: number;
  nb_chambres: number;
  nb_salles_bain: number;
  meuble: boolean;
  proprietaire: {
    id: string;
    nom: string;
    telephone: string;
    badge: string;
    membre_depuis: string;
  };
  created_at: string;
  days_pending: number;
}

export interface Report {
  id: string;
  type: string;
  reason: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  created_at: string;
  reporter?: {
    id: string;
    nom_complet: string;
    telephone: string;
  };
  reported_user?: {
    id: string;
    nom_complet: string;
    telephone: string;
  };
  listing?: {
    id: string;
    titre: string;
    reference: string;
  };
  message?: {
    id: string;
    contenu: string;
  };
}

export interface ModeratorUser {
  id: string;
  nom_complet: string;
  telephone: string;
  type_compte: string;
  badge: string;
  is_suspended: boolean;
  is_flagged: boolean;
  created_at: string;
  last_login_at: string;
  listings_count: number;
  reports_received_count: number;
}

export interface ModerationLog {
  id: string;
  moderator_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  note: string;
  created_at: string;
  moderator?: {
    id: string;
    nom_complet: string;
  };
}

export interface MessageTemplate {
  code: string;
  label: string;
  message: string;
}

export interface MessageTemplates {
  rejection: MessageTemplate[];
  modification: MessageTemplate[];
  warning: MessageTemplate[];
}

// ==================== HOOKS ====================

/**
 * Hook pour le dashboard modérateur
 */
export function useModeratorDashboard() {
  return useQuery({
    queryKey: ['moderator', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/moderator/dashboard');
      return response.data.data as ModeratorStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  });
}

/**
 * Hook pour les statistiques de modération
 */
export function useModeratorStats(period: number = 30) {
  return useQuery({
    queryKey: ['moderator', 'stats', period],
    queryFn: async () => {
      const response = await apiClient.get('/moderator/stats', { params: { period } });
      return response.data.data;
    },
  });
}

/**
 * Hook pour la liste des annonces à modérer
 */
export function useListingsQueue(params: {
  status?: string;
  type_bien?: string;
  ville?: string;
  search?: string;
  page?: number;
  per_page?: number;
} = {}) {
  return useQuery({
    queryKey: ['moderator', 'listings', params],
    queryFn: async () => {
      const response = await apiClient.get('/moderator/listings', { params });
      return {
        listings: response.data.data as ModerationListing[],
        meta: response.data.meta,
      };
    },
  });
}

/**
 * Hook pour obtenir les détails d'une annonce
 */
export function useListingDetails(listingId: string) {
  return useQuery({
    queryKey: ['moderator', 'listing', listingId],
    queryFn: async () => {
      const response = await apiClient.get(`/moderator/listings/${listingId}`);
      return response.data.data;
    },
    enabled: !!listingId,
  });
}

/**
 * Hook pour approuver une annonce
 */
export function useApproveListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, note }: { listingId: string; note?: string }) => {
      const response = await apiClient.post(`/moderator/listings/${listingId}/approve`, { note });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['moderator', 'dashboard'] });
    },
  });
}

/**
 * Hook pour rejeter une annonce
 */
export function useRejectListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listingId,
      reason,
      reason_code,
    }: {
      listingId: string;
      reason: string;
      reason_code?: string;
    }) => {
      const response = await apiClient.post(`/moderator/listings/${listingId}/reject`, {
        reason,
        reason_code,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['moderator', 'dashboard'] });
    },
  });
}

/**
 * Hook pour suspendre une annonce
 */
export function useSuspendListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listingId,
      reason,
      duration_days,
    }: {
      listingId: string;
      reason: string;
      duration_days?: number;
    }) => {
      const response = await apiClient.post(`/moderator/listings/${listingId}/suspend`, {
        reason,
        duration_days,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['moderator', 'dashboard'] });
    },
  });
}

/**
 * Hook pour demander des modifications
 */
export function useRequestChanges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listingId,
      changes_requested,
      message,
    }: {
      listingId: string;
      changes_requested: string[];
      message?: string;
    }) => {
      const response = await apiClient.post(`/moderator/listings/${listingId}/request-changes`, {
        changes_requested,
        message,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['moderator', 'dashboard'] });
    },
  });
}

/**
 * Hook pour contacter le propriétaire
 */
export function useContactOwner() {
  return useMutation({
    mutationFn: async ({
      listingId,
      channel,
      message,
      template_code,
    }: {
      listingId: string;
      channel: 'whatsapp' | 'sms' | 'internal';
      message: string;
      template_code?: string;
    }) => {
      const response = await apiClient.post(`/moderator/listings/${listingId}/contact`, {
        channel,
        message,
        template_code,
      });
      return response.data;
    },
  });
}

/**
 * Hook pour la liste des signalements
 */
export function useReports(params: {
  type?: string;
  severity?: string;
  status?: string;
  page?: number;
  per_page?: number;
} = {}) {
  return useQuery({
    queryKey: ['moderator', 'reports', params],
    queryFn: async () => {
      const response = await apiClient.get('/moderator/reports', { params });
      return {
        reports: response.data.data as Report[],
        meta: response.data.meta,
        stats: response.data.stats,
      };
    },
  });
}

/**
 * Hook pour traiter un signalement
 */
export function useHandleReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      action,
      note,
    }: {
      reportId: string;
      action: 'dismiss' | 'warn' | 'suspend_listing' | 'suspend_user' | 'escalate';
      note?: string;
    }) => {
      const response = await apiClient.post(`/moderator/reports/${reportId}`, {
        action,
        note,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator', 'reports'] });
      queryClient.invalidateQueries({ queryKey: ['moderator', 'dashboard'] });
    },
  });
}

/**
 * Hook pour la liste des utilisateurs (vue modérateur)
 */
export function useModeratorUsers(params: {
  search?: string;
  flagged?: boolean;
  suspended?: boolean;
  page?: number;
  per_page?: number;
} = {}) {
  return useQuery({
    queryKey: ['moderator', 'users', params],
    queryFn: async () => {
      const response = await apiClient.get('/moderator/users', { params });
      return {
        users: response.data.data as ModeratorUser[],
        meta: response.data.meta,
      };
    },
  });
}

/**
 * Hook pour obtenir les détails d'un utilisateur
 */
export function useModeratorUserDetails(userId: string) {
  return useQuery({
    queryKey: ['moderator', 'user', userId],
    queryFn: async () => {
      const response = await apiClient.get(`/moderator/users/${userId}`);
      return response.data.data;
    },
    enabled: !!userId,
  });
}

/**
 * Hook pour sanctionner un utilisateur
 */
export function useSanctionUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      action,
      reason,
    }: {
      userId: string;
      action: 'warn' | 'flag' | 'suspend_24h' | 'suspend_7d';
      reason: string;
    }) => {
      const response = await apiClient.post(`/moderator/users/${userId}/sanction`, {
        action,
        reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['moderator', 'dashboard'] });
    },
  });
}

/**
 * Hook pour lever une suspension utilisateur
 */
export function useUnsuspendUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      reason,
    }: {
      userId: string;
      reason?: string;
    }) => {
      const response = await apiClient.post(`/moderator/users/${userId}/unsuspend`, {
        reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['moderator', 'dashboard'] });
    },
  });
}

/**
 * Hook pour l'historique de modération
 */
export function useModerationHistory(params: {
  moderator_id?: string;
  my_actions?: boolean;
  action?: string;
  entity_type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
} = {}) {
  return useQuery({
    queryKey: ['moderator', 'history', params],
    queryFn: async () => {
      const response = await apiClient.get('/moderator/history', { params });
      return {
        logs: response.data.data as ModerationLog[],
        meta: response.data.meta,
      };
    },
  });
}

/**
 * Hook pour les templates de messages
 */
export function useMessageTemplates() {
  return useQuery({
    queryKey: ['moderator', 'templates'],
    queryFn: async () => {
      const response = await apiClient.get('/moderator/templates');
      return response.data.data as MessageTemplates;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook pour l'export de données
 */
export function useModeratorExport() {
  return useMutation({
    mutationFn: async ({
      type,
      date_from,
      date_to,
    }: {
      type: 'history' | 'listings' | 'reports';
      date_from?: string;
      date_to?: string;
    }) => {
      const response = await apiClient.get('/moderator/export', {
        params: { type, date_from, date_to },
      });
      return response.data;
    },
  });
}
