import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import apiClient from '@/lib/api/client';

// T250: useAdmin hook for admin operations

// Types
export interface AnalyticsData {
  period_days: number;
  generated_at: string;
  users: {
    total_users: number;
    new_users: number;
    active_users: number;
    verified_users: number;
    users_by_role: Record<string, number>;
  };
  listings: {
    total_listings: number;
    active_listings: number;
    new_listings: number;
    listings_by_type: Record<string, number>;
    listings_by_status: Record<string, number>;
    average_rent: number;
  };
  transactions: {
    total_transactions: number;
    completed_transactions: number;
    transactions_this_period: number;
    total_volume_gnf: number;
    commission_earned_gnf: number;
  };
  contracts: {
    total_contracts: number;
    signed_contracts: number;
    pending_contracts: number;
    contracts_this_period: number;
  };
  quality: {
    average_rating: number;
    total_ratings: number;
    pending_disputes: number;
    resolved_disputes: number;
  };
  trends: {
    users: Record<string, number>;
    listings: Record<string, number>;
    payments: Record<string, number>;
  };
}

export interface ModerationListing {
  id: string;
  titre: string;
  type_bien: string;
  prix_loyer_gnf: number;
  ville: string;
  quartier: string;
  statut: string;
  signalements_count: number;
  created_at: string;
  proprietaire: {
    id: string;
    nom_complet: string;
    email: string;
  };
  photos: { url: string }[];
}

export interface AdminUser {
  id: string;
  nom_complet: string;
  email: string;
  telephone: string;
  role: string;
  badge: string;
  statut_verification: string;
  statut_compte: string;
  listings_count: number;
  contracts_count: number;
  ratings_count: number;
  created_at: string;
  derniere_connexion: string | null;
  roles: { name: string }[];
}

export interface AuditLog {
  id: number;
  log_name: string;
  description: string;
  subject_type: string | null;
  subject_id: string | null;
  causer: {
    id: string;
    name: string;
    email: string;
  } | null;
  properties: Record<string, unknown>;
  created_at: string;
}

export interface ModerationAction {
  action: 'approve' | 'reject' | 'suspend' | 'delete';
  reason?: string;
}

export interface UserUpdateData {
  statut_verification?: string;
  badge?: string;
  is_suspended?: boolean;
  suspension_reason?: string;
  roles?: string[];
}

// API functions
async function fetchAnalytics(period: number = 30): Promise<AnalyticsData> {
  const response = await api.admin.analytics(period);
  return response.data.data;
}

async function fetchModerationQueue(params: {
  status?: string;
  reported?: boolean;
  page?: number;
}): Promise<{ data: ModerationListing[]; meta: { total: number; last_page: number } }> {
  const response = await apiClient.get('/admin/moderation/listings', { params });
  return response.data;
}

async function moderateListing(listingId: string, action: ModerationAction): Promise<void> {
  await apiClient.patch(`/admin/moderation/listings/${listingId}`, action);
}

async function fetchUsers(params: {
  search?: string;
  role?: string;
  verification?: string;
  badge?: string;
  sort?: string;
  direction?: string;
  page?: number;
}): Promise<{ data: AdminUser[]; meta: { total: number; last_page: number } }> {
  const response = await apiClient.get('/admin/users', { params });
  return response.data;
}

async function updateUser(userId: string, data: UserUpdateData): Promise<AdminUser> {
  const response = await apiClient.patch(`/admin/users/${userId}`, data);
  return response.data.data;
}

async function fetchAuditLogs(params: {
  log_name?: string;
  causer_id?: string;
  subject_type?: string;
  from?: string;
  to?: string;
  page?: number;
}): Promise<{ data: AuditLog[]; meta: { total: number; last_page: number } }> {
  const response = await apiClient.get('/admin/logs', { params });
  return response.data;
}

async function exportData(params: {
  type: 'users' | 'listings' | 'transactions' | 'contracts';
  format?: 'csv' | 'json';
  from?: string;
  to?: string;
}): Promise<{ data: unknown[]; meta: { count: number } }> {
  const response = await apiClient.get('/admin/export', { params });
  return response.data;
}

// Hooks

/**
 * Fetch platform analytics
 */
export function useAnalytics(period: number = 30) {
  return useQuery({
    queryKey: ['admin', 'analytics', period],
    queryFn: () => fetchAnalytics(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch moderation queue
 */
export function useModerationQueue(params: {
  status?: string;
  reported?: boolean;
  page?: number;
} = {}) {
  return useQuery({
    queryKey: ['admin', 'moderation', params],
    queryFn: () => fetchModerationQueue(params),
  });
}

/**
 * Moderate a listing
 */
export function useModerate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, action }: { listingId: string; action: ModerationAction }) =>
      moderateListing(listingId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
  });
}

/**
 * Fetch admin users list
 */
export function useAdminUsers(params: {
  search?: string;
  role?: string;
  verification?: string;
  badge?: string;
  sort?: string;
  direction?: string;
  page?: number;
} = {}) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => fetchUsers(params),
  });
}

/**
 * Update user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdateData }) =>
      updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

/**
 * Fetch audit logs
 */
export function useAuditLogs(params: {
  log_name?: string;
  causer_id?: string;
  subject_type?: string;
  from?: string;
  to?: string;
  page?: number;
} = {}) {
  return useQuery({
    queryKey: ['admin', 'logs', params],
    queryFn: () => fetchAuditLogs(params),
  });
}

/**
 * Export data
 */
export function useExportData() {
  return useMutation({
    mutationFn: exportData,
  });
}

// Utility functions

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('fr-GN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' GNF';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PUBLIE: 'bg-green-100 text-green-700',
    DISPONIBLE: 'bg-green-100 text-green-700',
    EN_ATTENTE: 'bg-yellow-100 text-yellow-700',
    SIGNALE: 'bg-red-100 text-red-700',
    SUSPENDU: 'bg-orange-100 text-orange-700',
    REJETE: 'bg-red-100 text-red-700',
    SUPPRIME: 'bg-gray-100 text-gray-700',
    ACTIF: 'bg-green-100 text-green-700',
    BANNI: 'bg-red-100 text-red-700',
    VERIFIE: 'bg-green-100 text-green-700',
    NON_VERIFIE: 'bg-gray-100 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function getBadgeColor(badge: string): string {
  const colors: Record<string, string> = {
    DEBUTANT: 'bg-gray-100 text-gray-700',
    BRONZE: 'bg-amber-100 text-amber-700',
    ARGENT: 'bg-slate-100 text-slate-700',
    OR: 'bg-yellow-100 text-yellow-700',
    PLATINE: 'bg-purple-100 text-purple-700',
    AMBASSADEUR: 'bg-blue-100 text-blue-700',
  };
  return colors[badge] || 'bg-gray-100 text-gray-700';
}
