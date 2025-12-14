'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Types
export interface Contract {
  id: string;
  reference: string;
  type_contrat: ContractType;
  statut: ContractStatus;
  listing_id: string;
  proprietaire_id: string;
  locataire_id: string;
  loyer_mensuel: number;
  date_debut: string;
  date_fin: string;
  conditions_generales: string[];
  donnees_personnalisees: Record<string, unknown>;
  fichier_pdf_url?: string;
  hash_sha256?: string;
  date_signature_proprietaire?: string;
  date_signature_locataire?: string;
  signature_ip_proprietaire?: string;
  signature_ip_locataire?: string;
  delai_retractation_expire?: string;
  motif_resiliation?: string;
  created_at: string;
  updated_at: string;
  listing?: {
    id: string;
    titre: string;
    adresse: string;
    quartier: string;
    type_bien: string;
    prix: number;
  };
  proprietaire?: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
    email: string;
  };
  locataire?: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
    email: string;
  };
}

export type ContractType =
  | 'BAIL_LOCATION_RESIDENTIEL'
  | 'BAIL_LOCATION_COMMERCIAL'
  | 'PROMESSE_VENTE_TERRAIN'
  | 'MANDAT_GESTION'
  | 'ATTESTATION_CAUTION';

export type ContractStatus =
  | 'BROUILLON'
  | 'EN_ATTENTE_SIGNATURE'
  | 'SIGNE_PARTIELLEMENT'
  | 'SIGNE'
  | 'SIGNE_ARCHIVE'
  | 'RESILIE'
  | 'EXPIRE';

export interface GenerateContractData {
  listing_id: string;
  locataire_id?: string; // Optional: ID of the tenant
  type_contrat: 'location' | 'vente';
  date_debut: string;
  // Options de durée (une seule requise pour location)
  date_fin?: string;
  duree_mois?: number;
  duree_indeterminee?: boolean;
  // Montants
  montant_loyer?: number;
  montant_caution?: number;
  prix_vente?: number;
  clauses_speciales?: string[];
}

export interface SignContractData {
  otp_code: string;
}

// Query keys
const contractKeys = {
  all: ['contracts'] as const,
  lists: () => [...contractKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...contractKeys.lists(), filters] as const,
  details: () => [...contractKeys.all, 'detail'] as const,
  detail: (id: string) => [...contractKeys.details(), id] as const,
  preview: (id: string) => [...contractKeys.all, 'preview', id] as const,
};

// Fetch user contracts
async function fetchContracts(role?: 'proprietaire' | 'locataire'): Promise<Contract[]> {
  const params = role ? { role } : {};
  const response = await apiClient.get('/contracts', { params });
  return response.data.data.contracts;
}

// Fetch single contract
async function fetchContract(id: string): Promise<Contract> {
  const response = await apiClient.get(`/contracts/${id}`);
  return response.data.data.contract;
}

// Generate new contract
async function generateContract(data: GenerateContractData): Promise<Contract> {
  const response = await apiClient.post('/contracts', data);
  return response.data.data?.contract || response.data.data;
}

// Get contract PDF preview URL
async function getContractPreview(id: string): Promise<string> {
  const response = await apiClient.get(`/contracts/${id}/preview`);
  return response.data.data.preview_url;
}

// Sign contract with OTP
async function signContract(id: string, data: SignContractData): Promise<Contract> {
  const response = await apiClient.post(`/contracts/${id}/sign`, data);
  return response.data.data.contract;
}

// Send contract for signature
async function sendContract(id: string): Promise<void> {
  await apiClient.post(`/contracts/${id}/send`);
}

// Cancel contract (during retraction period)
async function cancelContract(id: string, motif: string): Promise<void> {
  await apiClient.post(`/contracts/${id}/cancel`, { motif });
}

// Download contract PDF
async function downloadContract(id: string): Promise<Blob> {
  const response = await apiClient.get(`/contracts/${id}/download`, {
    responseType: 'blob',
  });
  return response.data;
}

