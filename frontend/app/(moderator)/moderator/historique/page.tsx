'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  History,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  FileCheck,
  MessageSquare,
  Download,
  Calendar,
} from 'lucide-react';
import { useModerationHistory, useModeratorExport, ModerationLog } from '@/lib/hooks/useModerator';

export default function HistoriquePage() {
  const [showMyActions, setShowMyActions] = useState(true);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useModerationHistory({
    my_actions: showMyActions || undefined,
    action: selectedAction || undefined,
    entity_type: selectedEntityType || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });
  const exportMutation = useModeratorExport();

  const logs = data?.logs || [];

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        type: 'history',
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });

      // Convert to CSV
      if (result.data && result.data.length > 0) {
        const headers = ['Date', 'Action', 'Type', 'Note'];
        const csvContent = [
          headers.join(','),
          ...result.data.map((log: ModerationLog) =>
            [
              new Date(log.created_at).toLocaleString('fr-FR'),
              log.action,
              log.entity_type,
              `"${(log.note || '').replace(/"/g, '""')}"`,
            ].join(',')
          ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `moderation-history-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Error handled by React Query
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approve':
        return CheckCircle;
      case 'reject':
        return XCircle;
      case 'suspend':
      case 'suspend_24h':
      case 'suspend_7d':
        return AlertTriangle;
      case 'warn':
      case 'flag':
        return AlertTriangle;
      default:
        return History;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approve':
        return 'text-success-600 dark:text-success-400 bg-success-100 dark:bg-success-500/20';
      case 'reject':
      case 'suspend':
      case 'suspend_24h':
      case 'suspend_7d':
        return 'text-error-600 dark:text-error-400 bg-error-100 dark:bg-error-500/20';
      case 'warn':
      case 'flag':
        return 'text-warning-600 dark:text-warning-400 bg-warning-100 dark:bg-warning-500/20';
      default:
        return 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-dark-hover';
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'listing':
        return FileCheck;
      case 'user':
        return User;
      case 'message':
        return MessageSquare;
      default:
        return History;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      approve: 'Approbation',
      reject: 'Rejet',
      suspend: 'Suspension',
      unsuspend: 'Levée suspension',
      warn: 'Avertissement',
      flag: 'Signalement',
      handle_report: 'Traitement signalement',
      contact_owner: 'Contact propriétaire',
      request_changes: 'Demande modifications',
      suspend_24h: 'Suspension 24h',
      suspend_7d: 'Suspension 7 jours',
    };
    return labels[action] || action;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
            Historique
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {logs.length} action(s)
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exportMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-medium"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-soft space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Filtres</span>
        </div>

        {/* Toggle my actions */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Mes actions uniquement</span>
          <button
            onClick={() => setShowMyActions(!showMyActions)}
            className={clsx(
              'w-12 h-6 rounded-full transition-colors relative',
              showMyActions ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-dark-border'
            )}
          >
            <span
              className={clsx(
                'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                showMyActions ? 'translate-x-7' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {/* Action filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAction('')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              !selectedAction
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-400'
            )}
          >
            Toutes
          </button>
          <button
            onClick={() => setSelectedAction('approve')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              selectedAction === 'approve'
                ? 'bg-success-500 text-white'
                : 'bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-400'
            )}
          >
            Approuvées
          </button>
          <button
            onClick={() => setSelectedAction('reject')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              selectedAction === 'reject'
                ? 'bg-error-500 text-white'
                : 'bg-error-50 dark:bg-error-500/10 text-error-700 dark:text-error-400'
            )}
          >
            Rejetées
          </button>
          <button
            onClick={() => setSelectedAction('warn')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              selectedAction === 'warn'
                ? 'bg-warning-500 text-white'
                : 'bg-warning-50 dark:bg-warning-500/10 text-warning-700 dark:text-warning-400'
            )}
          >
            Avertissements
          </button>
        </div>

        {/* Entity type filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedEntityType('')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              !selectedEntityType
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-400'
            )}
          >
            Tout
          </button>
          <button
            onClick={() => setSelectedEntityType('listing')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
              selectedEntityType === 'listing'
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-400'
            )}
          >
            <FileCheck className="w-3 h-3" />
            Annonces
          </button>
          <button
            onClick={() => setSelectedEntityType('user')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
              selectedEntityType === 'user'
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-400'
            )}
          >
            <User className="w-3 h-3" />
            Utilisateurs
          </button>
          <button
            onClick={() => setSelectedEntityType('report')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
              selectedEntityType === 'report'
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-400'
            )}
          >
            <AlertTriangle className="w-3 h-3" />
            Signalements
          </button>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neutral-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-hover"
          />
          <span className="text-neutral-400">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-hover"
          />
        </div>
      </div>

      {/* History List */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="w-12 h-12 text-neutral-300 mb-4" />
            <p className="text-neutral-500">Aucune action trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            {logs.map((log) => {
              const ActionIcon = getActionIcon(log.action);
              const EntityIcon = getEntityIcon(log.entity_type);

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-4"
                >
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    getActionColor(log.action)
                  )}>
                    <ActionIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {getActionLabel(log.action)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-neutral-500">
                        <EntityIcon className="w-3 h-3" />
                        {log.entity_type}
                      </span>
                    </div>
                    {log.note && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                        {log.note}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                      <span>{new Date(log.created_at).toLocaleString('fr-FR')}</span>
                      {log.moderator && (
                        <>
                          <span>•</span>
                          <span>{log.moderator.nom_complet}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination would go here */}
      {data?.meta && data.meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <p className="text-sm text-neutral-500">
            Page {data.meta.current_page} sur {data.meta.last_page}
          </p>
        </div>
      )}
    </div>
  );
}
