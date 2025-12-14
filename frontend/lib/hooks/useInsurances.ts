import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// T229: useInsurances hook for insurance operations

// Types
export interface Insurance {
  id: string;
  contract_id: string;
  utilisateur_id: string;
  numero_police: string;
  type_assurance: InsuranceType;
  prime_mensuelle_gnf: number;
  couvertures: Record<string, boolean>;
  plafonds: Record<string, number | string>;
  statut: InsuranceStatus;
  date_souscription: string;
  date_expiration: string;
  certificat_url: string | null;
  created_at: string;
  contract?: {
    id: string;
    reference: string;
    listing: {
      id: string;
      titre: string;
      adresse_complete: string;
    };
  };
}

export type InsuranceType = 'SEJOUR_SEREIN' | 'LOYER_GARANTI';
export type InsuranceStatus = 'ACTIVE' | 'EXPIREE' | 'RESILIEE' | 'EN_ATTENTE';

export interface SubscribeData {
  contrat_id: string;
  type_assurance: InsuranceType;
}

export interface ClaimData {
  type_claim: 'expulsion' | 'caution' | 'juridique' | 'impayes' | 'degats';
  description: string;
  montant_reclame_gnf: number;
  preuves?: File[];
}

export interface ClaimEligibility {
  eligible: boolean;
  reasons: string[];
}

export interface InsuranceOption {
  type: InsuranceType;
  name: string;
  description: string;
  targetUser: 'locataire' | 'bailleur';
  primePercentage: number;
  coverages: {
    name: string;
    description: string;
    icon: string;
  }[];
  benefits: string[];
}

// Insurance options data
export const INSURANCE_OPTIONS: InsuranceOption[] = [
  {
    type: 'SEJOUR_SEREIN',
    name: 'Séjour Serein',
    description: 'Protection pour les locataires contre les expulsions abusives',
    targetUser: 'locataire',
    primePercentage: 2,
    coverages: [
      {
        name: 'Protection expulsion',
        description: 'Couverture jusqu\'à 3 mois de loyer en cas d\'expulsion abusive',
        icon: 'shield',
      },
      {
        name: 'Remboursement caution',
        description: 'Garantie de récupération de votre caution',
        icon: 'wallet',
      },
      {
        name: 'Assistance juridique',
        description: 'Accompagnement juridique illimité',
        icon: 'scale',
      },
    ],
    benefits: [
      'Indemnisation rapide sous 48h',
      'Assistance 24/7',
      'Médiation gratuite incluse',
      'Aucune franchise',
    ],
  },
  {
    type: 'LOYER_GARANTI',
    name: 'Loyer Garanti',
    description: 'Protection pour les propriétaires contre les impayés',
    targetUser: 'bailleur',
    primePercentage: 2,
    coverages: [
      {
        name: 'Garantie impayés',
        description: 'Remboursement jusqu\'à 6 mois de loyers impayés',
        icon: 'banknotes',
      },
      {
        name: 'Dégâts locatifs',
        description: 'Couverture des dommages causés par le locataire',
        icon: 'home',
      },
    ],
    benefits: [
      'Couverture dès le 2ème mois d\'impayé',
      'Remboursement rapide',
      'Prise en charge des frais juridiques',
      'Renouvellement automatique',
    ],
  },
];

// API functions
async function fetchUserInsurances(): Promise<Insurance[]> {
  const response = await apiClient.get('/insurances/me');
  return response.data.data || [];
}

async function fetchInsurance(insuranceId: string): Promise<Insurance> {
  const response = await apiClient.get(`/insurances/${insuranceId}`);
  return response.data.data;
}

async function subscribeToInsurance(data: SubscribeData): Promise<Insurance> {
  const response = await apiClient.post('/insurances/subscribe', data);
  return response.data.data;
}

