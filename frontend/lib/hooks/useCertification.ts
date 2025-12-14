import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Types
export type Badge = 'BRONZE' | 'ARGENT' | 'OR' | 'DIAMANT';

export type VerificationStatus = 'NON_VERIFIE' | 'CNI_VERIFIEE' | 'TITRE_FONCIER_VERIFIE';

export type DocumentType = 'CNI' | 'TITRE_FONCIER';

export type DocumentVerificationStatus = 'EN_ATTENTE' | 'APPROUVE' | 'REJETE';

export interface CertificationDocument {
  id: string;
  type_document: DocumentType;
  fichier_url: string;
  statut_verification: DocumentVerificationStatus;
  commentaire_verification: string | null;
  date_verification: string | null;
  created_at: string;
}

export interface CertificationRequirement {
  type: string;
  current: number | string;
  required: number | string;
}

export interface CertificationStats {
  nombre_transactions: number;
  note_moyenne: number;
  nombre_litiges: number;
  statut_verification: VerificationStatus;
}

export interface CertificationData {
  current_badge: Badge;
  next_badge: Badge | null;
  progress: number;
  requirements_met: string[];
  requirements_missing: CertificationRequirement[];
  stats: CertificationStats;
  documents: CertificationDocument[];
}

export interface UploadDocumentData {
  file: File;
  type: DocumentType;
}

export interface VerifyDocumentData {
  approved: boolean;
  comment?: string;
}

// Badge information
export const BADGE_INFO: Record<Badge, {
  label: string;
  color: string;
  discount: number;
  minTransactions: number;
  minRating: number;
  verification: VerificationStatus;
}> = {
  BRONZE: {
    label: 'Bronze',
    color: '#CD7F32',
    discount: 0,
    minTransactions: 0,
    minRating: 0,
    verification: 'NON_VERIFIE',
  },
  ARGENT: {
    label: 'Argent',
    color: '#C0C0C0',
    discount: 5,
    minTransactions: 1,
    minRating: 3.5,
    verification: 'CNI_VERIFIEE',
  },
  OR: {
    label: 'Or',
    color: '#FFD700',
    discount: 10,
    minTransactions: 5,
    minRating: 4.0,
    verification: 'CNI_VERIFIEE',
  },
  DIAMANT: {
    label: 'Diamant',
    color: '#B9F2FF',
    discount: 15,
    minTransactions: 20,
    minRating: 4.5,
    verification: 'TITRE_FONCIER_VERIFIE',
  },
};

// API functions
async function fetchCertification(): Promise<CertificationData> {
  const response = await apiClient.get('/certifications/me');
  return response.data.data;
}

async function fetchUserCertification(userId: string): Promise<{ badge: Badge; verified: boolean }> {
  const response = await apiClient.get(`/certifications/user/${userId}`);
  return response.data.data;
}

async function uploadDocument(data: UploadDocumentData): Promise<CertificationDocument> {
  const formData = new FormData();
  formData.append('fichier', data.file);
  formData.append('type_document', data.type);

  const response = await apiClient.post('/certifications/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
}

async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/certifications/${id}`);
}

async function verifyDocument(id: string, data: VerifyDocumentData): Promise<CertificationDocument> {
  const response = await apiClient.post(`/certifications/${id}/verify`, data);
  return response.data.data;
}

async function fetchPendingVerifications(): Promise<CertificationDocument[]> {
  const response = await apiClient.get('/certifications/pending');
  return response.data.data.documents;
}

// Hooks

/**
 * Fetch current user's certification data
 */
export function useCertification() {
  return useQuery({
    queryKey: ['certification'],
    queryFn: fetchCertification,
  });
}

/**
 * Fetch a specific user's certification badge (for display on listings/profile)
 */
export function useUserBadge(userId: string) {
  return useQuery({
    queryKey: ['user-badge', userId],
    queryFn: () => fetchUserCertification(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Upload a certification document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certification'] });
    },
  });
}

/**
 * Delete a certification document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certification'] });
    },
  });
}

/**
 * Verify a document (admin only)
 */
export function useVerifyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VerifyDocumentData }) =>
      verifyDocument(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certification'] });
      queryClient.invalidateQueries({ queryKey: ['pending-verifications'] });
    },
  });
}

/**
 * Fetch pending document verifications (admin)
 */
export function usePendingVerifications() {
  return useQuery({
    queryKey: ['pending-verifications'],
    queryFn: fetchPendingVerifications,
  });
}

// Utility functions

/**
 * Get badge label in French
 */
export function getBadgeLabel(badge: Badge): string {
  return BADGE_INFO[badge]?.label || badge;
}

/**
 * Get badge discount percentage
 */
export function getBadgeDiscount(badge: Badge): number {
  return BADGE_INFO[badge]?.discount || 0;
}

/**
 * Calculate commission with badge discount applied
 */
export function calculateDiscountedCommission(baseCommission: number, badge: Badge): number {
  const discount = getBadgeDiscount(badge);
  return baseCommission * (1 - discount / 100);
}

/**
 * Get verification status label in French
 */
export function getVerificationStatusLabel(status: VerificationStatus): string {
  const labels: Record<VerificationStatus, string> = {
    NON_VERIFIE: 'Non vérifié',
    CNI_VERIFIEE: 'CNI vérifiée',
    TITRE_FONCIER_VERIFIE: 'Titre foncier vérifié',
  };
  return labels[status] || status;
}

/**
 * Get document type label in French
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    CNI: "Carte d'identité nationale",
    TITRE_FONCIER: 'Titre foncier',
  };
  return labels[type] || type;
}

/**
 * Get document verification status label in French
 */
export function getDocumentStatusLabel(status: DocumentVerificationStatus): string {
  const labels: Record<DocumentVerificationStatus, string> = {
    EN_ATTENTE: 'En attente de vérification',
    APPROUVE: 'Approuvé',
    REJETE: 'Rejeté',
  };
  return labels[status] || status;
}

/**
 * Compare badges (returns -1, 0, or 1)
 */
export function compareBadges(badge1: Badge, badge2: Badge): number {
  const order: Badge[] = ['BRONZE', 'ARGENT', 'OR', 'DIAMANT'];
  const index1 = order.indexOf(badge1);
  const index2 = order.indexOf(badge2);
  return index1 - index2;
}

/**
 * Check if badge1 is higher than badge2
 */
export function isBadgeHigher(badge1: Badge, badge2: Badge): boolean {
  return compareBadges(badge1, badge2) > 0;
}

/**
 * Get next badge in progression
 */
export function getNextBadge(currentBadge: Badge): Badge | null {
  const order: Badge[] = ['BRONZE', 'ARGENT', 'OR', 'DIAMANT'];
  const currentIndex = order.indexOf(currentBadge);
  if (currentIndex === -1 || currentIndex >= order.length - 1) {
    return null;
  }
  return order[currentIndex + 1];
}
