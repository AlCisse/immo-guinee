'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import apiClient from '@/lib/api/client';
import { getStatusColor } from '@/lib/colors';
import {
  Scale,
  Eye,
  UserPlus,
  CheckCircle,
  Filter,
  AlertTriangle,
  Clock,
  X,
  User,
  FileText,
  Calendar,
  Phone,
  Mail,
  Loader2,
  Home,
} from 'lucide-react';
import { ColoredStatsCard } from '@/components/ui/StatsCard';
import { toast } from 'react-hot-toast';

interface Dispute {
  id: string;
  reference_litige?: string;
  motif: string;
  description: string;
  statut: string;
  categorie?: string;
  preuves?: string[];
  date_ouverture: string;
  date_resolution?: string;
  mediation_started_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  montant_resolution?: number;
  demandeur?: {
    id: string;
    nom_complet: string;
    telephone: string;
    email?: string;
  };
  defendeur?: {
    id: string;
    nom_complet: string;
    telephone: string;
    email?: string;
  };
  mediateur?: {
    id: string;
    nom_complet: string;
    email?: string;
  };
  contract?: {
    id: string;
    reference?: string;
    listing?: {
      id: string;
      titre: string;
    };
  };
}

interface Mediator {
  id: string;
  nom_complet: string;
  email: string;
  telephone: string;
}

