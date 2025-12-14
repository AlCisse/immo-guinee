'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  AlertTriangle,
  FileCheck,
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Eye,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useReports, useHandleReport, Report } from '@/lib/hooks/useModerator';

export default function SignalementsPage() {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionNote, setActionNote] = useState('');

  const { data, isLoading, refetch } = useReports({
    severity: selectedSeverity || undefined,
    type: selectedType || undefined,
  });
  const handleReportMutation = useHandleReport();

  const reports = data?.reports || [];
  const stats = data?.stats || { critical: 0, high: 0, medium: 0, low: 0 };

  const handleAction = async (action: 'dismiss' | 'warn' | 'suspend_listing' | 'suspend_user' | 'escalate') => {
    if (!selectedReport) return;

    try {
      await handleReportMutation.mutateAsync({
        reportId: selectedReport.id,
        action,
        note: actionNote,
      });
      setSelectedReport(null);
      setActionNote('');
      refetch();
    } catch {
      // Error handled by React Query
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-error-100 dark:bg-error-500/20 text-error-700 dark:text-error-400 border-error-200 dark:border-error-500/30';
      case 'HIGH':
        return 'bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400 border-warning-200 dark:border-warning-500/30';
      case 'MEDIUM':
        return 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-500/30';
      default:
        return 'bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-400 border-neutral-200 dark:border-dark-border';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LISTING':
        return FileCheck;
      case 'USER':
        return User;
      case 'MESSAGE':
        return MessageSquare;
      default:
        return AlertTriangle;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
          Signalements
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {reports.length} signalement(s) en attente
        </p>
      </div>

      {/* Severity Stats */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => setSelectedSeverity(selectedSeverity === 'CRITICAL' ? '' : 'CRITICAL')}
          className={clsx(
            'p-3 rounded-xl border text-center transition-all',
            selectedSeverity === 'CRITICAL'
              ? 'bg-error-500 text-white border-error-500'
              : 'bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 border-error-200 dark:border-error-500/30'
          )}
        >
          <div className="text-xl font-bold">{stats.critical}</div>
          <div className="text-xs mt-1">Critique</div>
        </button>
        <button
          onClick={() => setSelectedSeverity(selectedSeverity === 'HIGH' ? '' : 'HIGH')}
          className={clsx(
            'p-3 rounded-xl border text-center transition-all',
            selectedSeverity === 'HIGH'
              ? 'bg-warning-500 text-white border-warning-500'
              : 'bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400 border-warning-200 dark:border-warning-500/30'
          )}
        >
          <div className="text-xl font-bold">{stats.high}</div>
          <div className="text-xs mt-1">Haute</div>
        </button>
        <button
          onClick={() => setSelectedSeverity(selectedSeverity === 'MEDIUM' ? '' : 'MEDIUM')}
          className={clsx(
            'p-3 rounded-xl border text-center transition-all',
            selectedSeverity === 'MEDIUM'
              ? 'bg-primary-500 text-white border-primary-500'
              : 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-500/30'
          )}
        >
          <div className="text-xl font-bold">{stats.medium}</div>
          <div className="text-xs mt-1">Moyenne</div>
        </button>
        <button
          onClick={() => setSelectedSeverity(selectedSeverity === 'LOW' ? '' : 'LOW')}
          className={clsx(
            'p-3 rounded-xl border text-center transition-all',
            selectedSeverity === 'LOW'
              ? 'bg-neutral-500 text-white border-neutral-500'
              : 'bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-dark-border'
          )}
        >
          <div className="text-xl font-bold">{stats.low}</div>
          <div className="text-xs mt-1">Basse</div>
        </button>
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-neutral-400 flex-shrink-0" />
        <button
          onClick={() => setSelectedType('')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            !selectedType
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-400'
          )}
        >
          Tous
        </button>
        <button
          onClick={() => setSelectedType('LISTING')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            selectedType === 'LISTING'
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-400'
          )}
        >
          Annonces
        </button>
        <button
          onClick={() => setSelectedType('USER')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            selectedType === 'USER'
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-400'
          )}
        >
          Utilisateurs
        </button>
        <button
          onClick={() => setSelectedType('MESSAGE')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            selectedType === 'MESSAGE'
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-400'
          )}
        >
          Messages
        </button>
      </div>

      {/* Reports List */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-12 h-12 text-success-500 mb-4" />
            <p className="text-neutral-500">Aucun signalement en attente</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            {reports.map((report) => {
              const TypeIcon = getTypeIcon(report.type);
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-dark-hover active:bg-neutral-100 dark:active:bg-dark-hover transition-colors text-left"
                >
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    getSeverityColor(report.severity)
                  )}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        getSeverityColor(report.severity)
                      )}>
                        {report.severity}
                      </span>
                      <span className="text-xs text-neutral-500">{report.type}</span>
                    </div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white mt-1 truncate">
                      {report.reason}
                    </p>
                    {report.description && (
                      <p className="text-xs text-neutral-500 truncate mt-0.5">
                        {report.description}
                      </p>
                    )}
                    <p className="text-xs text-neutral-400 mt-1">
                      Par {report.reporter?.nom_complet || 'Anonyme'} - {new Date(report.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-dark-card px-4 py-3 border-b border-neutral-200 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    getSeverityColor(selectedReport.severity)
                  )}>
                    {selectedReport.severity}
                  </span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">
                    {selectedReport.type}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Report Details */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-neutral-500 uppercase">Motif</p>
                  <p className="font-medium text-neutral-900 dark:text-white">{selectedReport.reason}</p>
                </div>

                {selectedReport.description && (
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">Description</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{selectedReport.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">Signalé par</p>
                    <p className="text-sm text-neutral-900 dark:text-white">
                      {selectedReport.reporter?.nom_complet || 'Anonyme'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">Date</p>
                    <p className="text-sm text-neutral-900 dark:text-white">
                      {new Date(selectedReport.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>

                {selectedReport.reported_user && (
                  <div className="p-3 bg-neutral-50 dark:bg-dark-hover rounded-xl">
                    <p className="text-xs text-neutral-500 uppercase mb-2">Utilisateur signalé</p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">
                        {selectedReport.reported_user.nom_complet}
                      </span>
                    </div>
                  </div>
                )}

                {selectedReport.listing && (
                  <div className="p-3 bg-neutral-50 dark:bg-dark-hover rounded-xl">
                    <p className="text-xs text-neutral-500 uppercase mb-2">Annonce signalée</p>
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">
                        {selectedReport.listing.titre}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Note (optionnel)
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-hover"
                  placeholder="Ajouter une note..."
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAction('dismiss')}
                  disabled={handleReportMutation.isPending}
                  className="flex items-center justify-center gap-2 py-3 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300 rounded-xl font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  Ignorer
                </button>
                <button
                  onClick={() => handleAction('warn')}
                  disabled={handleReportMutation.isPending}
                  className="flex items-center justify-center gap-2 py-3 bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400 rounded-xl font-medium"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Avertir
                </button>
                <button
                  onClick={() => handleAction('suspend_listing')}
                  disabled={handleReportMutation.isPending || !selectedReport.listing}
                  className="flex items-center justify-center gap-2 py-3 bg-error-100 dark:bg-error-500/20 text-error-700 dark:text-error-400 rounded-xl font-medium disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4" />
                  Suspendre annonce
                </button>
                <button
                  onClick={() => handleAction('suspend_user')}
                  disabled={handleReportMutation.isPending || !selectedReport.reported_user}
                  className="flex items-center justify-center gap-2 py-3 bg-error-100 dark:bg-error-500/20 text-error-700 dark:text-error-400 rounded-xl font-medium disabled:opacity-50"
                >
                  <User className="w-4 h-4" />
                  Suspendre utilisateur
                </button>
              </div>

              <button
                onClick={() => handleAction('escalate')}
                disabled={handleReportMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-error-500 text-white rounded-xl font-medium"
              >
                <AlertOctagon className="w-4 h-4" />
                Escalader à l&apos;admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
