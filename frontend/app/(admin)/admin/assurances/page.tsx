'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import apiClient from '@/lib/api/client';
import { getStatusColor, formatMoney } from '@/lib/colors';
import {
  Umbrella,
  Eye,
  Download,
  Filter,
  Shield,
  Clock,
} from 'lucide-react';
import { ColoredStatsCard } from '@/components/ui/StatsCard';

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

interface Insurance {
  id: string;
  numero_police: string;
  type_assurance: string;
  montant_prime: number;
  montant_couverture: number;
  date_debut: string;
  date_fin: string;
  statut: string;
  created_at: string;
  contract?: {
    id: string;
    numero_contrat: string;
  };
  souscripteur?: {
    id: string;
    nom_complet: string;
    telephone: string;
  };
}

export default function AssurancesPage() {
  const [filters, setFilters] = useState<{
    statut?: string;
    page?: number;
  }>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'insurances', filters],
    queryFn: async () => {
      const response = await apiClient.get('/admin/insurances', { params: filters });
      return response.data;
    },
  });

  const insurances = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const activeCount = insurances.filter((i: Insurance) => i.statut === 'ACTIVE').length;

  // Calculate totals
  const totals = insurances.reduce(
    (acc: { prime: number; couverture: number }, ins: Insurance) => ({
      prime: acc.prime + (ins.statut === 'ACTIVE' ? ins.montant_prime : 0),
      couverture: acc.couverture + (ins.statut === 'ACTIVE' ? ins.montant_couverture : 0),
    }),
    { prime: 0, couverture: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Umbrella className="w-7 h-7 text-primary-500" />
          Gestion des assurances
        </h1>
        <p className="text-gray-600 mt-1">
          Gérez les polices d&apos;assurance locative
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
                title="Total polices"
                value={total}
                change={8}
                color="secondary"
              />
              <ColoredStatsCard
                title="Polices actives"
                value={activeCount}
                change={12}
                color="success"
              />
              <ColoredStatsCard
                title="Primes totales"
                value={formatMoney(totals.prime).replace(' GNF', '')}
                change={15}
                color="purple"
              />
              <ColoredStatsCard
                title="Couverture totale"
                value={formatMoney(totals.couverture).replace(' GNF', '')}
                change={10}
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
                  <option value="ACTIVE">Active</option>
                  <option value="EN_ATTENTE">En attente</option>
                  <option value="EXPIREE">Expirée</option>
                  <option value="ANNULEE">Annulée</option>
                  <option value="RECLAMATION_EN_COURS">Réclamation en cours</option>
                </select>

                {filters.statut && (
                  <button
                    onClick={() => setFilters({})}
                    className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </motion.div>

            {/* Insurances Table */}
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
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Police</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Souscripteur</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Contrat</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Prime</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Couverture</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Validité</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Statut</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-dark-border">
                        {insurances.map((insurance: Insurance, index: number) => (
                          <motion.tr
                            key={insurance.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-success-100 to-success-200 dark:from-success-500/20 dark:to-success-500/10 rounded-xl flex items-center justify-center">
                                  <Shield className="w-5 h-5 text-success-600 dark:text-success-400" />
                                </div>
                                <div>
                                  <div className="font-medium text-neutral-900 dark:text-white">{insurance.numero_police}</div>
                                  <div className="text-sm text-neutral-500">{insurance.type_assurance}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {insurance.souscripteur ? (
                                <div>
                                  <div className="text-sm text-neutral-900 dark:text-white">{insurance.souscripteur.nom_complet}</div>
                                  <div className="text-sm text-neutral-500">{insurance.souscripteur.telephone}</div>
                                </div>
                              ) : (
                                <span className="text-sm text-neutral-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {insurance.contract ? (
                                <span className="text-sm text-neutral-700 dark:text-neutral-300">{insurance.contract.numero_contrat}</span>
                              ) : (
                                <span className="text-sm text-neutral-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-neutral-900 dark:text-white">{formatMoney(insurance.montant_prime)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-neutral-900 dark:text-white">{formatMoney(insurance.montant_couverture)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-neutral-400" />
                                <div>
                                  <div className="text-sm text-neutral-700 dark:text-neutral-300">
                                    {new Date(insurance.date_debut).toLocaleDateString('fr-FR')}
                                  </div>
                                  <div className="text-sm text-neutral-500">
                                    au {new Date(insurance.date_fin).toLocaleDateString('fr-FR')}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={clsx('px-3 py-1 text-xs font-medium rounded-full', getStatusColor(insurance.statut))}>
                                {insurance.statut.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  className="p-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                                  title="Voir détails"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-2 bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 rounded-lg hover:bg-success-100 dark:hover:bg-success-500/20 transition-colors"
                                  title="Télécharger attestation"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {insurances.length === 0 && (
                    <div className="text-center py-12">
                      <Umbrella className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                      <p className="text-neutral-500">Aucune assurance trouvée</p>
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
                    Précédent
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
    </div>
  );
}
