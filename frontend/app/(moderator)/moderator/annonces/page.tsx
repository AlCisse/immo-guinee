'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageSquare,
  User,
  MapPin,
  Clock,
  Home,
  Bed,
  Bath,
  Maximize,
  Filter,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import {
  useListingsQueue,
  useApproveListing,
  useRejectListing,
  useRequestChanges,
  useMessageTemplates,
  ModerationListing,
} from '@/lib/hooks/useModerator';

type ViewMode = 'card' | 'list';

export default function AnnoncesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectCode, setRejectCode] = useState('');
  const [changesRequested, setChangesRequested] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading, refetch } = useListingsQueue({ status: statusFilter || undefined });
  const { data: templates } = useMessageTemplates();
  const approveMutation = useApproveListing();
  const rejectMutation = useRejectListing();
  const requestChangesMutation = useRequestChanges();

  const listings = data?.listings || [];
  const currentListing = listings[currentIndex];

  // Swipe handling
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 100;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left - Reject
        setShowRejectModal(true);
      } else {
        // Swipe right - Approve
        handleApprove();
      }
    }
  };

  const handleApprove = useCallback(async () => {
    if (!currentListing) return;

    try {
      await approveMutation.mutateAsync({ listingId: currentListing.id });
      // Provide haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(50);
      goToNext();
    } catch {
      // Error handled by React Query
    }
  }, [currentListing, approveMutation]);

  const handleReject = async () => {
    if (!currentListing || !rejectReason) return;

    try {
      await rejectMutation.mutateAsync({
        listingId: currentListing.id,
        reason: rejectReason,
        reason_code: rejectCode,
      });
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      setShowRejectModal(false);
      setRejectReason('');
      setRejectCode('');
      goToNext();
    } catch {
      // Error handled by React Query
    }
  };

  const handleRequestChanges = async () => {
    if (!currentListing || changesRequested.length === 0) return;

    try {
      await requestChangesMutation.mutateAsync({
        listingId: currentListing.id,
        changes_requested: changesRequested,
      });
      if (navigator.vibrate) navigator.vibrate([30, 30]);
      setShowChangesModal(false);
      setChangesRequested([]);
      goToNext();
    } catch {
      // Error handled by React Query
    }
  };

  const goToNext = () => {
    setCurrentPhotoIndex(0);
    if (currentIndex < listings.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      refetch();
      setCurrentIndex(0);
    }
  };

  const goToPrev = () => {
    setCurrentPhotoIndex(0);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-GN').format(price) + ' GNF';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <CheckCircle className="w-16 h-16 text-success-500 mb-4" />
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
          Tout est à jour !
        </h2>
        <p className="text-neutral-500 mb-6">
          Aucune annonce en attente de modération
        </p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
          Annonces ({listings.length})
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentIndex(0);
            }}
            className="px-3 py-2 text-sm bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl"
          >
            <option value="">En attente</option>
            <option value="reported">Signalées</option>
            <option value="ACTIVE">Actives</option>
            <option value="REJETE">Rejetées</option>
          </select>
          <button
            onClick={() => refetch()}
            className="p-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 bg-neutral-200 dark:bg-dark-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / listings.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-neutral-500">
          {currentIndex + 1}/{listings.length}
        </span>
      </div>

      {/* Card View with Swipe */}
      {currentListing && (
        <div
          className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Photo Carousel */}
          <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-dark-hover">
            {currentListing.photos && currentListing.photos.length > 0 ? (
              <>
                <Image
                  src={currentListing.photos[currentPhotoIndex]?.url || '/images/placeholder.jpg'}
                  alt={currentListing.titre}
                  fill
                  className="object-cover"
                />
                {/* Photo navigation */}
                {currentListing.photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center text-white"
                      disabled={currentPhotoIndex === 0}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setCurrentPhotoIndex(Math.min(currentListing.photos.length - 1, currentPhotoIndex + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center text-white"
                      disabled={currentPhotoIndex === currentListing.photos.length - 1}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    {/* Photo dots */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {currentListing.photos.map((_, idx) => (
                        <div
                          key={idx}
                          className={clsx(
                            'w-2 h-2 rounded-full transition-colors',
                            idx === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-400">
                <Home className="w-16 h-16" />
              </div>
            )}

            {/* Status badge */}
            {currentListing.reports_count > 0 && (
              <div className="absolute top-2 left-2 px-3 py-1 bg-error-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {currentListing.reports_count} signalement(s)
              </div>
            )}

            {/* Days pending */}
            <div className="absolute top-2 right-2 px-3 py-1 bg-black/50 text-white text-xs font-semibold rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {currentListing.days_pending}j
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Title and Price */}
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {currentListing.titre}
              </h2>
              <p className="text-xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                {formatPrice(currentListing.prix)}
                <span className="text-sm font-normal text-neutral-500">/mois</span>
              </p>
            </div>

            {/* Quick info */}
            <div className="flex flex-wrap gap-3 text-sm text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {currentListing.quartier}, {currentListing.ville}
              </div>
              <div className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                {currentListing.type_bien}
              </div>
            </div>

            {/* Features */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                <Bed className="w-4 h-4" />
                {currentListing.nb_chambres} ch.
              </div>
              <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                <Bath className="w-4 h-4" />
                {currentListing.nb_salles_bain} sdb
              </div>
              <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                <Maximize className="w-4 h-4" />
                {currentListing.surface} m²
              </div>
              {currentListing.meuble && (
                <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 rounded-full text-xs">
                  Meublé
                </span>
              )}
            </div>

            {/* Description */}
            <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-3">
              <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-4">
                {currentListing.description}
              </p>
            </div>

            {/* Owner info */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-dark-hover rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white text-sm">
                    {currentListing.proprietaire.nom}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Badge {currentListing.proprietaire.badge}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`tel:${currentListing.proprietaire.telephone}`}
                  className="p-2 bg-success-100 dark:bg-success-500/20 text-success-600 dark:text-success-400 rounded-lg"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${currentListing.proprietaire.telephone?.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-success-100 dark:bg-success-500/20 text-success-600 dark:text-success-400 rounded-lg"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-neutral-200 dark:border-dark-border">
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={rejectMutation.isPending}
                className="flex flex-col items-center gap-1 p-3 bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 rounded-xl active:scale-95 transition-transform"
              >
                <XCircle className="w-6 h-6" />
                <span className="text-xs font-medium">Rejeter</span>
              </button>

              <button
                onClick={() => setShowChangesModal(true)}
                disabled={requestChangesMutation.isPending}
                className="flex flex-col items-center gap-1 p-3 bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400 rounded-xl active:scale-95 transition-transform"
              >
                <Edit3 className="w-6 h-6" />
                <span className="text-xs font-medium">Modifier</span>
              </button>

              <button
                onClick={goToNext}
                className="flex flex-col items-center gap-1 p-3 bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-400 rounded-xl active:scale-95 transition-transform"
              >
                <ChevronRight className="w-6 h-6" />
                <span className="text-xs font-medium">Passer</span>
              </button>

              <button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="flex flex-col items-center gap-1 p-3 bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 rounded-xl active:scale-95 transition-transform"
              >
                <CheckCircle className="w-6 h-6" />
                <span className="text-xs font-medium">Valider</span>
              </button>
            </div>

            {/* Swipe hint on mobile */}
            <p className="text-center text-xs text-neutral-400 mt-3 md:hidden">
              Swipe droite pour valider, gauche pour rejeter
            </p>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-dark-card px-4 py-3 border-b border-neutral-200 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">
                  Rejeter l&apos;annonce
                </h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Quick templates */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Motif rapide
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {templates?.rejection.map((template) => (
                    <button
                      key={template.code}
                      onClick={() => {
                        setRejectCode(template.code);
                        setRejectReason(template.message);
                      }}
                      className={clsx(
                        'p-3 text-left text-sm rounded-xl border transition-colors',
                        rejectCode === template.code
                          ? 'border-error-500 bg-error-50 dark:bg-error-500/10'
                          : 'border-neutral-200 dark:border-dark-border'
                      )}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom message */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Message au propriétaire
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-hover focus:ring-2 focus:ring-error-500"
                  placeholder="Expliquez le motif du rejet..."
                />
              </div>

              <button
                onClick={handleReject}
                disabled={!rejectReason || rejectMutation.isPending}
                className="w-full py-3 bg-error-500 hover:bg-error-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {rejectMutation.isPending ? 'Envoi...' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {showChangesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-dark-card px-4 py-3 border-b border-neutral-200 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">
                  Demander des modifications
                </h3>
                <button
                  onClick={() => setShowChangesModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Modifications requises
                </label>
                <div className="space-y-2">
                  {templates?.modification.map((template) => (
                    <label
                      key={template.code}
                      className="flex items-start gap-3 p-3 border border-neutral-200 dark:border-dark-border rounded-xl cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={changesRequested.includes(template.message)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setChangesRequested([...changesRequested, template.message]);
                          } else {
                            setChangesRequested(changesRequested.filter(c => c !== template.message));
                          }
                        }}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-sm text-neutral-900 dark:text-white">
                          {template.label}
                        </p>
                        <p className="text-xs text-neutral-500">{template.message}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleRequestChanges}
                disabled={changesRequested.length === 0 || requestChangesMutation.isPending}
                className="w-full py-3 bg-warning-500 hover:bg-warning-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {requestChangesMutation.isPending ? 'Envoi...' : `Envoyer ${changesRequested.length} modification(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
