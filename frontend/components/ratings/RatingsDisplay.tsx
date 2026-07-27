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
  getRatingLabelKey,
  getRatingColor,
  formatRatingDate,
} from '@/lib/hooks/useRatings';
import { useTranslations, useLocale } from '@/lib/i18n';

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
            rating >= star ? 'text-warning-400 fill-current' : 'text-neutral-200'
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
  const { t } = useTranslations();
  const criteria: { key: keyof RatingStats['criteria'] }[] = [
    { key: 'communication' },
    { key: 'ponctualite' },
    { key: 'proprete' },
    { key: 'respect_contrat' },
  ];

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-neutral-200 dark:border-dark-border p-6">
      <div className="flex items-start gap-6">
        {/* Overall Score */}
        <div className="text-center">
          <div className="text-5xl font-bold text-neutral-900 dark:text-white">{stats.average.toFixed(1)}</div>
          <StarDisplay rating={Math.round(stats.average)} size="md" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {t('ratings.display.reviewsCount', { count: stats.total })}
          </p>
        </div>

        {/* Distribution */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star as keyof typeof stats.distribution];
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400 w-3">{star}</span>
                <svg className="w-4 h-4 text-warning-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div className="flex-1 h-2 bg-neutral-100 dark:bg-dark-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-neutral-500 dark:text-neutral-400 w-8">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Criteria Breakdown */}
      {stats.criteria && (
        <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-dark-border">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            {t('ratings.display.criteriaTitle')}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {criteria.map(({ key }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t(`ratings.display.criteria.${key}`)}
                </span>
                <div className="flex items-center gap-1">
                  <span className={clsx('text-sm font-medium', getRatingColor(stats.criteria[key]))}>
                    {stats.criteria[key]?.toFixed(1) || '–'}
                  </span>
                  <svg className="w-4 h-4 text-warning-400 fill-current" viewBox="0 0 20 20">
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
  const { t } = useTranslations();
  const { locale } = useLocale();
  const [showReportModal, setShowReportModal] = useState(false);
  const markHelpful = useMarkRatingHelpful();
  const reportRating = useReportRating();

  const reportReasons: { key: string }[] = [
    { key: 'inappropriate' },
    { key: 'fake' },
    { key: 'spam' },
    { key: 'other' },
  ];

  const handleHelpful = () => {
    markHelpful.mutate(rating.id);
  };

  const handleReport = (reason: string) => {
    reportRating.mutate({ ratingId: rating.id, reason });
    setShowReportModal(false);
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg border border-neutral-200 dark:border-dark-border p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-medium">
              {rating.evaluateur.nom_complet.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">{rating.evaluateur.nom_complet}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{formatRatingDate(rating.created_at, locale)}</p>
          </div>
        </div>
        <div className="text-right">
          <StarDisplay rating={rating.note} />
          <p className={clsx('text-sm font-medium', getRatingColor(rating.note))}>
            {t(`ratings.display.labels.${getRatingLabelKey(rating.note)}`)}
          </p>
        </div>
      </div>

      {/* Comment */}
      <p className="text-neutral-700 dark:text-neutral-300 mb-3">{rating.commentaire}</p>

      {/* Response */}
      {rating.reponse && (
        <div className="bg-neutral-50 dark:bg-dark-bg rounded-lg p-3 mb-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{t('ratings.display.ownerResponse')}</p>
          <p className="text-neutral-700 dark:text-neutral-300 text-sm">{rating.reponse}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-dark-border">
        <button
          onClick={handleHelpful}
          disabled={markHelpful.isPending}
          className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
          <span>{t('ratings.display.helpful', { count: rating.helpful_count })}</span>
        </button>

        <button
          onClick={() => setShowReportModal(true)}
          className="text-sm text-neutral-400 hover:text-error-500 transition-colors"
        >
          {t('ratings.display.report')}
        </button>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-xl max-w-md w-full p-6">
            <h3 className="font-semibold text-lg mb-4 text-neutral-900 dark:text-white">{t('ratings.display.reportTitle')}</h3>
            <div className="space-y-2">
              {reportReasons.map(({ key }) => {
                const label = t(`ratings.display.reportReasons.${key}`);
                return (
                  <button
                    key={key}
                    onClick={() => handleReport(label)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-neutral-200 dark:border-dark-border hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-dark-hover transition-colors text-neutral-700 dark:text-neutral-300"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowReportModal(false)}
              className="w-full mt-4 px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              {t('ratings.display.cancel')}
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
  const { t } = useTranslations();
  const [showAll, setShowAll] = useState(false);

  const { data: ratings, isLoading: ratingsLoading } = useUserRatings(userId);
  const { data: stats, isLoading: statsLoading } = useUserRatingStats(userId);

  if (ratingsLoading || statsLoading) {
    return (
      <div className="space-y-4">
        {showStats && <div className="h-48 bg-neutral-100 dark:bg-dark-hover rounded-xl animate-pulse" />}
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-neutral-100 dark:bg-dark-hover rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 text-neutral-300 mx-auto mb-4"
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
        <p className="text-neutral-500 dark:text-neutral-400">{t('ratings.display.empty')}</p>
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
          {t('ratings.display.showAll', { count: ratings.length })}
        </button>
      )}
    </div>
  );
}

export { RatingStatsCard, RatingCard, StarDisplay };