// Hooks

/**
 * Fetch all contracts for the authenticated user
 */
export function useContracts(role?: 'proprietaire' | 'locataire') {
  return useQuery({
    queryKey: contractKeys.list({ role }),
    queryFn: () => fetchContracts(role),
  });
}

/**
 * Fetch a single contract by ID
 */
export function useContract(id: string) {
  return useQuery({
    queryKey: contractKeys.detail(id),
    queryFn: () => fetchContract(id),
    enabled: !!id,
  });
}

/**
 * Get contract PDF preview URL
 */
export function useContractPreview(id: string) {
  return useQuery({
    queryKey: contractKeys.preview(id),
    queryFn: () => getContractPreview(id),
    enabled: !!id,
  });
}

/**
 * Generate a new contract
 */
export function useGenerateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

/**
 * Sign a contract with OTP
 */
export function useSignContract(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignContractData) => signContract(contractId, data),
    onSuccess: (contract) => {
      queryClient.setQueryData(contractKeys.detail(contractId), contract);
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

/**
 * Send contract for signature
 */
export function useSendContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendContract,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(id) });
    },
  });
}

/**
 * Cancel a contract
 */
export function useCancelContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) => cancelContract(id, motif),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

/**
 * Download contract PDF
 */
export function useDownloadContract() {
  return useMutation({
    mutationFn: async (id: string) => {
      const blob = await downloadContract(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrat-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}

// Utility functions

/**
 * Get contract type label in French
 */
export function getContractTypeLabel(type: ContractType): string {
  const labels: Record<ContractType, string> = {
    BAIL_LOCATION_RESIDENTIEL: 'Bail de Location Résidentiel',
    BAIL_LOCATION_COMMERCIAL: 'Bail de Location Commercial',
    PROMESSE_VENTE_TERRAIN: 'Promesse de Vente de Terrain',
    MANDAT_GESTION: 'Mandat de Gestion Locative',
    ATTESTATION_CAUTION: 'Attestation de Caution',
  };
  return labels[type] || type;
}

/**
 * Get contract status label in French
 */
export function getContractStatusLabel(status: ContractStatus): string {
  const labels: Record<ContractStatus, string> = {
    BROUILLON: 'Brouillon',
    EN_ATTENTE_SIGNATURE: 'En attente de signature',
    SIGNE_PARTIELLEMENT: 'Partiellement signé',
    SIGNE: 'Signé',
    SIGNE_ARCHIVE: 'Archivé',
    RESILIE: 'Résilié',
    EXPIRE: 'Expiré',
  };
  return labels[status] || status;
}

/**
 * Get status badge color
 */
export function getContractStatusColor(
  status: ContractStatus
): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  const colors: Record<ContractStatus, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
    BROUILLON: 'default',
    EN_ATTENTE_SIGNATURE: 'warning',
    SIGNE_PARTIELLEMENT: 'primary',
    SIGNE: 'success',
    SIGNE_ARCHIVE: 'success',
    RESILIE: 'danger',
    EXPIRE: 'default',
  };
  return colors[status] || 'default';
}

/**
 * Check if contract can be signed
 */
export function canSignContract(contract: Contract, userId: string): boolean {
  if (contract.statut !== 'EN_ATTENTE_SIGNATURE' && contract.statut !== 'SIGNE_PARTIELLEMENT') {
    return false;
  }

  const isProprietaire = contract.proprietaire_id === userId;
  const isLocataire = contract.locataire_id === userId;

  if (isProprietaire && !contract.date_signature_proprietaire) {
    return true;
  }
  if (isLocataire && !contract.date_signature_locataire) {
    return true;
  }

  return false;
}

/**
 * Check if contract is in retraction period
 */
export function isInRetractionPeriod(contract: Contract): boolean {
  if (!contract.delai_retractation_expire) {
    return false;
  }
  return new Date(contract.delai_retractation_expire) > new Date();
}
