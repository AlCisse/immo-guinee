'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Facebook,
  ExternalLink,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import {
  useFacebookPosts,
  useDeleteFromFacebook,
  useFacebookStatistics,
  type FacebookPost,
} from '@/lib/hooks/useFacebook';

interface FacebookPostsListProps {
  showStats?: boolean;
}

export default function FacebookPostsList({ showStats = true }: FacebookPostsListProps) {
  const { t } = useTranslations();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: postsData, isLoading } = useFacebookPosts({
    page,
    per_page: 10,
    status: statusFilter || undefined,
  });
  const { data: statistics } = useFacebookStatistics();
  const deleteMutation = useDeleteFromFacebook();

  const handleDelete = async (listingId: string) => {
    setDeletingId(listingId);
    try {
      await deleteMutation.mutateAsync(listingId);
    } catch (error) {
      console.error('Delete from Facebook error:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusIcon = (status: FacebookPost['status']) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'deleted':
        return <Trash2 className="w-4 h-4 text-neutral-400" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: FacebookPost['status']) => {
    switch (status) {
      case 'published':
        return t('facebook.statusPublished');
      case 'pending':
        return t('facebook.statusPending');
      case 'failed':
        return t('facebook.statusFailed');
      case 'deleted':
        return t('facebook.statusDeleted');
      default:
        return status;
    }
  };

  const getStatusColor = (status: FacebookPost['status']) => {
    switch (status) {
      case 'published':
        return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400';
      case 'failed':
        return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400';
      case 'deleted':
        return 'bg-neutral-100 dark:bg-neutral-500/20 text-neutral-600 dark:text-neutral-400';
      default:
        return 'bg-neutral-100 dark:bg-neutral-500/20 text-neutral-600 dark:text-neutral-400';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(price) + ' GNF';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1877F2]/10 rounded-xl flex items-center justify-center">
              <Facebook className="w-5 h-5 text-[#1877F2]" />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-white">
                {t('facebook.postsTitle')}
              </h2>
              <p className="text-sm text-neutral-500">{t('facebook.postsSubtitle')}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {showStats && statistics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="p-3 bg-neutral-50 dark:bg-dark-bg rounded-xl">
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {statistics.total_posts}
              </p>
              <p className="text-xs text-neutral-500">{t('facebook.statTotal')}</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {statistics.published_posts}
              </p>
              <p className="text-xs text-neutral-500">{t('facebook.statPublished')}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl">
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {statistics.failed_posts}
              </p>
              <p className="text-xs text-neutral-500">{t('facebook.statFailed')}</p>
            </div>
            <div className="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
              <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {statistics.last_7_days}
              </p>
              <p className="text-xs text-neutral-500">{t('facebook.statLast7Days')}</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === ''
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 dark:bg-dark-bg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-dark-border'
            }`}
          >
            {t('facebook.filterAll')}
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === 'published'
                ? 'bg-emerald-500 text-white'
                : 'bg-neutral-100 dark:bg-dark-bg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-dark-border'
            }`}
          >
            {t('facebook.filterPublished')}
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white'
                : 'bg-neutral-100 dark:bg-dark-bg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-dark-border'
            }`}
          >
            {t('facebook.filterPending')}
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === 'failed'
                ? 'bg-red-500 text-white'
                : 'bg-neutral-100 dark:bg-dark-bg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-dark-border'
            }`}
          >
            {t('facebook.filterFailed')}
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="divide-y divide-neutral-200 dark:divide-dark-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : !postsData?.posts?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Facebook className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-neutral-500">{t('facebook.noPosts')}</p>
          </div>
        ) : (
          postsData.posts.map((post) => (
            <div key={post.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-dark-bg/50 transition-colors">
              <div className="flex items-start gap-4">
                {/* Listing Image */}
                <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100 dark:bg-dark-bg">
                  {post.listing?.photo_principale_url ? (
                    <Image
                      src={post.listing.photo_principale_url}
                      alt={post.listing.titre}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Facebook className="w-6 h-6 text-neutral-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-neutral-900 dark:text-white truncate">
                        {post.listing?.titre || t('facebook.unknownListing')}
                      </h3>
                      <p className="text-sm text-neutral-500">
                        {post.listing ? formatPrice(post.listing.prix) : '-'}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(post.status)}`}>
                      {getStatusIcon(post.status)}
                      {getStatusLabel(post.status)}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                    {post.published_at && (
                      <span>{t('facebook.publishedAt')}: {formatDate(post.published_at)}</span>
                    )}
                    {post.status === 'failed' && post.error_message && (
                      <span className="flex items-center gap-1 text-red-500">
                        <AlertTriangle className="w-3 h-3" />
                        {post.error_message}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    {post.post_url && post.status === 'published' && (
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1877F2] bg-[#1877F2]/10 hover:bg-[#1877F2]/20 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t('facebook.viewPost')}
                      </a>
                    )}
                    {post.status === 'published' && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleDelete(post.listing_id)}
                        disabled={deletingId === post.listing_id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingId === post.listing_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        {t('facebook.deletePost')}
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {postsData?.pagination && postsData.pagination.last_page > 1 && (
        <div className="p-4 border-t border-neutral-200 dark:border-dark-border flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            {t('facebook.pagination', {
              from: ((postsData.pagination.current_page - 1) * postsData.pagination.per_page) + 1,
              to: Math.min(postsData.pagination.current_page * postsData.pagination.per_page, postsData.pagination.total),
              total: postsData.pagination.total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-neutral-200 dark:border-dark-border hover:bg-neutral-100 dark:hover:bg-dark-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {page} / {postsData.pagination.last_page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(postsData.pagination.last_page, p + 1))}
              disabled={page >= postsData.pagination.last_page}
              className="p-2 rounded-lg border border-neutral-200 dark:border-dark-border hover:bg-neutral-100 dark:hover:bg-dark-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
