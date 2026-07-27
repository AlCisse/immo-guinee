import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// T213: useRatings hook for rating operations

// Types
export interface Rating {
  id: string;
  contract_id: string;
  evaluateur_id: string;
  evalue_id: string;
  note: number;
  note_communication: number | null;
  note_ponctualite: number | null;
  note_proprete: number | null;
  note_respect_contrat: number | null;
  commentaire: string;
  reponse: string | null;
  reponse_at: string | null;
  is_published: boolean;
  helpful_count: number;
  created_at: string;
  evaluateur: {
    id: string;
    nom_complet: string;
    badge: string;
  };
  evalue?: {
    id: string;
    nom_complet: string;
    badge: string;
  };
}

export interface RatingStats {
  average: number;
  total: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  criteria: {
    communication: number;
    ponctualite: number;
    proprete: number;
    respect_contrat: number;
  };
}

export interface CreateRatingData {
  contract_id: string;
  note: number;
  note_communication: number;
  note_ponctualite: number;
  note_proprete: number;
  note_respect_contrat: number;
  commentaire: string;
}

export interface ReplyToRatingData {
  reponse: string;
}

// --- Rust API bridge -------------------------------------------------------
// The Rust backend uses the DB-native field names (note_globale, critere_N_note,
// transaction_id). Map them to the frontend Rating shape here so components stay
// unchanged. Reply/helpful are not backed by the current schema → safe defaults.
function mapRustRating(r: any): Rating {
  return {
    id: r.id,
    contract_id: r.transaction_id ?? r.contract_id ?? '',
    evaluateur_id: r.evaluateur_id,
    evalue_id: r.evalue_id,
    note: r.note ?? r.note_globale ?? 0,
    note_communication: r.note_communication ?? r.critere_1_note ?? null,
    note_ponctualite: r.note_ponctualite ?? r.critere_2_note ?? null,
    note_proprete: r.note_proprete ?? r.critere_3_note ?? null,
    note_respect_contrat: r.note_respect_contrat ?? null,
    commentaire: r.commentaire ?? '',
    reponse: r.reponse ?? null,
    reponse_at: r.reponse_at ?? null,
    is_published: r.is_published ?? true,
    helpful_count: r.helpful_count ?? 0,
    created_at: r.created_at ?? r.date_creation,
    evaluateur: r.evaluateur ?? { id: r.evaluateur_id, nom_complet: '', badge: '' },
    evalue: r.evalue,
  };
}

// API functions
async function fetchUserRatings(userId: string): Promise<Rating[]> {
  const response = await apiClient.get(`/users/${userId}/ratings`);
  return (response.data.data || []).map(mapRustRating);
}

async function fetchUserRatingStats(userId: string): Promise<RatingStats> {
  const response = await apiClient.get(`/users/${userId}/ratings/stats`);
  return response.data.data;
}

async function fetchContractRating(contractId: string): Promise<Rating | null> {
  try {
    const response = await apiClient.get(`/contracts/${contractId}/rating`);
    return response.data.data;
  } catch {
    return null;
  }
}

async function createRating(data: CreateRatingData): Promise<Rating> {
  // Frontend has 4 criteria; the Rust schema stores 3 (+ global note). Map the
  // three primary criteria; respect_contrat is folded into the global note.
  const response = await apiClient.post('/ratings', {
    transaction_id: data.contract_id,
    note_globale: data.note,
    critere_1_note: data.note_communication,
    critere_2_note: data.note_ponctualite,
    critere_3_note: data.note_proprete,
    commentaire: data.commentaire,
  });
  return response.data.data;
}

async function replyToRating(ratingId: string, data: ReplyToRatingData): Promise<Rating> {
  const response = await apiClient.post(`/ratings/${ratingId}/reply`, data);
  return response.data.data;
}

async function markRatingHelpful(ratingId: string): Promise<void> {
  await apiClient.post(`/ratings/${ratingId}/helpful`);
}

async function reportRating(ratingId: string, reason: string): Promise<void> {
  await apiClient.post(`/ratings/${ratingId}/report`, { reason });
}

async function fetchPendingRatings(): Promise<Rating[]> {
  const response = await apiClient.get('/ratings/pending');
  return response.data.data || [];
}

// Hooks

/**
 * Fetch ratings received by a user
 */
export function useUserRatings(userId: string) {
  return useQuery<Rating[]>({
    queryKey: ['ratings', 'user', userId],
    queryFn: () => fetchUserRatings(userId),
    enabled: !!userId,
  });
}

/**
 * Fetch rating statistics for a user
 */
export function useUserRatingStats(userId: string) {
  return useQuery<RatingStats>({
    queryKey: ['ratings', 'stats', userId],
    queryFn: () => fetchUserRatingStats(userId),
    enabled: !!userId,
  });
}

/**
 * Fetch rating for a specific contract
 */
export function useContractRating(contractId: string) {
  return useQuery<Rating | null>({
    queryKey: ['ratings', 'contract', contractId],
    queryFn: () => fetchContractRating(contractId),
    enabled: !!contractId,
  });
}

/**
 * Fetch contracts pending rating by current user
 */
export function usePendingRatings() {
  return useQuery<Rating[]>({
    queryKey: ['ratings', 'pending'],
    queryFn: fetchPendingRatings,
  });
}

/**
 * Create a new rating
 */
export function useCreateRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRating,
    onSuccess: (newRating) => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
      queryClient.invalidateQueries({ queryKey: ['contracts', newRating.contract_id] });
    },
  });
}

/**
 * Reply to a rating
 */
export function useReplyToRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ratingId, data }: { ratingId: string; data: ReplyToRatingData }) =>
      replyToRating(ratingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
    },
  });
}

/**
 * Mark a rating as helpful
 */
export function useMarkRatingHelpful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markRatingHelpful,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
    },
  });
}

/**
 * Report a rating
 */
export function useReportRating() {
  return useMutation({
    mutationFn: ({ ratingId, reason }: { ratingId: string; reason: string }) =>
      reportRating(ratingId, reason),
  });
}

// Utility functions

/**
 * Calculate overall rating from criteria
 */
export function calculateOverallRating(criteria: {
  communication: number;
  ponctualite: number;
  proprete: number;
  respect_contrat: number;
}): number {
  const values = Object.values(criteria).filter((v) => v > 0);
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
}

/**
 * Get rating label
 */
export function getRatingLabel(rating: number): string {
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 4.0) return 'Très bien';
  if (rating >= 3.5) return 'Bien';
  if (rating >= 3.0) return 'Correct';
  if (rating >= 2.0) return 'Moyen';
  return 'À améliorer';
}

/**
 * Get rating color
 */
export function getRatingColor(rating: number): string {
  // Charte « Argile de Conakry » quality scale (dark-aware): success → warning → error.
  if (rating >= 4.5) return 'text-success-600 dark:text-success-400';
  if (rating >= 4.0) return 'text-success-500 dark:text-success-400';
  if (rating >= 3.5) return 'text-warning-500 dark:text-warning-400';
  if (rating >= 3.0) return 'text-warning-600 dark:text-warning-400';
  if (rating >= 2.0) return 'text-warning-700 dark:text-warning-500';
  return 'text-error-500 dark:text-error-400';
}

/**
 * Format rating date
 */
export function formatRatingDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-GN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
