import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// T217: useDisputes hook for dispute operations

// Types
export interface Dispute {
  id: string;
  contract_id: string;
  reference_litige: string;
  plaignant_id: string;
  defendeur_id: string;
  motif: string;
  description: string;
  categorie: DisputeCategory;
  statut: DisputeStatus;
  preuves: Proof[];
  mediateur_id: string | null;
  montant_resolution: number | null;
  resolution_notes: string | null;
  mediation_started_at: string | null;
  mediation_ended_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  is_closed: boolean;
  escalated_to_legal: boolean;
  created_at: string;
  updated_at: string;
  plaignant: {
    id: string;
    nom_complet: string;
    badge: string;
  };
  defendeur: {
    id: string;
    nom_complet: string;
    badge: string;
  };
  mediateur?: {
    id: string;
    nom_complet: string;
  } | null;
  contract: {
    id: string;
    reference: string;
    listing: {
      id: string;
      titre: string;
    };
  };
}

export type DisputeCategory =
  | 'IMPAYE'
  | 'DEGATS'
  | 'EXPULSION_ABUSIVE'
  | 'CAUTION_NON_RENDUE'
  | 'NON_CONFORMITE'
  | 'HARCELEMENT'
  | 'AUTRE';

export type DisputeStatus =
  | 'OUVERT'
  | 'EN_MEDIATION'
  | 'EN_ATTENTE_REPONSE'
  | 'RESOLU_AMIABLE'
  | 'RESOLU_JUDICIAIRE'
  | 'FERME'
  | 'ESCALADE';

export interface Proof {
  type: 'photo' | 'document' | 'audio';
  url: string;
  filename: string;
  uploaded_at: string;
}

export interface CreateDisputeData {
  contract_id: string;
  motif: string;
  description: string;
  categorie: DisputeCategory;
  preuves?: File[];
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  content: string;
  attachments: Proof[];
  created_at: string;
  sender: {
    id: string;
    nom_complet: string;
    role: 'plaignant' | 'defendeur' | 'mediateur';
  };
}

// API functions
async function fetchUserDisputes(): Promise<Dispute[]> {
  const response = await apiClient.get('/disputes');
  return response.data.data || [];
}

async function fetchDispute(disputeId: string): Promise<Dispute> {
  const response = await apiClient.get(`/disputes/${disputeId}`);
  return response.data.data;
}

async function fetchDisputeMessages(disputeId: string): Promise<DisputeMessage[]> {
  const response = await apiClient.get(`/disputes/${disputeId}/messages`);
  return response.data.data || [];
}

async function createDispute(data: CreateDisputeData): Promise<Dispute> {
  const formData = new FormData();
  formData.append('contract_id', data.contract_id);
  formData.append('motif', data.motif);
  formData.append('description', data.description);
  formData.append('categorie', data.categorie);

  if (data.preuves) {
    data.preuves.forEach((file) => {
      formData.append('preuves[]', file);
    });
  }

  const response = await apiClient.post('/disputes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
}

async function sendDisputeMessage(
  disputeId: string,
  content: string,
  attachments?: File[]
): Promise<DisputeMessage> {
  const formData = new FormData();
  formData.append('content', content);

  if (attachments) {
    attachments.forEach((file) => {
      formData.append('attachments[]', file);
    });
  }

  const response = await apiClient.post(`/disputes/${disputeId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
}

async function acceptResolution(disputeId: string): Promise<void> {
  await apiClient.post(`/disputes/${disputeId}/accept-resolution`);
}

async function rejectResolution(disputeId: string, reason: string): Promise<void> {
  await apiClient.post(`/disputes/${disputeId}/reject-resolution`, { reason });
}

// Hooks

/**
 * Fetch all disputes for current user
 */
export function useUserDisputes() {
  return useQuery<Dispute[]>({
    queryKey: ['disputes'],
    queryFn: fetchUserDisputes,
  });
}

/**
 * Fetch a specific dispute
 */
export function useDispute(disputeId: string) {
  return useQuery<Dispute>({
    queryKey: ['disputes', disputeId],
    queryFn: () => fetchDispute(disputeId),
    enabled: !!disputeId,
  });
}

/**
 * Fetch messages for a dispute
 */
export function useDisputeMessages(disputeId: string) {
  return useQuery<DisputeMessage[]>({
    queryKey: ['disputes', disputeId, 'messages'],
    queryFn: () => fetchDisputeMessages(disputeId),
    enabled: !!disputeId,
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

/**
 * Create a new dispute
 */
export function useCreateDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDispute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });
}

/**
 * Send a message in a dispute
 */
export function useSendDisputeMessage(disputeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, attachments }: { content: string; attachments?: File[] }) =>
      sendDisputeMessage(disputeId, content, attachments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes', disputeId, 'messages'] });
    },
  });
}

/**
 * Accept a resolution proposal
 */
export function useAcceptResolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptResolution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });
}

/**
 * Reject a resolution proposal
 */
export function useRejectResolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ disputeId, reason }: { disputeId: string; reason: string }) =>
      rejectResolution(disputeId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });
}

// Utility functions

/**
 * Get category label
 */
export function getCategoryLabel(category: DisputeCategory): string {
  const labels: Record<DisputeCategory, string> = {
    IMPAYE: 'Impayé de loyer',
    DEGATS: 'Dégâts matériels',
    EXPULSION_ABUSIVE: 'Expulsion abusive',
    CAUTION_NON_RENDUE: 'Caution non rendue',
    NON_CONFORMITE: 'Non-conformité du bien',
    HARCELEMENT: 'Harcèlement',
    AUTRE: 'Autre',
  };
  return labels[category] || category;
}

/**
 * Get status label
 */
export function getStatusLabel(status: DisputeStatus): string {
  const labels: Record<DisputeStatus, string> = {
    OUVERT: 'Ouvert',
    EN_MEDIATION: 'En médiation',
    EN_ATTENTE_REPONSE: 'En attente de réponse',
    RESOLU_AMIABLE: 'Résolu à l\'amiable',
    RESOLU_JUDICIAIRE: 'Résolu judiciairement',
    FERME: 'Fermé',
    ESCALADE: 'Escaladé',
  };
  return labels[status] || status;
}

/**
 * Get status color
 */
export function getStatusColor(status: DisputeStatus): string {
  const colors: Record<DisputeStatus, string> = {
    OUVERT: 'bg-blue-100 text-blue-700',
    EN_MEDIATION: 'bg-yellow-100 text-yellow-700',
    EN_ATTENTE_REPONSE: 'bg-orange-100 text-orange-700',
    RESOLU_AMIABLE: 'bg-green-100 text-green-700',
    RESOLU_JUDICIAIRE: 'bg-green-100 text-green-700',
    FERME: 'bg-gray-100 text-gray-700',
    ESCALADE: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

/**
 * Check if dispute is active
 */
export function isDisputeActive(status: DisputeStatus): boolean {
  return ['OUVERT', 'EN_MEDIATION', 'EN_ATTENTE_REPONSE'].includes(status);
}

/**
 * Format dispute date
 */
export function formatDisputeDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-GN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
