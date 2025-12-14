'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import {
  MessageSquare,
  Eye,
  Flag,
  Mail,
  AlertTriangle,
  Send,
  X,
  User,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import { ColoredStatsCard } from '@/components/ui/StatsCard';
import { toast } from 'react-hot-toast';

interface MessageItem {
  id: string;
  type: 'contact' | 'report';
  nom: string;
  email: string;
  telephone?: string;
  sujet: string;
  message: string;
  statut: string;
  reponse?: string;
  user?: {
    id: string;
    nom_complet: string;
  };
  reported_user?: {
    id: string;
    nom_complet: string;
  };
  listing?: {
    id: string;
    titre: string;
  };
  severity?: string;
  repondu_par?: {
    id: string;
    nom_complet: string;
  };
  repondu_at?: string;
  created_at: string;
}

export default function MessagesPage() {
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'contact' | 'report'>('all');
  const [filterStatut, setFilterStatut] = useState<string>('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'messages', filterType, filterStatut],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filterType !== 'all') params.type = filterType;
      if (filterStatut) params.statut = filterStatut;
      const response = await apiClient.get('/admin/messages', { params });
      return response.data;
    },
  });

  // Reply to contact message
  const replyContactMutation = useMutation({
    mutationFn: async ({ id, reponse }: { id: string; reponse: string }) => {
      const response = await apiClient.post(`/admin/contact-messages/${id}/reply`, { reponse });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Réponse envoyée');
      setReplyText('');
      setSelectedMessage(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'messages'] });
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi');
    },
  });

  // Process report
  const processReportMutation = useMutation({
    mutationFn: async ({ id, status, moderator_note }: { id: string; status: string; moderator_note: string }) => {
      const response = await apiClient.post(`/admin/reports/${id}/process`, { status, moderator_note });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Signalement traité');
      setReplyText('');
      setSelectedMessage(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'messages'] });
    },
    onError: () => {
      toast.error('Erreur lors du traitement');
    },
  });

  const handleReply = () => {
    if (!selectedMessage || !replyText.trim()) return;

    if (selectedMessage.type === 'contact') {
      replyContactMutation.mutate({ id: selectedMessage.id, reponse: replyText.trim() });
    } else {
      processReportMutation.mutate({ id: selectedMessage.id, status: 'RESOLVED', moderator_note: replyText.trim() });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  const messages: MessageItem[] = Array.isArray(data?.data) ? data.data : [];
  const stats = data?.stats || { total: 0, contact_count: 0, report_count: 0, en_attente: 0 };

  const getStatutBadge = (statut: string, type: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      EN_ATTENTE: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400', label: 'En attente' },
      PENDING: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400', label: 'En attente' },
      EN_COURS: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400', label: 'En cours' },
      REVIEWING: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400', label: 'En cours' },
      TRAITE: { color: 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400', label: 'Traité' },
      RESOLVED: { color: 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400', label: 'Résolu' },
      DISMISSED: { color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-500/10 dark:text-neutral-400', label: 'Rejeté' },
      ARCHIVE: { color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-500/10 dark:text-neutral-400', label: 'Archivé' },
    };
    const status = statusMap[statut] || { color: 'bg-neutral-100 text-neutral-800', label: statut };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
        {status.label}
      </span>
    );
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    const severityMap: Record<string, { color: string; label: string }> = {
      LOW: { color: 'bg-blue-100 text-blue-800', label: 'Faible' },
      MEDIUM: { color: 'bg-yellow-100 text-yellow-800', label: 'Moyen' },
      HIGH: { color: 'bg-orange-100 text-orange-800', label: 'Élevé' },
      CRITICAL: { color: 'bg-red-100 text-red-800', label: 'Critique' },
    };
    const sev = severityMap[severity] || { color: 'bg-neutral-100 text-neutral-800', label: severity };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${sev.color}`}>
        {sev.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <MessageSquare className="w-7 h-7 text-primary-500" />
          Messages & Signalements
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Gérez les messages du formulaire contact et les signalements
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ColoredStatsCard
          title="Total messages"
          value={stats.total}
          change={0}
          color="secondary"
        />
        <ColoredStatsCard
          title="Messages contact"
          value={stats.contact_count}
          change={0}
          color="primary"
        />
        <ColoredStatsCard
          title="Signalements"
          value={stats.report_count}
          change={0}
          color="pink"
        />
        <ColoredStatsCard
          title="En attente"
          value={stats.en_attente}
          change={0}
          color="warning"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-500" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Filtres:</span>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'all' | 'contact' | 'report')}
          className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-hover text-sm"
        >
          <option value="all">Tous</option>
          <option value="contact">Messages contact</option>
          <option value="report">Signalements</option>
        </select>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-hover text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="EN_ATTENTE">En attente</option>
          <option value="TRAITE">Traité</option>
        </select>
      </div>

      {/* Messages List */}
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">De</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Sujet</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-dark-border">
                  {messages.map((msg) => (
                    <tr
                      key={`${msg.type}-${msg.id}`}
                      className="hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {msg.type === 'contact' ? (
                            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-500/10 rounded-lg flex items-center justify-center">
                              <Mail className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-red-100 dark:bg-red-500/10 rounded-lg flex items-center justify-center">
                              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            {msg.type === 'contact' ? 'Contact' : 'Signalement'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-white">{msg.nom}</div>
                          <div className="text-sm text-neutral-500">{msg.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate font-medium">{msg.sujet}</p>
                          <p className="text-sm text-neutral-500 truncate">{msg.message}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {getStatutBadge(msg.statut, msg.type)}
                          {msg.type === 'report' && getSeverityBadge(msg.severity)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-neutral-700 dark:text-neutral-300">
                          {new Date(msg.created_at).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedMessage(msg);
                            setReplyText(msg.reponse || '');
                          }}
                          className="p-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                          title="Voir et répondre"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {messages.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                <p className="text-neutral-500">Aucun message trouvé</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-dark-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {selectedMessage.type === 'contact' ? (
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-500/10 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-500/10 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">
                    {selectedMessage.type === 'contact' ? 'Message de contact' : 'Signalement'}
                  </h3>
                  <p className="text-sm text-neutral-500">
                    {selectedMessage.nom} - {selectedMessage.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedMessage(null);
                  setReplyText('');
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Message info */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Sujet</label>
                  <p className="text-neutral-900 dark:text-white font-medium mt-1">{selectedMessage.sujet}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Message</label>
                  <div className="mt-2 p-4 bg-neutral-50 dark:bg-dark-hover rounded-xl">
                    <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>
                </div>

                {selectedMessage.telephone && (
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Téléphone</label>
                    <p className="text-neutral-900 dark:text-white mt-1">{selectedMessage.telephone}</p>
                  </div>
                )}

                {selectedMessage.type === 'report' && (
                  <>
                    {selectedMessage.reported_user && (
                      <div>
                        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Utilisateur signalé</label>
                        <p className="text-neutral-900 dark:text-white mt-1">{selectedMessage.reported_user.nom_complet}</p>
                      </div>
                    )}
                    {selectedMessage.listing && (
                      <div>
                        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Annonce concernée</label>
                        <p className="text-neutral-900 dark:text-white mt-1">{selectedMessage.listing.titre}</p>
                      </div>
                    )}
                    {selectedMessage.severity && (
                      <div>
                        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Sévérité</label>
                        <div className="mt-1">{getSeverityBadge(selectedMessage.severity)}</div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Statut</label>
                    <div className="mt-1">{getStatutBadge(selectedMessage.statut, selectedMessage.type)}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</label>
                    <p className="text-neutral-900 dark:text-white mt-1">
                      {new Date(selectedMessage.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>

                {/* Previous response if exists */}
                {selectedMessage.reponse && (
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Réponse précédente</label>
                    <div className="mt-2 p-4 bg-primary-50 dark:bg-primary-500/10 rounded-xl border-l-4 border-primary-500">
                      <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{selectedMessage.reponse}</p>
                      {selectedMessage.repondu_par && (
                        <p className="text-xs text-neutral-500 mt-2">
                          Par {selectedMessage.repondu_par.nom_complet} le {selectedMessage.repondu_at ? new Date(selectedMessage.repondu_at).toLocaleString('fr-FR') : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reply Input */}
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-dark-border shrink-0">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                {selectedMessage.reponse ? 'Modifier la réponse' : 'Votre réponse'}
              </label>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Tapez votre réponse..."
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-hover text-neutral-900 dark:text-white placeholder-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || replyContactMutation.isPending || processReportMutation.isPending}
                  className="px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {(replyContactMutation.isPending || processReportMutation.isPending) ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  <span>Envoyer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
