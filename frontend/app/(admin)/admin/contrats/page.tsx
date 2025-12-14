'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FileText,
  Eye,
  Download,
  Filter,
  Clock,
  CheckCircle,
  Loader2,
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

interface Contract {
  id: string;
  numero_contrat: string;
  type_contrat: string;
  loyer_mensuel: number;
  date_debut: string;
  date_fin: string;
  statut: string;
  created_at: string;
  bailleur?: {
    id: string;
    nom_complet: string;
    telephone: string;
  };
  locataire?: {
    id: string;
    nom_complet: string;
    telephone: string;
  };
  listing?: {
    id: string;
    titre: string;
  };
}

export default function ContratsPage() {
  const [filters, setFilters] = useState<{
    statut?: string;
    page?: number;
  }>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Download contract PDF
  const handleDownload = async (contractId: string, numeroContrat: string) => {
    setDownloadingId(contractId);
    try {
      const response = await apiClient.get(`/contracts/${contractId}/preview`, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrat_${numeroContrat || contractId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Contrat téléchargé avec succès');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur lors du téléchargement du contrat');
    } finally {
      setDownloadingId(null);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'contracts', filters],
    queryFn: async () => {
      const response = await apiClient.get('/admin/contracts', { params: filters });
      return response.data;
    },
  });

  const contracts = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const activeCount = contracts.filter((c: Contract) => c.statut === 'ACTIF').length;
  const pendingCount = contracts.filter((c: Contract) => c.statut.includes('EN_ATTENTE')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="w-7 h-7 text-primary-500" />
          Gestion des contrats
        </h1>
        <p className="text-gray-600 mt-1">
          Gérez tous les contrats de location
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
                title="Total contrats"
                value={total}
                change={10}
                color="secondary"
              />
              <ColoredStatsCard
                title="Contrats actifs"
                value={activeCount}
                change={5}
                color="success"
              />
              <ColoredStatsCard
                title="En attente"
                value={pendingCount}
                change={-2}
                color="pink"
              />
              <ColoredStatsCard
                title="Ce mois"
                value={Math.floor(total * 0.2)}
                change={18}
                color="purple"
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
                  <option value="EN_ATTENTE_BAILLEUR">En attente bailleur</option>
                  <option value="EN_ATTENTE_LOCATAIRE">En attente locataire</option>
                  <option value="ACTIF">Actif</option>
                  <option value="TERMINE">Terminé</option>
                  <option value="RESILIE">Résilié</option>
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

            {/* Contracts List */}
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
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Contrat</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Bien</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Bailleur</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Locataire</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Loyer</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Période</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Statut</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-dark-border">
                        {contracts.map((contract: Contract, index: number) => (
                          <motion.tr
                            key={contract.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-success-100 to-success-200 dark:from-success-500/20 dark:to-success-500/10 rounded-xl flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-success-600 dark:text-success-400" />
                                </div>
                                <div>
                                  <div className="font-medium text-neutral-900 dark:text-white">
                                    {contract.numero_contrat || `#${contract.id.slice(0, 8)}`}
                                  </div>
                                  <div className="text-sm text-neutral-500">{contract.type_contrat}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-neutral-700 dark:text-neutral-300 max-w-xs truncate block">
                                {contract.listing?.titre || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {contract.bailleur ? (
                                <div>
                                  <div className="text-sm text-neutral-900 dark:text-white">{contract.bailleur.nom_complet}</div>
                                  <div className="text-sm text-neutral-500">{contract.bailleur.telephone}</div>
                                </div>
                              ) : (
                                <span className="text-sm text-neutral-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {contract.locataire ? (
                                <div>
                                  <div className="text-sm text-neutral-900 dark:text-white">{contract.locataire.nom_complet}</div>
                                  <div className="text-sm text-neutral-500">{contract.locataire.telephone}</div>
                                </div>
                              ) : (
                                <span className="text-sm text-neutral-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-medium text-neutral-900 dark:text-white">
                                {formatMoney(contract.loyer_mensuel)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1 text-sm text-neutral-700 dark:text-neutral-300">
                                <Clock className="w-4 h-4 text-neutral-400" />
                                {new Date(contract.date_debut).toLocaleDateString('fr-FR')}
                              </div>
                              <div className="text-sm text-neutral-500">
                                au {new Date(contract.date_fin).toLocaleDateString('fr-FR')}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={clsx(
                                'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full',
                                getStatusColor(contract.statut)
                              )}>
                                {contract.statut === 'ACTIF' && <CheckCircle className="w-3.5 h-3.5" />}
                                {statusLabels[contract.statut] || contract.statut.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => window.open(`/contrats/${contract.id}`, '_blank')}
                                  className="p-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                                  title="Voir"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDownload(contract.id, contract.numero_contrat)}
                                  disabled={downloadingId === contract.id}
                                  className="p-2 bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 rounded-lg hover:bg-success-100 dark:hover:bg-success-500/20 transition-colors disabled:opacity-50"
                                  title="Télécharger"
                                >
                                  {downloadingId === contract.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {contracts.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                      <p className="text-neutral-500">Aucun contrat trouvé</p>
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
