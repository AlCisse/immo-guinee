import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Types
export interface Payment {
  id: string;
  reference_paiement: string;
  montant_loyer: number;
  montant_caution: number;
  montant_frais_service: number;
  montant_total: number;
  methode_paiement: string;
  statut_paiement: string;
  quittance_url: string | null;
  created_at: string;
  date_validation_proprietaire: string | null;
  contrat: {
    id: string;
    reference: string;
    listing: {
      titre: string;
      quartier: string;
    };
  };
  beneficiaire: {
    nom_complet: string;
  };
}

export interface PaymentInvoice {
  contract_reference: string;
  contract_type: string;
  sections: Array<{
    label: string;
    amount: number;
    formatted: string;
    description?: string;
    non_refundable?: boolean;
  }>;
  total: {
    amount: number;
    formatted: string;
  };
  pour_proprietaire: {
    amount: number;
    formatted: string;
  };
  pour_plateforme: {
    amount: number;
    formatted: string;
  };
}

export interface InitiatePaymentData {
  contract_id: string;
}

export interface ProcessPaymentData {
  contract_id: string;
  methode_paiement: 'orange_money' | 'mtn_momo' | 'especes';
  numero_telephone?: string;
}

export interface ValidatePaymentData {
  validated: boolean;
  note?: string;
}

export interface CashPaymentData {
  contract_id: string;
  amount_received: number;
  received_by: 'proprietaire' | 'plateforme';
  notes?: string;
}

// API functions
async function fetchMyPayments(page: number = 1, status?: string) {
  const params = new URLSearchParams({ page: page.toString() });
  if (status) params.append('statut', status);
  const response = await apiClient.get(`/payments?${params.toString()}`);
  return response.data.data;
}

async function fetchPayment(id: string) {
  const response = await apiClient.get(`/payments/${id}`);
  return response.data.data.payment;
}

async function initiatePayment(data: InitiatePaymentData) {
  const response = await apiClient.post('/payments/initiate', data);
  return response.data.data;
}

async function processPayment(data: ProcessPaymentData) {
  const response = await apiClient.post('/payments', data);
  return response.data.data.payment;
}

async function validatePayment(id: string, data: ValidatePaymentData) {
  const response = await apiClient.post(`/payments/${id}/validate`, data);
  return response.data.data.payment;
}

async function checkPaymentStatus(id: string) {
  const response = await apiClient.get(`/payments/${id}/status`);
  return response.data.data;
}

async function recordCashPayment(data: CashPaymentData) {
  const response = await apiClient.post('/payments/cash', data);
  return response.data.data;
}

async function requestRefund(id: string, reason: string) {
  const response = await apiClient.post(`/payments/${id}/refund`, { reason });
  return response.data.data;
}

// Hooks
export function useMyPayments(page: number = 1, status?: string) {
  return useQuery({
    queryKey: ['my-payments', page, status],
    queryFn: () => fetchMyPayments(page, status),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: () => fetchPayment(id),
    enabled: !!id,
  });
}

export function usePaymentStatus(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['payment-status', id],
    queryFn: () => checkPaymentStatus(id),
    enabled: enabled && !!id,
    refetchInterval: 5000, // Poll every 5 seconds while payment is pending
  });
}

export function useInitiatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: initiatePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
    },
  });
}

export function useProcessPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: processPayment,
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
      queryClient.setQueryData(['payment', payment.id], payment);
    },
  });
}

export function useValidatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ValidatePaymentData }) =>
      validatePayment(id, data),
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
      queryClient.setQueryData(['payment', payment.id], payment);
    },
  });
}

export function useRecordCashPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordCashPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invoices'] });
    },
  });
}

export function useRequestRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      requestRefund(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
    },
  });
}

// Utility functions
export function formatPaymentAmount(amount: number): string {
  return amount.toLocaleString('fr-GN') + ' GNF';
}

export function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    en_cours: 'En cours',
    escrow: 'En séquestre',
    confirme: 'Confirmé',
    rembourse: 'Remboursé',
    litige: 'En litige',
    echoue: 'Échoué',
  };
  return labels[status] || status;
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    orange_money: 'Orange Money',
    mtn_momo: 'MTN Mobile Money',
    especes: 'Espèces',
    virement: 'Virement bancaire',
  };
  return labels[method] || method;
}

export function isPaymentPending(status: string): boolean {
  return ['en_attente', 'en_cours'].includes(status);
}

export function canValidatePayment(payment: Payment, userId: string): boolean {
  return (
    payment.statut_paiement === 'escrow' &&
    payment.beneficiaire?.nom_complet !== undefined
  );
}