async function submitClaim(insuranceId: string, data: ClaimData): Promise<void> {
  const formData = new FormData();
  formData.append('type_claim', data.type_claim);
  formData.append('description', data.description);
  formData.append('montant_reclame_gnf', data.montant_reclame_gnf.toString());

  if (data.preuves) {
    data.preuves.forEach((file) => {
      formData.append('preuves[]', file);
    });
  }

  await apiClient.post(`/insurances/${insuranceId}/claim`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

async function checkClaimEligibility(
  insuranceId: string,
  claimType: string
): Promise<ClaimEligibility> {
  const response = await apiClient.post(`/insurances/${insuranceId}/check-eligibility`, {
    type_claim: claimType,
  });
  return response.data;
}

async function cancelInsurance(insuranceId: string): Promise<void> {
  await apiClient.post(`/insurances/${insuranceId}/cancel`);
}

async function downloadCertificate(insuranceId: string): Promise<Blob> {
  const response = await apiClient.get(`/insurances/${insuranceId}/certificate`, {
    responseType: 'blob',
  });
  return response.data;
}

// Hooks

/**
 * Fetch all insurances for current user
 */
export function useUserInsurances() {
  return useQuery<Insurance[]>({
    queryKey: ['insurances'],
    queryFn: fetchUserInsurances,
  });
}

/**
 * Fetch a specific insurance
 */
export function useInsurance(insuranceId: string) {
  return useQuery<Insurance>({
    queryKey: ['insurances', insuranceId],
    queryFn: () => fetchInsurance(insuranceId),
    enabled: !!insuranceId,
  });
}

/**
 * Subscribe to insurance
 */
export function useSubscribeInsurance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: subscribeToInsurance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurances'] });
    },
  });
}

/**
 * Submit insurance claim
 */
export function useSubmitClaim(insuranceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClaimData) => submitClaim(insuranceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurances', insuranceId] });
    },
  });
}

/**
 * Check claim eligibility
 */
export function useCheckClaimEligibility(insuranceId: string) {
  return useMutation({
    mutationFn: (claimType: string) => checkClaimEligibility(insuranceId, claimType),
  });
}

/**
 * Cancel insurance
 */
export function useCancelInsurance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelInsurance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurances'] });
    },
  });
}

/**
 * Download insurance certificate
 */
export function useDownloadCertificate() {
  return useMutation({
    mutationFn: downloadCertificate,
    onSuccess: (blob, insuranceId) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificat_assurance_${insuranceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

// Utility functions

/**
 * Get insurance type label
 */
export function getTypeLabel(type: InsuranceType): string {
  return type === 'SEJOUR_SEREIN' ? 'Séjour Serein' : 'Loyer Garanti';
}

/**
 * Get insurance status label
 */
export function getStatusLabel(status: InsuranceStatus): string {
  const labels: Record<InsuranceStatus, string> = {
    ACTIVE: 'Active',
    EXPIREE: 'Expirée',
    RESILIEE: 'Résiliée',
    EN_ATTENTE: 'En attente',
  };
  return labels[status] || status;
}

/**
 * Get status color
 */
export function getStatusColor(status: InsuranceStatus): string {
  const colors: Record<InsuranceStatus, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    EXPIREE: 'bg-red-100 text-red-700',
    RESILIEE: 'bg-gray-100 text-gray-700',
    EN_ATTENTE: 'bg-yellow-100 text-yellow-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

/**
 * Format money
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('fr-GN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' GNF';
}

/**
 * Calculate premium from monthly rent
 */
export function calculatePremium(monthlyRent: number, percentage: number = 2): number {
  return Math.round(monthlyRent * (percentage / 100));
}

/**
 * Check if insurance is active
 */
export function isInsuranceActive(insurance: Insurance): boolean {
  return (
    insurance.statut === 'ACTIVE' &&
    new Date(insurance.date_expiration) > new Date()
  );
}

/**
 * Get days until expiration
 */
export function getDaysUntilExpiration(expirationDate: string): number {
  const expDate = new Date(expirationDate);
  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
