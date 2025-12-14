'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Eye,
  Filter,
  DollarSign,
  ArrowUpRight,
  X,
  User,
  Calendar,
  Hash,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Wallet,
  Building2,
  Shield,
} from 'lucide-react';
import { ColoredStatsCard } from '@/components/ui/StatsCard';
import apiClient from '@/lib/api/client';
import { getStatusColor, formatMoney, statusLabels } from '@/lib/colors';
import { clsx } from 'clsx';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Payment {
  id: string;
  reference: string;
  reference_paiement?: string;
  montant_total: number;
  montant_loyer?: number;
  montant_caution?: number;
  commission_montant: number;
  commission_pourcentage?: number;
  frais_plateforme?: number;
  montant_verse_beneficiaire?: number;
  montant_rembourse?: number;
  methode_paiement: string;
  type_paiement?: string;
  statut: string;
  created_at: string;
  updated_at?: string;
  escrow_started_at?: string;
  escrow_released_at?: string;
  escrow_duration_days?: number;
  escrow_release_reason?: string;
  jour_caution?: string;
  verified_at?: string;
  mobile_money_reference?: string;
  mobile_money_numero?: string;
  raison_remboursement?: string;
  error_message?: string;
  ip_address?: string;
  contract?: {
    id: string;
    numero_contrat: string;
  };
  payeur?: {
    id: string;
    nom_complet: string;
    telephone: string;
    email?: string;
  };
  beneficiaire?: {
    id: string;
    nom_complet: string;
    telephone: string;
    email?: string;
  };
}

// Component for payment detail row
function DetailRow({ icon: Icon, label, value, className = '' }: { icon: React.ElementType, label: string, value: React.ReactNode, className?: string }) {
  if (!value) return null;
  return (
    <div className={clsx("flex items-start gap-3 py-2", className)}>
      <Icon className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-neutral-500 block">{label}</span>
        <span className="text-sm text-neutral-900 dark:text-white font-medium">{value}</span>
      </div>
    </div>
  );
}

