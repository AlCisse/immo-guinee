'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import apiClient from '@/lib/api/client';
import { getStatusColor } from '@/lib/colors';
import toast from 'react-hot-toast';
import {
  FileCheck,
  Eye,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  Shield,
  Clock,
  X,
  User,
  Calendar,
  FileText,
  Hash,
  AlertTriangle,
  ExternalLink,
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

interface Certification {
  id: string;
  type_document: string;
  numero_document: string;
  date_emission: string;
  date_expiration: string | null;
  statut_verification: string;
  fichier_url: string;
  fichier_size: number;
  fichier_mime_type: string;
  verification_notes: string | null;
  raison_rejet: string | null;
  verified_at: string | null;
  created_at: string;
  user?: {
    id: string;
    nom_complet: string;
    telephone: string;
    email: string;
    type_compte: string;
  };
  verified_by?: {
    id: string;
    nom_complet: string;
  };
}

const documentTypeLabels: Record<string, string> = {
  CNI: 'Carte Nationale d\'Identité',
  TITRE_FONCIER: 'Titre Foncier',
  AUTRES: 'Autre Document',
  PASSEPORT: 'Passeport',
  PERMIS_CONDUIRE: 'Permis de conduire',
  CARTE_CONSULAIRE: 'Carte consulaire',
  TITRE_PROPRIETE: 'Titre de propriété',
  REGISTRE_COMMERCE: 'Registre du commerce',
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function CertificationsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{
    statut_verification?: string;
    page?: number;
  }>({});

  // Modal states
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'certifications', filters],
    queryFn: async () => {
      const response = await apiClient.get('/admin/certifications', { params: filters });
      return response.data;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await apiClient.post(`/admin/certifications/${id}/approve`, { notes });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Certification approuvée avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin', 'certifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sidebar-counts'] });
      setShowDetailModal(false);
      setSelectedCert(null);
      setApproveNotes('');
    },
    onError: () => {
      toast.error('Erreur lors de l\'approbation');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, raison }: { id: string; raison: string }) => {
      const response = await apiClient.post(`/admin/certifications/${id}/reject`, { raison });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Certification rejetée');
      queryClient.invalidateQueries({ queryKey: ['admin', 'certifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sidebar-counts'] });
      setShowRejectModal(false);
      setShowDetailModal(false);
      setSelectedCert(null);
      setRejectReason('');
    },
    onError: () => {
      toast.error('Erreur lors du rejet');
    },
  });

  const handleViewDetails = (cert: Certification) => {
    setSelectedCert(cert);
    setShowDetailModal(true);
  };

  const handleApprove = (cert: Certification) => {
    approveMutation.mutate({ id: cert.id, notes: approveNotes || undefined });
  };

  const handleReject = () => {
    if (!selectedCert || !rejectReason.trim()) {
      toast.error('Veuillez indiquer la raison du rejet');
      return;
    }
    rejectMutation.mutate({ id: selectedCert.id, raison: rejectReason });
  };

  const handleDownload = (cert: Certification) => {
    // Open the file URL in a new tab
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost';
    window.open(`${baseUrl}/storage/${cert.fichier_url}`, '_blank');
  };

  const certifications = Array.isArray(data?.data?.data) ? data.data.data : [];
  const total = data?.data?.total || certifications.length;
  const pendingCount = certifications.filter((c: Certification) => c.statut_verification === 'EN_ATTENTE').length;
  const verifiedCount = certifications.filter((c: Certification) => c.statut_verification === 'VERIFIE').length;
  const rejectedCount = certifications.filter((c: Certification) => c.statut_verification === 'REJETE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FileCheck className="w-7 h-7 text-primary-500" />
          Gestion des certifications
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Vérifiez les documents d&apos;identité des utilisateurs
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
              title="Total certifications"
              value={total}
              change={10}
              color="secondary"
            />
            <ColoredStatsCard
              title="En attente"
              value={pendingCount}
              change={-5}
              color="pink"
            />
            <ColoredStatsCard
              title="Vérifiés"
              value={verifiedCount}
              change={15}
              color="success"
            />
            <ColoredStatsCard
              title="Rejetés"
              value={rejectedCount}
              change={-2}
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
                value={filters.statut_verification || ''}
                onChange={(e) => setFilters({ ...filters, statut_verification: e.target.value || undefined, page: 1 })}
                className="px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
              >
                <option value="">Tous les statuts</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="VERIFIE">Vérifié</option>
                <option value="REJETE">Rejeté</option>
              </select>

              {filters.statut_verification && (
                <button
                  onClick={() => setFilters({})}
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </motion.div>

          {/* Certifications Table */}
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
                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Utilisateur</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Document</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Numéro</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Expiration</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-dark-border">
                      {certifications.map((cert: Certification, index: number) => (
                        <motion.tr
                          key={cert.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
                        >
                          <td className="px-6 py-4">
                            {cert.user ? (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/20 dark:to-primary-500/10 rounded-xl flex items-center justify-center">
                                  <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                </div>
                                <div>
                                  <div className="font-medium text-neutral-900 dark:text-white">{cert.user.nom_complet}</div>
                                  {cert.user.telephone && <div className="text-sm text-neutral-500">{cert.user.telephone}</div>}
                                  {cert.user.email && <div className="text-sm text-neutral-400">{cert.user.email}</div>}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-neutral-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">{documentTypeLabels[cert.type_document] || cert.type_document}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono text-neutral-700 dark:text-neutral-300">{cert.numero_document}</span>
                          </td>
                          <td className="px-6 py-4">
                            {cert.date_expiration ? (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-neutral-400" />
                                <span className={clsx(
                                  'text-sm',
                                  new Date(cert.date_expiration) < new Date() ? 'text-error-600 dark:text-error-400' : 'text-neutral-700 dark:text-neutral-300'
                                )}>
                                  {new Date(cert.date_expiration).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-neutral-400">Permanent</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={clsx('px-3 py-1 text-xs font-medium rounded-full', getStatusColor(cert.statut_verification))}>
                              {cert.statut_verification.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleViewDetails(cert)}
                                className="p-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownload(cert)}
                                className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                                title="Télécharger"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              {cert.statut_verification === 'EN_ATTENTE' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(cert)}
                                    disabled={approveMutation.isPending}
                                    className="p-2 bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 rounded-lg hover:bg-success-100 dark:hover:bg-success-500/20 transition-colors disabled:opacity-50"
                                    title="Approuver"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedCert(cert);
                                      setShowRejectModal(true);
                                    }}
                                    className="p-2 bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 rounded-lg hover:bg-error-100 dark:hover:bg-error-500/20 transition-colors"
                                    title="Rejeter"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {certifications.length === 0 && (
                  <div className="text-center py-12">
                    <FileCheck className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                    <p className="text-neutral-500">Aucune certification trouvée</p>
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

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedCert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-dark-border">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="w-6 h-6 text-primary-500" />
                  Détails de la certification
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className={clsx('px-4 py-2 text-sm font-medium rounded-full', getStatusColor(selectedCert.statut_verification))}>
                    {selectedCert.statut_verification.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-neutral-500">
                    Soumis le {new Date(selectedCert.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                {/* User Info */}
                {selectedCert.user && (
                  <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-blue-900 dark:text-blue-300">Utilisateur</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-neutral-500">Nom:</span> <span className="font-medium text-neutral-900 dark:text-white">{selectedCert.user.nom_complet}</span></p>
                      <p><span className="text-neutral-500">Email:</span> <span className="text-neutral-700 dark:text-neutral-300">{selectedCert.user.email}</span></p>
                      {selectedCert.user.telephone && (
                        <p><span className="text-neutral-500">Téléphone:</span> <span className="text-neutral-700 dark:text-neutral-300">{selectedCert.user.telephone}</span></p>
                      )}
                      <p><span className="text-neutral-500">Type:</span> <span className="text-neutral-700 dark:text-neutral-300">{selectedCert.user.type_compte}</span></p>
                    </div>
                  </div>
                )}

                {/* Document Info */}
                <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    <span className="font-semibold text-neutral-900 dark:text-white">Document</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-500">Type</p>
                      <p className="font-medium text-neutral-900 dark:text-white">{documentTypeLabels[selectedCert.type_document] || selectedCert.type_document}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Numéro</p>
                      <p className="font-mono font-medium text-neutral-900 dark:text-white">{selectedCert.numero_document}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Date d&apos;émission</p>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {selectedCert.date_emission ? new Date(selectedCert.date_emission).toLocaleDateString('fr-FR') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Date d&apos;expiration</p>
                      <p className={clsx(
                        'font-medium',
                        selectedCert.date_expiration && new Date(selectedCert.date_expiration) < new Date()
                          ? 'text-error-600 dark:text-error-400'
                          : 'text-neutral-900 dark:text-white'
                      )}>
                        {selectedCert.date_expiration ? new Date(selectedCert.date_expiration).toLocaleDateString('fr-FR') : 'Permanent'}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Taille du fichier</p>
                      <p className="font-medium text-neutral-900 dark:text-white">{formatFileSize(selectedCert.fichier_size || 0)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Type de fichier</p>
                      <p className="font-medium text-neutral-900 dark:text-white">{selectedCert.fichier_mime_type || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Verification Info */}
                {(selectedCert.verified_at || selectedCert.raison_rejet || selectedCert.verification_notes) && (
                  <div className={clsx(
                    'rounded-xl p-4',
                    selectedCert.statut_verification === 'VERIFIE' ? 'bg-success-50 dark:bg-success-500/10' : 'bg-error-50 dark:bg-error-500/10'
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      {selectedCert.statut_verification === 'VERIFIE' ? (
                        <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-error-600 dark:text-error-400" />
                      )}
                      <span className={clsx(
                        'font-semibold',
                        selectedCert.statut_verification === 'VERIFIE' ? 'text-success-900 dark:text-success-300' : 'text-error-900 dark:text-error-300'
                      )}>
                        {selectedCert.statut_verification === 'VERIFIE' ? 'Vérification' : 'Rejet'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      {selectedCert.verified_at && (
                        <p><span className="text-neutral-500">Date:</span> <span className="text-neutral-700 dark:text-neutral-300">{new Date(selectedCert.verified_at).toLocaleString('fr-FR')}</span></p>
                      )}
                      {selectedCert.verified_by && (
                        <p><span className="text-neutral-500">Par:</span> <span className="text-neutral-700 dark:text-neutral-300">{selectedCert.verified_by.nom_complet}</span></p>
                      )}
                      {selectedCert.verification_notes && (
                        <p><span className="text-neutral-500">Notes:</span> <span className="text-neutral-700 dark:text-neutral-300">{selectedCert.verification_notes}</span></p>
                      )}
                      {selectedCert.raison_rejet && (
                        <p><span className="text-neutral-500">Raison du rejet:</span> <span className="text-error-600 dark:text-error-400">{selectedCert.raison_rejet}</span></p>
                      )}
                    </div>
                  </div>
                )}

                {/* View Document Button */}
                <button
                  onClick={() => handleDownload(selectedCert)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Voir le document
                </button>

                {/* Actions for pending */}
                {selectedCert.statut_verification === 'EN_ATTENTE' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Notes de vérification (optionnel)
                      </label>
                      <textarea
                        value={approveNotes}
                        onChange={(e) => setApproveNotes(e.target.value)}
                        placeholder="Ajouter des notes..."
                        className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(selectedCert)}
                        disabled={approveMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-success-500 text-white rounded-xl hover:bg-success-600 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-5 h-5" />
                        {approveMutation.isPending ? 'Approbation...' : 'Approuver'}
                      </button>
                      <button
                        onClick={() => {
                          setShowRejectModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-error-500 text-white rounded-xl hover:bg-error-600 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                        Rejeter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedCert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-dark-border">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-error-500" />
                  Rejeter la certification
                </h2>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="bg-error-50 dark:bg-error-500/10 rounded-xl p-4">
                  <p className="text-sm text-error-700 dark:text-error-300">
                    Vous êtes sur le point de rejeter la certification de <strong>{selectedCert.user?.nom_complet}</strong> ({documentTypeLabels[selectedCert.type_document] || selectedCert.type_document}).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Raison du rejet <span className="text-error-500">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Expliquez pourquoi ce document est rejeté..."
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-error-500 dark:text-white"
                    rows={4}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={rejectMutation.isPending || !rejectReason.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-error-500 text-white rounded-xl hover:bg-error-600 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" />
                    {rejectMutation.isPending ? 'Rejet...' : 'Confirmer le rejet'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
