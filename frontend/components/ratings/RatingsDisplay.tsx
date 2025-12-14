'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  useUserRatings,
  useUserRatingStats,
  useMarkRatingHelpful,
  useReportRating,
  Rating,
  RatingStats,
  getRatingLabel,
  getRatingColor,
  formatRatingDate,
} from '@/lib/hooks/useRatings';

// T212: RatingsDisplay component (FR-070 - on public profiles)

interface RatingsDisplayProps {
  userId: string;
  showStats?: boolean;
  maxDisplay?: number;
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={clsx(
            sizeClasses[size],
            rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-200'
          )}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function RatingStatsCard({ stats }: { stats: RatingStats }) {
  const maxDistribution = Math.max(...Object.values(stats.distribution));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start gap-6">
        {/* Overall Score */}
        <div className="text-center">
          <div className="text-5xl font-bold text-gray-900">{stats.average.toFixed(1)}</div>
          <StarDisplay rating={Math.round(stats.average)} size="md" />
          <p className="text-sm text-gray-500 mt-1">{stats.total} avis</p>
        </div>

        {/* Distribution */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star as keyof typeof stats.distribution];
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-3">{star}</span>
                <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Criteria Breakdown */}
      {stats.criteria && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Notes par critère</h4>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'communication', label: 'Communication' },
              { key: 'ponctualite', label: 'Ponctualité' },
              { key: 'proprete', label: 'Propreté' },
              { key: 'respect_contrat', label: 'Respect contrat' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                <div className="flex items-center gap-1">
                  <span className={clsx('text-sm font-medium', getRatingColor(stats.criteria[key as keyof typeof stats.criteria]))}>
                    {stats.criteria[key as keyof typeof stats.criteria]?.toFixed(1) || '–'}
                  </span>
                  <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RatingCard({ rating }: { rating: Rating }) {
  const [showReportModal, setShowReportModal] = useState(false);
  const markHelpful = useMarkRatingHelpful();
  const reportRating = useReportRating();

  const handleHelpful = () => {
    markHelpful.mutate(rating.id);
  };

  const handleReport = (reason: string) => {
    reportRating.mutate({ ratingId: rating.id, reason });
    setShowReportModal(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-medium">
              {rating.evaluateur.nom_complet.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{rating.evaluateur.nom_complet}</p>
            <p className="text-sm text-gray-500">{formatRatingDate(rating.created_at)}</p>
          </div>
        </div>
        <div className="text-right">
          <StarDisplay rating={rating.note} />
          <p className={clsx('text-sm font-medium', getRatingColor(rating.note))}>
            {getRatingLabel(rating.note)}
          </p>
        </div>
      </div>

      {/* Comment */}
      <p className="text-gray-700 mb-3">{rating.commentaire}</p>

      {/* Response */}
      {rating.reponse && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-500 mb-1">Réponse du propriétaire :</p>
          <p className="text-gray-700 text-sm">{rating.reponse}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          onClick={handleHelpful}
          disabled={markHelpful.isPending}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
          <span>Utile ({rating.helpful_count})</span>
        </button>

        <button
          onClick={() => setShowReportModal(true)}
          className="text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          Signaler
        </button>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-semibold text-lg mb-4">Signaler cet avis</h3>
            <div className="space-y-2">
              {['Contenu inapproprié', 'Faux avis', 'Spam', 'Autre'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleReport(reason)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowReportModal(false)}
              className="w-full mt-4 px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RatingsDisplay({
  userId,
  showStats = true,
  maxDisplay = 10,
}: RatingsDisplayProps) {
  const [showAll, setShowAll] = useState(false);

  const { data: ratings, isLoading: ratingsLoading } = useUserRatings(userId);
  const { data: stats, isLoading: statsLoading } = useUserRatingStats(userId);

  if (ratingsLoading || statsLoading) {
    return (
      <div className="space-y-4">
        {showStats && <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />}
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
        <p className="text-gray-500">Aucun avis pour le moment</p>
      </div>
    );
  }

  const displayedRatings = showAll ? ratings : ratings.slice(0, maxDisplay);

  return (
    <div className="space-y-6">
      {/* Stats */}
      {showStats && stats && <RatingStatsCard stats={stats} />}

      {/* Ratings List */}
      <div className="space-y-4">
        {displayedRatings.map((rating) => (
          <RatingCard key={rating.id} rating={rating} />
        ))}
      </div>

      {/* Show More */}
      {ratings.length > maxDisplay && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 text-primary-600 hover:text-primary-700 font-medium"
        >
          Voir tous les avis ({ratings.length})
        </button>
      )}
    </div>
  );
}

export { RatingStatsCard, RatingCard, StarDisplay };