// Payment Details Modal Component
function PaymentDetailsModal({ payment, isOpen, onClose }: { payment: Payment | null, isOpen: boolean, onClose: () => void }) {
  if (!isOpen || !payment) return null;

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'COMPLETE':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'ECHOUE':
        return <XCircle className="w-5 h-5 text-error-500" />;
      case 'REMBOURSE':
        return <AlertCircle className="w-5 h-5 text-warning-500" />;
      case 'EN_ATTENTE':
        return <Clock className="w-5 h-5 text-neutral-500" />;
      case 'ESCROW':
        return <Shield className="w-5 h-5 text-secondary-500" />;
      default:
        return <Clock className="w-5 h-5 text-neutral-500" />;
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const paymentMethodName = (method?: string) => {
    const methods: Record<string, string> = {
      'ORANGE_MONEY': 'Orange Money',
      'MTN_MOMO': 'MTN Mobile Money',
      'VIREMENT': 'Virement bancaire',
      'ESPECES': 'Especes',
    };
    return methods[method || ''] || method || '-';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              className="relative w-full max-w-2xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Details du paiement
                      </h2>
                      <p className="text-sm text-white/80">
                        {payment.reference_paiement || payment.reference || `#${payment.id.slice(0, 8)}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Status Badge */}
                <div className="flex items-center gap-3 mb-6">
                  {getStatusIcon(payment.statut)}
                  <span className={clsx(
                    'px-4 py-1.5 text-sm font-semibold rounded-full',
                    getStatusColor(payment.statut)
                  )}>
                    {statusLabels[payment.statut] || payment.statut}
                  </span>
                  {payment.verified_at && (
                    <span className="px-3 py-1 text-xs bg-success-100 text-success-700 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verifie
                    </span>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-dark-hover dark:to-dark-bg rounded-xl p-4 mb-6">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Resume financier
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-dark-card rounded-lg p-3 shadow-sm">
                      <span className="text-xs text-neutral-500 block">Montant total</span>
                      <span className="text-lg font-bold text-primary-600">{formatMoney(payment.montant_total)}</span>
                    </div>
                    {payment.commission_montant > 0 && (
                      <div className="bg-white dark:bg-dark-card rounded-lg p-3 shadow-sm">
                        <span className="text-xs text-neutral-500 block">Commission ({payment.commission_pourcentage || 0}%)</span>
                        <span className="text-lg font-bold text-success-600">{formatMoney(payment.commission_montant)}</span>
                      </div>
                    )}
                    {payment.montant_loyer && payment.montant_loyer > 0 && (
                      <div className="bg-white dark:bg-dark-card rounded-lg p-3 shadow-sm">
                        <span className="text-xs text-neutral-500 block">Loyer</span>
                        <span className="text-lg font-bold text-secondary-600">{formatMoney(payment.montant_loyer)}</span>
                      </div>
                    )}
                    {payment.montant_caution && payment.montant_caution > 0 && (
                      <div className="bg-white dark:bg-dark-card rounded-lg p-3 shadow-sm">
                        <span className="text-xs text-neutral-500 block">Caution</span>
                        <span className="text-lg font-bold text-warning-600">{formatMoney(payment.montant_caution)}</span>
                      </div>
                    )}
                    {payment.montant_verse_beneficiaire && payment.montant_verse_beneficiaire > 0 && (
                      <div className="bg-white dark:bg-dark-card rounded-lg p-3 shadow-sm">
                        <span className="text-xs text-neutral-500 block">Verse au beneficiaire</span>
                        <span className="text-lg font-bold text-success-600">{formatMoney(payment.montant_verse_beneficiaire)}</span>
                      </div>
                    )}
                    {payment.frais_plateforme && payment.frais_plateforme > 0 && (
                      <div className="bg-white dark:bg-dark-card rounded-lg p-3 shadow-sm">
                        <span className="text-xs text-neutral-500 block">Frais plateforme</span>
                        <span className="text-lg font-bold text-neutral-600">{formatMoney(payment.frais_plateforme)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Two columns layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Parties */}
                  <div>
                    {/* Payeur */}
                    {payment.payeur && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                          <User className="w-4 h-4" /> Payeur
                        </h3>
                        <div className="bg-neutral-50 dark:bg-dark-hover rounded-lg p-3 space-y-1">
                          <div className="font-medium text-neutral-900 dark:text-white">{payment.payeur.nom_complet}</div>
                          <div className="text-sm text-neutral-500 flex items-center gap-2">
                            <Phone className="w-3 h-3" /> {payment.payeur.telephone}
                          </div>
                          {payment.payeur.email && (
                            <div className="text-sm text-neutral-500 flex items-center gap-2">
                              <Mail className="w-3 h-3" /> {payment.payeur.email}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Beneficiaire */}
                    {payment.beneficiaire && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4" /> Beneficiaire
                        </h3>
                        <div className="bg-neutral-50 dark:bg-dark-hover rounded-lg p-3 space-y-1">
                          <div className="font-medium text-neutral-900 dark:text-white">{payment.beneficiaire.nom_complet}</div>
                          <div className="text-sm text-neutral-500 flex items-center gap-2">
                            <Phone className="w-3 h-3" /> {payment.beneficiaire.telephone}
                          </div>
                          {payment.beneficiaire.email && (
                            <div className="text-sm text-neutral-500 flex items-center gap-2">
                              <Mail className="w-3 h-3" /> {payment.beneficiaire.email}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contrat */}
                    {payment.contract && (
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Contrat associe
                        </h3>
                        <div className="bg-neutral-50 dark:bg-dark-hover rounded-lg p-3">
                          <div className="font-medium text-primary-600">{payment.contract.numero_contrat}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Details */}
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                      <Hash className="w-4 h-4" /> Informations
                    </h3>
                    <div className="bg-neutral-50 dark:bg-dark-hover rounded-lg p-3 divide-y divide-neutral-200 dark:divide-dark-border">
                      <DetailRow
                        icon={CreditCard}
                        label="Methode de paiement"
                        value={paymentMethodName(payment.type_paiement || payment.methode_paiement)}
                      />
                      {payment.mobile_money_numero && (
                        <DetailRow
                          icon={Phone}
                          label="Numero Mobile Money"
                          value={payment.mobile_money_numero}
                        />
                      )}
                      {payment.mobile_money_reference && (
                        <DetailRow
                          icon={Hash}
                          label="Reference Mobile Money"
                          value={payment.mobile_money_reference}
                        />
                      )}
                      <DetailRow
                        icon={Calendar}
                        label="Date de creation"
                        value={formatDate(payment.created_at)}
                      />
                      {payment.jour_caution && (
                        <DetailRow
                          icon={Calendar}
                          label="Jour de caution"
                          value={formatDate(payment.jour_caution)}
                        />
                      )}
                      {payment.escrow_started_at && (
                        <DetailRow
                          icon={Shield}
                          label="Debut escrow"
                          value={formatDate(payment.escrow_started_at)}
                        />
                      )}
                      {payment.escrow_released_at && (
                        <DetailRow
                          icon={CheckCircle}
                          label="Liberation escrow"
                          value={formatDate(payment.escrow_released_at)}
                        />
                      )}
                      {payment.escrow_duration_days && (
                        <DetailRow
                          icon={Clock}
                          label="Duree escrow"
                          value={`${payment.escrow_duration_days} jours`}
                        />
                      )}
                      {payment.ip_address && (
                        <DetailRow
                          icon={Hash}
                          label="Adresse IP"
                          value={payment.ip_address}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Error or Refund Info */}
                {(payment.error_message || payment.raison_remboursement) && (
                  <div className="mt-6">
                    {payment.error_message && (
                      <div className="bg-error-50 border border-error-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-error-700 flex items-center gap-2 mb-1">
                          <XCircle className="w-4 h-4" /> Erreur
                        </h4>
                        <p className="text-sm text-error-600">{payment.error_message}</p>
                      </div>
                    )}
                    {payment.raison_remboursement && (
                      <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mt-3">
                        <h4 className="text-sm font-semibold text-warning-700 flex items-center gap-2 mb-1">
                          <AlertCircle className="w-4 h-4" /> Raison du remboursement
                        </h4>
                        <p className="text-sm text-warning-600">{payment.raison_remboursement}</p>
                        {payment.montant_rembourse && (
                          <p className="text-sm text-warning-700 font-medium mt-2">
                            Montant rembourse: {formatMoney(payment.montant_rembourse)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-neutral-200 dark:border-dark-border px-6 py-4 bg-neutral-50 dark:bg-dark-hover">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    ID: {payment.id}
                  </span>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-neutral-200 dark:bg-dark-border text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function PaiementsPage() {
  const [filters, setFilters] = useState<{
    statut?: string;
    page?: number;
  }>({});
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payments', filters],
    queryFn: async () => {
      const response = await apiClient.get('/admin/payments', { params: filters });
      return response.data;
    },
  });

  const payments = data?.data?.data || [];
  const total = data?.data?.total || 0;

  const totals = payments.reduce(
    (acc: { total: number; commission: number }, payment: Payment) => ({
      total: acc.total + (payment.statut === 'COMPLETE' ? (Number(payment.montant_total) || 0) : 0),
      commission: acc.commission + (payment.statut === 'COMPLETE' ? (Number(payment.commission_montant) || 0) : 0),
    }),
    { total: 0, commission: 0 }
  );

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedPayment(null), 300);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-primary-500" />
          Gestion des paiements
        </h1>
        <p className="text-gray-600 dark:text-neutral-400 mt-1">
          Suivez tous les paiements de la plateforme
        </p>
      </div>

      {/* Content */}
      <div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Stats Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ColoredStatsCard
                title="Total transactions"
                value={total}
                change={15}
                color="secondary"
              />
              <ColoredStatsCard
                title="Volume total"
                value={formatMoney(totals.total).replace(' GNF', '')}
                change={22}
                color="success"
              />
              <ColoredStatsCard
                title="Commissions"
                value={formatMoney(totals.commission).replace(' GNF', '')}
                change={18}
                color="purple"
              />
              <ColoredStatsCard
                title="Taux de succes"
                value="94.5%"
                change={2.3}
                color="pink"
              />
            </motion.div>

            {/* Filters */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
            >
              <div className="flex flex-wrap gap-4 items-center">
                <Filter className="w-5 h-5 text-neutral-400" />
                <select
                  value={filters.statut || ''}
                  onChange={(e) => setFilters({ ...filters, statut: e.target.value || undefined, page: 1 })}
                  className="px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous les statuts</option>
                  <option value="EN_ATTENTE">En attente</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="ESCROW">Escrow</option>
                  <option value="COMPLETE">Complete</option>
                  <option value="ECHOUE">Echoue</option>
                  <option value="REMBOURSE">Rembourse</option>
                </select>

                {filters.statut && (
                  <button
                    onClick={() => setFilters({})}
                    className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                  >
                    Reinitialiser
                  </button>
                )}
              </div>
            </motion.div>

            {/* Payments List */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
            >
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50 dark:bg-dark-hover border-b border-neutral-200 dark:border-dark-border">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Reference</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Contrat</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Payeur</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Beneficiaire</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Montant</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Methode</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Statut</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-dark-border">
                        {payments.map((payment: Payment, index: number) => (
                          <motion.tr
                            key={payment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-warning-100 to-warning-200 dark:from-warning-500/20 dark:to-warning-500/10 rounded-xl flex items-center justify-center">
                                  <DollarSign className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                                </div>
                                <div>
                                  <div className="font-medium text-neutral-900 dark:text-white">
                                    {payment.reference_paiement || payment.reference || `#${payment.id.slice(0, 8)}`}
                                  </div>
                                  <div className="text-sm text-neutral-500">
                                    {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                {payment.contract?.numero_contrat || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {payment.payeur ? (
                                <div>
                                  <div className="text-sm text-neutral-900 dark:text-white">{payment.payeur.nom_complet}</div>
                                  <div className="text-sm text-neutral-500">{payment.payeur.telephone}</div>
                                </div>
                              ) : (
                                <span className="text-sm text-neutral-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {payment.beneficiaire ? (
                                <div>
                                  <div className="text-sm text-neutral-900 dark:text-white">{payment.beneficiaire.nom_complet}</div>
                                  <div className="text-sm text-neutral-500">{payment.beneficiaire.telephone}</div>
                                </div>
                              ) : (
                                <span className="text-sm text-neutral-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-neutral-900 dark:text-white">
                                {formatMoney(payment.montant_total)}
                              </div>
                              {payment.commission_montant > 0 && (
                                <div className="text-sm text-neutral-500 flex items-center gap-1">
                                  <ArrowUpRight className="w-3 h-3 text-success-500" />
                                  {formatMoney(payment.commission_montant)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-neutral-700 dark:text-neutral-300 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                                {payment.type_paiement || payment.methode_paiement}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={clsx(
                                'px-3 py-1 text-xs font-medium rounded-full',
                                getStatusColor(payment.statut)
                              )}>
                                {statusLabels[payment.statut] || payment.statut}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleViewPayment(payment)}
                                className="p-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                                title="Voir details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {payments.length === 0 && (
                    <div className="text-center py-12">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                      <p className="text-neutral-500">Aucun paiement trouve</p>
                    </div>
                  )}
                </>
              )}
            </motion.div>

            {/* Pagination */}
            {data?.data?.last_page > 1 && (
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between"
              >
                <p className="text-sm text-neutral-500">
                  Page {data.data.current_page} sur {data.data.last_page}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                    disabled={!data.data.prev_page_url}
                    className="px-4 py-2 text-sm bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Precedent
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                    disabled={!data.data.next_page_url}
                    className="px-4 py-2 text-sm bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        payment={selectedPayment}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
