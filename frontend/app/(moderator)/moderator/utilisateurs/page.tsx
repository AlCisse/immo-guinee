'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  User,
  Search,
  Flag,
  AlertTriangle,
  Clock,
  Home,
  Shield,
  ChevronRight,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import {
  useModeratorUsers,
  useModeratorUserDetails,
  useSanctionUser,
  useUnsuspendUser,
  useMessageTemplates,
  ModeratorUser,
} from '@/lib/hooks/useModerator';

export default function UtilisateursPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFlagged, setShowFlagged] = useState(false);
  const [showSuspended, setShowSuspended] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [sanctionReason, setSanctionReason] = useState('');
  const [sanctionAction, setSanctionAction] = useState<'warn' | 'flag' | 'suspend_24h' | 'suspend_7d'>('warn');

  const { data, isLoading, refetch } = useModeratorUsers({
    search: searchQuery || undefined,
    flagged: showFlagged || undefined,
    suspended: showSuspended || undefined,
  });
  const { data: userDetails, isLoading: loadingDetails } = useModeratorUserDetails(selectedUserId || '');
  const { data: templates } = useMessageTemplates();
  const sanctionMutation = useSanctionUser();
  const unsuspendMutation = useUnsuspendUser();

  const users = data?.users || [];

  const handleSanction = async () => {
    if (!selectedUserId || !sanctionReason) return;

    try {
      await sanctionMutation.mutateAsync({
        userId: selectedUserId,
        action: sanctionAction,
        reason: sanctionReason,
      });
      setShowSanctionModal(false);
      setSanctionReason('');
      refetch();
    } catch {
      // Error handled by React Query
    }
  };

  const handleUnsuspend = async (userId: string) => {
    try {
      await unsuspendMutation.mutateAsync({ userId });
      refetch();
      setSelectedUserId(null);
    } catch {
      // Error handled by React Query
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'DIAMANT':
        return 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white';
      case 'OR':
        return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
      case 'ARGENT':
        return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
      default:
        return 'bg-gradient-to-r from-orange-300 to-orange-400 text-white';
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
          Utilisateurs
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Gestion limitée des utilisateurs
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom ou téléphone..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowFlagged(!showFlagged);
            setShowSuspended(false);
          }}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors',
            showFlagged
              ? 'bg-warning-500 text-white'
              : 'bg-warning-50 dark:bg-warning-500/10 text-warning-700 dark:text-warning-400'
          )}
        >
          <Flag className="w-4 h-4" />
          Flaggés
        </button>
        <button
          onClick={() => {
            setShowSuspended(!showSuspended);
            setShowFlagged(false);
          }}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors',
            showSuspended
              ? 'bg-error-500 text-white'
              : 'bg-error-50 dark:bg-error-500/10 text-error-700 dark:text-error-400'
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Suspendus
        </button>
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <User className="w-12 h-12 text-neutral-300 mb-4" />
            <p className="text-neutral-500">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-dark-hover active:bg-neutral-100 dark:active:bg-dark-hover transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {user.nom_complet?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-neutral-900 dark:text-white truncate">
                      {user.nom_complet}
                    </p>
                    {user.is_flagged && (
                      <Flag className="w-4 h-4 text-warning-500 flex-shrink-0" />
                    )}
                    {user.is_suspended && (
                      <AlertTriangle className="w-4 h-4 text-error-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-neutral-500">{user.telephone}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={clsx(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      getBadgeColor(user.badge)
                    )}>
                      {user.badge}
                    </span>
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <Home className="w-3 h-3" />
                      {user.listings_count} annonces
                    </span>
                    {user.reports_received_count > 0 && (
                      <span className="text-xs text-error-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {user.reports_received_count}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-dark-card px-4 py-3 border-b border-neutral-200 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">
                  Détails utilisateur
                </h3>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            ) : userDetails?.user && (
              <div className="p-4 space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {userDetails.user.nom_complet?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-neutral-900 dark:text-white">
                      {userDetails.user.nom_complet}
                    </h4>
                    <p className="text-neutral-500">{userDetails.user.telephone}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        getBadgeColor(userDetails.user.badge)
                      )}>
                        {userDetails.user.badge}
                      </span>
                      <span className="text-xs text-neutral-500">{userDetails.user.type_compte}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex gap-2">
                  {userDetails.user.is_flagged && (
                    <span className="px-3 py-1 bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400 rounded-full text-sm font-medium flex items-center gap-1">
                      <Flag className="w-4 h-4" />
                      Flaggé
                    </span>
                  )}
                  {userDetails.user.is_suspended && (
                    <span className="px-3 py-1 bg-error-100 dark:bg-error-500/20 text-error-700 dark:text-error-400 rounded-full text-sm font-medium flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Suspendu
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">
                      {userDetails.user.listings_count}
                    </div>
                    <div className="text-xs text-neutral-500">Annonces</div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-error-600 dark:text-error-400">
                      {userDetails.user.reports_received_count}
                    </div>
                    <div className="text-xs text-neutral-500">Signalements</div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">
                      {userDetails.user.reports_made_count}
                    </div>
                    <div className="text-xs text-neutral-500">Faits</div>
                  </div>
                </div>

                {/* Suspension Info */}
                {userDetails.user.is_suspended && userDetails.user.suspended_until && (
                  <div className="bg-error-50 dark:bg-error-500/10 rounded-xl p-4">
                    <p className="text-sm text-error-700 dark:text-error-400">
                      <strong>Suspendu jusqu&apos;au:</strong>{' '}
                      {new Date(userDetails.user.suspended_until).toLocaleDateString('fr-FR')}
                    </p>
                    {userDetails.user.suspension_reason && (
                      <p className="text-sm text-error-600 dark:text-error-400 mt-1">
                        {userDetails.user.suspension_reason}
                      </p>
                    )}
                  </div>
                )}

                {/* Recent Sanctions */}
                {userDetails.sanctions_history && userDetails.sanctions_history.length > 0 && (
                  <div>
                    <h5 className="font-medium text-neutral-900 dark:text-white mb-2">
                      Historique des sanctions
                    </h5>
                    <div className="space-y-2">
                      {userDetails.sanctions_history.slice(0, 5).map((sanction: { id: string; action: string; note: string; created_at: string; moderator?: { nom_complet: string } }) => (
                        <div
                          key={sanction.id}
                          className="bg-neutral-50 dark:bg-dark-hover rounded-lg p-3 text-sm"
                        >
                          <div className="flex justify-between">
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {sanction.action}
                            </span>
                            <span className="text-neutral-500">
                              {new Date(sanction.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          {sanction.note && (
                            <p className="text-neutral-600 dark:text-neutral-400 mt-1">{sanction.note}</p>
                          )}
                          {sanction.moderator && (
                            <p className="text-xs text-neutral-500 mt-1">
                              Par {sanction.moderator.nom_complet}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {userDetails.user.is_suspended ? (
                    <button
                      onClick={() => handleUnsuspend(userDetails.user.id)}
                      disabled={unsuspendMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-success-500 text-white rounded-xl font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Lever la suspension
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSanctionModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-warning-500 text-white rounded-xl font-medium"
                    >
                      <Shield className="w-4 h-4" />
                      Appliquer une sanction
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sanction Modal */}
      {showSanctionModal && selectedUserId && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-t-2xl md:rounded-2xl w-full max-w-lg">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">
                  Appliquer une sanction
                </h3>
                <button
                  onClick={() => setShowSanctionModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Action Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Type de sanction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSanctionAction('warn')}
                    className={clsx(
                      'p-3 rounded-xl border text-sm font-medium transition-colors',
                      sanctionAction === 'warn'
                        ? 'border-warning-500 bg-warning-50 dark:bg-warning-500/10 text-warning-700 dark:text-warning-400'
                        : 'border-neutral-200 dark:border-dark-border'
                    )}
                  >
                    Avertissement
                  </button>
                  <button
                    onClick={() => setSanctionAction('flag')}
                    className={clsx(
                      'p-3 rounded-xl border text-sm font-medium transition-colors',
                      sanctionAction === 'flag'
                        ? 'border-warning-500 bg-warning-50 dark:bg-warning-500/10 text-warning-700 dark:text-warning-400'
                        : 'border-neutral-200 dark:border-dark-border'
                    )}
                  >
                    Flagger
                  </button>
                  <button
                    onClick={() => setSanctionAction('suspend_24h')}
                    className={clsx(
                      'p-3 rounded-xl border text-sm font-medium transition-colors',
                      sanctionAction === 'suspend_24h'
                        ? 'border-error-500 bg-error-50 dark:bg-error-500/10 text-error-700 dark:text-error-400'
                        : 'border-neutral-200 dark:border-dark-border'
                    )}
                  >
                    Suspension 24h
                  </button>
                  <button
                    onClick={() => setSanctionAction('suspend_7d')}
                    className={clsx(
                      'p-3 rounded-xl border text-sm font-medium transition-colors',
                      sanctionAction === 'suspend_7d'
                        ? 'border-error-500 bg-error-50 dark:bg-error-500/10 text-error-700 dark:text-error-400'
                        : 'border-neutral-200 dark:border-dark-border'
                    )}
                  >
                    Suspension 7 jours
                  </button>
                </div>
              </div>

              {/* Quick templates */}
              {templates?.warning && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Motif rapide
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {templates.warning.map((template) => (
                      <button
                        key={template.code}
                        onClick={() => setSanctionReason(template.message)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                          sanctionReason === template.message
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                            : 'border-neutral-200 dark:border-dark-border'
                        )}
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom reason */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Motif
                </label>
                <textarea
                  value={sanctionReason}
                  onChange={(e) => setSanctionReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-hover"
                  placeholder="Expliquez le motif de la sanction..."
                />
              </div>

              <button
                onClick={handleSanction}
                disabled={!sanctionReason || sanctionMutation.isPending}
                className="w-full py-3 bg-error-500 hover:bg-error-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {sanctionMutation.isPending ? 'Application...' : 'Appliquer la sanction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
