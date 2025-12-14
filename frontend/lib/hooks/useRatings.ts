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

// API functions
async function fetchUserRatings(userId: string): Promise<Rating[]> {
  const response = await apiClient.get(`/users/${userId}/ratings`);
  return response.data.data || [];
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
  const response = await apiClient.post('/ratings', data);
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
  if (rating >= 4.5) return 'text-green-600';
  if (rating >= 4.0) return 'text-green-500';
  if (rating >= 3.5) return 'text-yellow-500';
  if (rating >= 3.0) return 'text-yellow-600';
  if (rating >= 2.0) return 'text-orange-500';
  return 'text-red-500';
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
