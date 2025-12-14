'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { InvoiceDetail } from '@/components/payments';
import {
  useMyPayments,
  Payment,
  formatPaymentAmount,
  getPaymentStatusLabel,
  getPaymentMethodLabel,
} from '@/lib/hooks/usePayments';

interface PaymentHistoryProps {
  initialStatus?: string;
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | '3months' | 'year';

export default function PaymentHistory({ initialStatus }: PaymentHistoryProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(initialStatus || '');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error } = useMyPayments(page, statusFilter);

  const STATUS_OPTIONS = [
    { value: '', label: 'Tous les statuts' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'escrow', label: 'En séquestre' },
    { value: 'confirme', label: 'Confirmé' },
    { value: 'rembourse', label: 'Remboursé' },
    { value: 'litige', label: 'En litige' },
    { value: 'echoue', label: 'Échoué' },
  ];

  const METHOD_OPTIONS = [
    { value: '', label: 'Toutes les méthodes' },
    { value: 'orange_money', label: 'Orange Money' },
    { value: 'mtn_momo', label: 'MTN MoMo' },
    { value: 'especes', label: 'Espèces' },
    { value: 'virement', label: 'Virement' },
  ];

  const DATE_OPTIONS = [
    { value: 'all', label: 'Toutes les dates' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: '3months', label: '3 derniers mois' },
    { value: 'year', label: 'Cette année' },
  ];

  // Filter and sort payments
  const filteredPayments = useMemo(() => {
    if (!data?.payments) return [];

    let filtered = [...data.payments];

    // Method filter
    if (methodFilter) {
      filtered = filtered.filter((p: Payment) => p.methode_paiement === methodFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case '3months':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((p: Payment) => new Date(p.created_at) >= startDate);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p: Payment) =>
          p.reference_paiement.toLowerCase().includes(query) ||
          p.contrat?.reference?.toLowerCase().includes(query) ||
          p.contrat?.listing?.titre?.toLowerCase().includes(query) ||
          p.beneficiaire?.nom_complet?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a: Payment, b: Payment) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'amount') {
        comparison = a.montant_total - b.montant_total;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [data?.payments, methodFilter, dateFilter, searchQuery, sortField, sortOrder]);

  // Calculate totals for filtered data
  const totals = useMemo(() => {
    return filteredPayments.reduce(
      (acc: { total: number; loyer: number; caution: number; commission: number }, p: Payment) => ({
        total: acc.total + p.montant_total,
        loyer: acc.loyer + p.montant_loyer,
        caution: acc.caution + p.montant_caution,
        commission: acc.commission + p.montant_frais_service,
      }),
      { total: 0, loyer: 0, caution: 0, commission: 0 }
    );
  }, [filteredPayments]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Référence',
      'Date',
      'Contrat',
      'Bien',
      'Bénéficiaire',
      'Loyer',
      'Caution',
      'Commission',
      'Total',
      'Méthode',
      'Statut',
    ];

    const rows = filteredPayments.map((p: Payment) => [
      p.reference_paiement,
      new Date(p.created_at).toLocaleDateString('fr-FR'),
      p.contrat?.reference || '',
      p.contrat?.listing?.titre || '',
      p.beneficiaire?.nom_complet || '',
      p.montant_loyer,
      p.montant_caution,
      p.montant_frais_service,
      p.montant_total,
      getPaymentMethodLabel(p.methode_paiement),
      getPaymentStatusLabel(p.statut_paiement),
    ]);

    // Add totals row
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      totals.loyer,
      totals.caution,
      totals.commission,
      totals.total,
      '',
      '',
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      en_attente: 'bg-yellow-100 text-yellow-700',
      en_cours: 'bg-blue-100 text-blue-700',
      escrow: 'bg-purple-100 text-purple-700',
      confirme: 'bg-green-100 text-green-700',
      rembourse: 'bg-gray-100 text-gray-700',
      litige: 'bg-red-100 text-red-700',
      echoue: 'bg-red-100 text-red-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  };

  const handleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setMethodFilter('');
    setDateFilter('all');
    setSearchQuery('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter || methodFilter || dateFilter !== 'all' || searchQuery;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Erreur de chargement</h3>
          <p className="mt-2 text-sm text-gray-500">
            Impossible de charger l&apos;historique des paiements
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Historique des paiements</h2>
          <Button variant="outline" onClick={handleExportCSV} disabled={filteredPayments.length === 0}>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label htmlFor="search" className="sr-only">Rechercher</label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par référence, bien, bénéficiaire..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label htmlFor="status-filter" className="sr-only">Statut</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Method filter */}
          <div>
            <label htmlFor="method-filter" className="sr-only">Méthode</label>
            <select
              id="method-filter"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date filter */}
          <div>
            <label htmlFor="date-filter" className="sr-only">Période</label>
            <select
              id="date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {DATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {filteredPayments.length} résultat{filteredPayments.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Effacer les filtres
            </button>
          </div>
        )}
      </div>

      {/* Summary row */}
      {filteredPayments.length > 0 && (
        <div className="px-6 py-3 bg-primary-50 border-b border-primary-100">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Total:</span>{' '}
              <span className="font-semibold text-primary-700">{formatPaymentAmount(totals.total)}</span>
            </div>
            <div>
              <span className="text-gray-500">Loyers:</span>{' '}
              <span className="font-medium text-gray-700">{formatPaymentAmount(totals.loyer)}</span>
            </div>
            <div>
              <span className="text-gray-500">Cautions:</span>{' '}
              <span className="font-medium text-gray-700">{formatPaymentAmount(totals.caution)}</span>
            </div>
            <div>
              <span className="text-gray-500">Commissions:</span>{' '}
              <span className="font-medium text-gray-700">{formatPaymentAmount(totals.commission)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-sm font-medium text-gray-500">
              <th className="px-6 py-3">Référence</th>
              <th className="px-6 py-3">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center hover:text-gray-700"
                >
                  Date
                  {sortField === 'date' && (
                    <svg className={`ml-1 h-4 w-4 ${sortOrder === 'desc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </th>
              <th className="px-6 py-3">Bien</th>
              <th className="px-6 py-3">
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center hover:text-gray-700"
                >
                  Montant
                  {sortField === 'amount' && (
                    <svg className={`ml-1 h-4 w-4 ${sortOrder === 'desc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </th>
              <th className="px-6 py-3">Méthode</th>
              <th className="px-6 py-3">Statut</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">Aucun paiement trouvé</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {hasActiveFilters
                      ? 'Essayez de modifier vos filtres'
                      : "Vous n'avez pas encore effectué de paiement"}
                  </p>
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment: Payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{payment.reference_paiement}</p>
                      <p className="text-xs text-gray-500">{payment.contrat?.reference}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">
                      {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(payment.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 truncate max-w-[200px]">
                      {payment.contrat?.listing?.titre}
                    </p>
                    <p className="text-xs text-gray-500">
                      {payment.contrat?.listing?.quartier}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatPaymentAmount(payment.montant_total)}
                    </p>
                    {payment.montant_frais_service > 0 && (
                      <p className="text-xs text-gray-500">
                        dont {formatPaymentAmount(payment.montant_frais_service)} comm.
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">
                      {getPaymentMethodLabel(payment.methode_paiement)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                        payment.statut_paiement
                      )}`}
                    >
                      {getPaymentStatusLabel(payment.statut_paiement)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedPayment(payment)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Détails
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.total_pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} sur {data.pagination.total_pages} ({data.pagination.total} résultats)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === data.pagination.total_pages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedPayment && (
        <InvoiceDetail
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </div>
  );
}