export default function LitigesPage() {
  const [filters, setFilters] = useState<{ statut?: string; page?: number }>({});
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedMediatorId, setSelectedMediatorId] = useState<string>('');
  const [resolveForm, setResolveForm] = useState({
    statut: 'RESOLU_AMIABLE',
    resolution_notes: '',
    montant_resolution: '',
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'disputes', filters],
    queryFn: async () => {
      const response = await apiClient.get('/admin/disputes', { params: filters });
      return response.data;
    },
  });

  // Fetch dispute details
  const { data: disputeDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['admin', 'dispute', selectedDispute?.id],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/disputes/${selectedDispute?.id}`);
      return response.data;
    },
    enabled: !!selectedDispute?.id,
  });

  // Fetch mediators
  const { data: mediatorsData } = useQuery({
    queryKey: ['admin', 'mediators'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/mediators');
      return response.data;
    },
    enabled: showAssignModal,
  });

  // Assign mediator mutation
  const assignMutation = useMutation({
    mutationFn: async ({ disputeId, mediateurId }: { disputeId: string; mediateurId: string }) => {
      const response = await apiClient.post(`/admin/disputes/${disputeId}/assign`, {
        mediateur_id: mediateurId,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Médiateur assigné avec succès');
      setShowAssignModal(false);
      setSelectedMediatorId('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispute', selectedDispute?.id] });
    },
    onError: () => {
      toast.error("Erreur lors de l'assignation");
    },
  });

  // Resolve dispute mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ disputeId, data }: { disputeId: string; data: typeof resolveForm }) => {
      const response = await apiClient.post(`/admin/disputes/${disputeId}/resolve`, {
        statut: data.statut,
        resolution_notes: data.resolution_notes || null,
        montant_resolution: data.montant_resolution ? parseFloat(data.montant_resolution) : null,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Litige résolu avec succès');
      setShowResolveModal(false);
      setSelectedDispute(null);
      setResolveForm({ statut: 'RESOLU_AMIABLE', resolution_notes: '', montant_resolution: '' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
    },
    onError: () => {
      toast.error('Erreur lors de la résolution');
    },
  });

  const disputes = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const openCount = disputes.filter((d: Dispute) => d.statut === 'OUVERT').length;
  const inProgressCount = disputes.filter((d: Dispute) => d.statut === 'EN_MEDIATION').length;
  const resolvedCount = disputes.filter((d: Dispute) => d.statut?.startsWith('RESOLU')).length;
  const mediators: Mediator[] = mediatorsData?.data || [];
  const detail: Dispute | null = disputeDetails?.data || null;

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, string> = {
      OUVERT: 'Ouvert',
      EN_COURS: 'En cours',
      EN_MEDIATION: 'En médiation',
      RESOLU_AMIABLE: 'Résolu à l\'amiable',
      RESOLU_JUDICIAIRE: 'Résolu judiciaire',
      FERME: 'Fermé',
    };
    return labels[statut] || statut;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Scale className="w-7 h-7 text-primary-500" />
          Gestion des litiges
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Gérez et résolvez les litiges entre utilisateurs
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ColoredStatsCard title="Total litiges" value={total} change={0} color="secondary" />
        <ColoredStatsCard title="Litiges ouverts" value={openCount} change={0} color="pink" />
        <ColoredStatsCard title="En médiation" value={inProgressCount} change={0} color="purple" />
        <ColoredStatsCard title="Résolus" value={resolvedCount} change={0} color="success" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft">
        <div className="flex flex-wrap gap-4 items-center">
          <Filter className="w-5 h-5 text-neutral-400" />
          <select
            value={filters.statut || ''}
            onChange={(e) => setFilters({ ...filters, statut: e.target.value || undefined, page: 1 })}
            className="px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tous les statuts</option>
            <option value="OUVERT">Ouvert</option>
            <option value="EN_MEDIATION">En médiation</option>
            <option value="RESOLU_AMIABLE">Résolu à l&apos;amiable</option>
            <option value="RESOLU_JUDICIAIRE">Résolu judiciaire</option>
            <option value="FERME">Fermé</option>
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
      </div>

      {/* Disputes Table */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-dark-hover border-b border-neutral-200 dark:border-dark-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Litige</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Demandeur</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Défendeur</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Médiateur</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-dark-border">
                  {disputes.map((dispute: Dispute) => (
                    <tr key={dispute.id} className="hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-error-100 to-error-200 dark:from-error-500/20 dark:to-error-500/10 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-error-600 dark:text-error-400" />
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-white">{dispute.motif}</div>
                            <div className="text-sm text-neutral-500 max-w-xs truncate">{dispute.description}</div>
                            <div className="flex items-center gap-1 text-xs text-neutral-400 mt-1">
                              <Clock className="w-3 h-3" />
                              Ouvert le {new Date(dispute.date_ouverture).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {dispute.demandeur ? (
                          <div>
                            <div className="text-sm text-neutral-900 dark:text-white">{dispute.demandeur.nom_complet}</div>
                            <div className="text-sm text-neutral-500">{dispute.demandeur.telephone}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {dispute.defendeur ? (
                          <div>
                            <div className="text-sm text-neutral-900 dark:text-white">{dispute.defendeur.nom_complet}</div>
                            <div className="text-sm text-neutral-500">{dispute.defendeur.telephone}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {dispute.mediateur ? (
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">{dispute.mediateur.nom_complet}</span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-warning-100 dark:bg-warning-500/10 text-warning-700 dark:text-warning-400 rounded-full">
                            Non assigné
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx('px-3 py-1 text-xs font-medium rounded-full', getStatusColor(dispute.statut))}>
                          {getStatutLabel(dispute.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedDispute(dispute)}
                            className="p-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!dispute.mediateur && dispute.statut === 'OUVERT' && (
                            <button
                              onClick={() => {
                                setSelectedDispute(dispute);
                                setShowAssignModal(true);
                              }}
                              className="p-2 bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400 rounded-lg hover:bg-warning-100 dark:hover:bg-warning-500/20 transition-colors"
                              title="Assigner médiateur"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                          {(dispute.statut === 'OUVERT' || dispute.statut === 'EN_MEDIATION') && (
                            <button
                              onClick={() => {
                                setSelectedDispute(dispute);
                                setShowResolveModal(true);
                              }}
                              className="p-2 bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 rounded-lg hover:bg-success-100 dark:hover:bg-success-500/20 transition-colors"
                              title="Résoudre"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {disputes.length === 0 && (
              <div className="text-center py-12">
                <Scale className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                <p className="text-neutral-500">Aucun litige trouvé</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {data?.data?.last_page > 1 && (
        <div className="flex items-center justify-between">
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
        </div>
      )}

      {/* Detail Modal */}
      {selectedDispute && !showAssignModal && !showResolveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-dark-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-error-100 dark:bg-error-500/10 rounded-xl flex items-center justify-center">
                  <Scale className="w-6 h-6 text-error-600 dark:text-error-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">
                    Détails du litige
                  </h3>
                  <p className="text-sm text-neutral-500">
                    {detail?.reference_litige || `ID: ${selectedDispute.id.slice(0, 8)}...`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingDetails ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Status & Dates */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-4">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Statut</p>
                      <span className={clsx('px-3 py-1 text-xs font-medium rounded-full', getStatusColor(detail?.statut || selectedDispute.statut))}>
                        {getStatutLabel(detail?.statut || selectedDispute.statut)}
                      </span>
                    </div>
                    <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-4">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Date ouverture</p>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {new Date(detail?.date_ouverture || selectedDispute.date_ouverture).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    {detail?.mediation_started_at && (
                      <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-4">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Début médiation</p>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {new Date(detail.mediation_started_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                    {detail?.resolved_at && (
                      <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-4">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Date résolution</p>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {new Date(detail.resolved_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Motif & Description */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Motif</p>
                      <p className="text-neutral-900 dark:text-white font-medium">{detail?.motif || selectedDispute.motif}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Description</p>
                      <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-4">
                        <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                          {detail?.description || selectedDispute.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Parties */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Demandeur */}
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4">
                      <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3 font-medium">Demandeur (Plaignant)</p>
                      {(detail?.demandeur || selectedDispute.demandeur) ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {detail?.demandeur?.nom_complet || selectedDispute.demandeur?.nom_complet}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              {detail?.demandeur?.telephone || selectedDispute.demandeur?.telephone}
                            </span>
                          </div>
                          {(detail?.demandeur?.email || selectedDispute.demandeur?.email) && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-blue-500" />
                              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                {detail?.demandeur?.email || selectedDispute.demandeur?.email}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-neutral-400">Non renseigné</p>
                      )}
                    </div>

                    {/* Défendeur */}
                    <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4">
                      <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider mb-3 font-medium">Défendeur</p>
                      {(detail?.defendeur || selectedDispute.defendeur) ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-red-500" />
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {detail?.defendeur?.nom_complet || selectedDispute.defendeur?.nom_complet}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              {detail?.defendeur?.telephone || selectedDispute.defendeur?.telephone}
                            </span>
                          </div>
                          {(detail?.defendeur?.email || selectedDispute.defendeur?.email) && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-red-500" />
                              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                {detail?.defendeur?.email || selectedDispute.defendeur?.email}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-neutral-400">Non renseigné</p>
                      )}
                    </div>
                  </div>

                  {/* Médiateur */}
                  {(detail?.mediateur || selectedDispute.mediateur) && (
                    <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-4">
                      <p className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3 font-medium">Médiateur assigné</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-purple-500" />
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {detail?.mediateur?.nom_complet || selectedDispute.mediateur?.nom_complet}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Contrat lié */}
                  {detail?.contract && (
                    <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-4">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3 font-medium">Contrat lié</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-neutral-500" />
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            Réf: {detail.contract.reference || detail.contract.id.slice(0, 8)}
                          </span>
                        </div>
                        {detail.contract.listing && (
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-neutral-500" />
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">
                              {detail.contract.listing.titre}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Resolution notes */}
                  {detail?.resolution_notes && (
                    <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-4">
                      <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wider mb-2 font-medium">Notes de résolution</p>
                      <p className="text-neutral-700 dark:text-neutral-300">{detail.resolution_notes}</p>
                      {detail.montant_resolution && (
                        <p className="mt-2 font-medium text-green-700 dark:text-green-400">
                          Montant: {detail.montant_resolution.toLocaleString()} GNF
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-dark-border shrink-0 flex justify-end gap-3">
              {!selectedDispute.mediateur && selectedDispute.statut === 'OUVERT' && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-4 py-2 bg-warning-500 text-white rounded-xl hover:bg-warning-600 transition-colors flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Assigner médiateur
                </button>
              )}
              {(selectedDispute.statut === 'OUVERT' || selectedDispute.statut === 'EN_MEDIATION') && (
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="px-4 py-2 bg-success-500 text-white rounded-xl hover:bg-success-600 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Résoudre
                </button>
              )}
              <button
                onClick={() => setSelectedDispute(null)}
                className="px-4 py-2 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-dark-border transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Mediator Modal */}
      {showAssignModal && selectedDispute && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-dark-border flex items-center justify-between">
              <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">Assigner un médiateur</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedMediatorId('');
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Sélectionnez un médiateur
              </label>
              <select
                value={selectedMediatorId}
                onChange={(e) => setSelectedMediatorId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-hover text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- Choisir un médiateur --</option>
                {mediators.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom_complet} ({m.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-dark-border flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedMediatorId('');
                }}
                className="px-4 py-2 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (selectedMediatorId) {
                    assignMutation.mutate({
                      disputeId: selectedDispute.id,
                      mediateurId: selectedMediatorId,
                    });
                  }
                }}
                disabled={!selectedMediatorId || assignMutation.isPending}
                className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {assignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Assigner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedDispute && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-dark-border flex items-center justify-between">
              <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">Résoudre le litige</h3>
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setResolveForm({ statut: 'RESOLU_AMIABLE', resolution_notes: '', montant_resolution: '' });
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Type de résolution
                </label>
                <select
                  value={resolveForm.statut}
                  onChange={(e) => setResolveForm({ ...resolveForm, statut: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-hover text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="RESOLU_AMIABLE">Résolu à l&apos;amiable</option>
                  <option value="RESOLU_JUDICIAIRE">Résolu judiciaire</option>
                  <option value="FERME">Fermé sans résolution</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Montant de compensation (GNF) - optionnel
                </label>
                <input
                  type="number"
                  value={resolveForm.montant_resolution}
                  onChange={(e) => setResolveForm({ ...resolveForm, montant_resolution: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-hover text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Notes de résolution
                </label>
                <textarea
                  value={resolveForm.resolution_notes}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolution_notes: e.target.value })}
                  placeholder="Décrivez la résolution..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-hover text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-dark-border flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setResolveForm({ statut: 'RESOLU_AMIABLE', resolution_notes: '', montant_resolution: '' });
                }}
                className="px-4 py-2 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  resolveMutation.mutate({
                    disputeId: selectedDispute.id,
                    data: resolveForm,
                  });
                }}
                disabled={resolveMutation.isPending}
                className="px-4 py-2 bg-success-500 text-white rounded-xl hover:bg-success-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {resolveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Résoudre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
