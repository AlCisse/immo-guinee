'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import PaymentHistory from '@/components/payments/PaymentHistory';
import InvoiceDetail from '@/components/payments/InvoiceDetail';
import TransparencyWarning from '@/components/payments/TransparencyWarning';

interface Payment {
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

interface PendingInvoice {
  contract_id: string;
  contract_reference: string;
  listing_titre: string;
  total: number;
  total_formatted: string;
  due_date: string;
}

// Fetch user payments
async function fetchMyPayments(page: number = 1, status?: string) {
  const params = new URLSearchParams({ page: page.toString() });
  if (status) params.append('statut', status);
  const response = await apiClient.get(`/payments?${params.toString()}`);
  return response.data.data;
}

// Fetch pending invoices
async function fetchPendingInvoices() {
  const response = await apiClient.get('/payments/pending-invoices');
  return response.data.data.invoices || [];
}

// Status badge
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    en_attente: { label: 'En attente', className: 'bg-warning-100 text-warning-700' },
    en_cours: { label: 'En cours', className: 'bg-secondary-100 text-secondary-700' },
    escrow: { label: 'En escrow', className: 'bg-teal-100 text-teal-700' },
    confirme: { label: 'Confirmé', className: 'bg-success-100 text-success-700' },
    rembourse: { label: 'Remboursé', className: 'bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-400' },
    litige: { label: 'Litige', className: 'bg-error-100 text-error-700' },
    echoue: { label: 'Échoué', className: 'bg-error-100 text-error-700' },
  };

  const { label, className } = config[status] || { label: status, className: 'bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300' };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// Payment method icon
function PaymentMethodIcon({ method }: { method: string }) {
  switch (method) {
    case 'orange_money':
      return (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">OM</span>
          </div>
          <span>Orange Money</span>
        </div>
      );
    case 'mtn_momo':
      return (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-warning-400 flex items-center justify-center">
            <span className="text-black text-xs font-bold">MTN</span>
          </div>
          <span>MTN MoMo</span>
        </div>
      );
    case 'especes':
      return (
        <div className="flex items-center gap-2">
          <svg className="h-6 w-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Espèces</span>
        </div>
      );
    default:
      return <span>{method}</span>;
  }
}

export default function PaymentsContent() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Fetch payments
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['my-payments', currentPage, statusFilter],
    queryFn: () => fetchMyPayments(currentPage, statusFilter),
  });

  // Fetch pending invoices
  const { data: pendingInvoices = [] } = useQuery<PendingInvoice[]>({
    queryKey: ['pending-invoices'],
    queryFn: fetchPendingInvoices,
  });

  const payments: Payment[] = paymentsData?.payments || [];
  const pagination = paymentsData?.pagination;

  // Calculate totals
  const totalPaid = payments
    .filter(p => p.statut_paiement === 'confirme')
    .reduce((sum, p) => sum + p.montant_total, 0);

  const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Mes paiements</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Gérez vos paiements, factures et quittances
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Total payé</p>
              <p className="text-2xl font-bold text-success-600">
                {totalPaid.toLocaleString('fr-GN')} GNF
              </p>
            </div>
            <div className="rounded-full bg-success-100 p-3">
              <svg className="h-6 w-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">En attente</p>
              <p className="text-2xl font-bold text-warning-600">
                {totalPending.toLocaleString('fr-GN')} GNF
              </p>
            </div>
            <div className="rounded-full bg-warning-100 p-3">
              <svg className="h-6 w-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Transactions</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{payments.length}</p>
            </div>
            <div className="rounded-full bg-secondary-100 p-3">
              <svg className="h-6 w-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Transparency warning */}
      <TransparencyWarning />

      {/* Pending invoices */}
      {pendingInvoices.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Factures en attente</h2>
          <div className="space-y-4">
            {pendingInvoices.map((invoice) => (
              <div
                key={invoice.contract_id}
                className="rounded-lg border border-warning-200 bg-warning-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{invoice.listing_titre}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Contrat: {invoice.contract_reference}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-warning-700">{invoice.total_formatted}</p>
                    <Link href={`/paiement/${invoice.contract_id}`}>
                      <Button variant="primary" size="sm">
                        Payer maintenant
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <select
          value={statusFilter || ''}
          onChange={(e) => {
            setStatusFilter(e.target.value || undefined);
            setCurrentPage(1);
          }}
          className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          <option value="confirme">Confirmés</option>
          <option value="escrow">En escrow</option>
          <option value="en_attente">En attente</option>
          <option value="litige">En litige</option>
        </select>

        <Button
          variant="outline"
          onClick={() => {
            // Export to CSV
            const csv = payments.map(p => [
              p.reference_paiement,
              p.contrat.reference,
              p.montant_total,
              p.statut_paiement,
              p.created_at
            ].join(',')).join('\n');
            const blob = new Blob([`Référence,Contrat,Montant,Statut,Date\n${csv}`], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'paiements.csv';
            a.click();
          }}
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter CSV
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {/* Payments list */}
      {!isLoading && payments.length === 0 && (
        <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-neutral-900 dark:text-white">Aucun paiement</h3>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            Vos paiements apparaîtront ici après la signature d&apos;un contrat.
          </p>
        </div>
      )}

      {!isLoading && payments.length > 0 && (
        <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50 dark:bg-dark-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Bien
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Méthode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-card divide-y divide-neutral-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-neutral-50 dark:bg-dark-bg">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-neutral-900 dark:text-white">
                      {payment.reference_paiement}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-900 dark:text-white">{payment.contrat?.listing?.titre}</div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">{payment.contrat?.listing?.quartier}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {payment.montant_total.toLocaleString('fr-GN')} GNF
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                    <PaymentMethodIcon method={payment.methode_paiement} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={payment.statut_paiement} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                    {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Détails
                      </button>
                      {payment.quittance_url && (
                        <a
                          href={payment.quittance_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-success-600 hover:text-success-900"
                        >
                          Quittance
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.last_page > 1 && (
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-dark-border flex items-center justify-between">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Page {pagination.current_page} sur {pagination.last_page}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current_page === 1}
                  onClick={() => setCurrentPage(pagination.current_page - 1)}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() => setCurrentPage(pagination.current_page + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment detail modal */}
      {selectedPayment && (
        <InvoiceDetail
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </div>
  );
}
