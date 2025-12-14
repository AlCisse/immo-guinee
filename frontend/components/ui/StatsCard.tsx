'use client';

import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'purple' | 'pink';
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  className?: string;
}

const colorStyles = {
  primary: {
    bg: 'bg-gradient-to-br from-primary-500 to-primary-600',
    light: 'bg-primary-50 dark:bg-primary-500/10',
    text: 'text-primary-600 dark:text-primary-400',
    icon: 'text-primary-500',
  },
  secondary: {
    bg: 'bg-gradient-to-br from-secondary-500 to-secondary-600',
    light: 'bg-secondary-50 dark:bg-secondary-500/10',
    text: 'text-secondary-600 dark:text-secondary-400',
    icon: 'text-secondary-500',
  },
  success: {
    bg: 'bg-gradient-to-br from-success-500 to-success-600',
    light: 'bg-success-50 dark:bg-success-500/10',
    text: 'text-success-600 dark:text-success-400',
    icon: 'text-success-500',
  },
  warning: {
    bg: 'bg-gradient-to-br from-warning-500 to-warning-600',
    light: 'bg-warning-50 dark:bg-warning-500/10',
    text: 'text-warning-600 dark:text-warning-400',
    icon: 'text-warning-500',
  },
  error: {
    bg: 'bg-gradient-to-br from-error-500 to-error-600',
    light: 'bg-error-50 dark:bg-error-500/10',
    text: 'text-error-600 dark:text-error-400',
    icon: 'text-error-500',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    light: 'bg-purple-50 dark:bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    icon: 'text-purple-500',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-500 to-pink-600',
    light: 'bg-pink-50 dark:bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
    icon: 'text-pink-500',
  },
};

export default function StatsCard({
  title,
  value,
  change,
  changeLabel = '30 jours',
  icon: Icon,
  color = 'primary',
  trend,
  loading = false,
  className = '',
}: StatsCardProps) {
  const styles = colorStyles[color];
  const actualTrend = trend || (change ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : 'neutral');

  if (loading) {
    return (
      <div className={`bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24" />
            <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
          </div>
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-32 mb-2" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft hover:shadow-soft-lg transition-shadow duration-300 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-neutral-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
          </h3>
        </div>

        <div className={`p-3 rounded-xl ${styles.light}`}>
          <Icon className={`w-6 h-6 ${styles.icon}`} />
        </div>
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-2">
          <span className={`
            flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full
            ${actualTrend === 'up' ? 'bg-success-100 text-success-700 dark:bg-success-500/10 dark:text-success-400' : ''}
            ${actualTrend === 'down' ? 'bg-error-100 text-error-700 dark:bg-error-500/10 dark:text-error-400' : ''}
            ${actualTrend === 'neutral' ? 'bg-neutral-100 text-neutral-600 dark:bg-neutral-500/10 dark:text-neutral-400' : ''}
          `}>
            {actualTrend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
            {actualTrend === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
            {actualTrend === 'neutral' && <Minus className="w-3.5 h-3.5" />}
            {change > 0 ? '+' : ''}{change}%
          </span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {changeLabel}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// Colored Stats Card Variant
interface ColoredStatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'purple' | 'pink';
  className?: string;
}

export function ColoredStatsCard({
  title,
  value,
  change,
  color,
  className = '',
}: ColoredStatsCardProps) {
  const styles = colorStyles[color];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className={`${styles.bg} rounded-2xl p-6 shadow-lg ${className}`}
    >
      <p className="text-sm font-medium text-white/80 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-white mb-2">
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
      </h3>
      {change !== undefined && (
        <p className="text-sm text-white/70">
          {change > 0 ? '+' : ''}{change}% (30 jours)
        </p>
      )}
    </motion.div>
  );
}

// Mini Stats Card
interface MiniStatsCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}

export function MiniStatsCard({
  label,
  value,
  icon: Icon,
  className = '',
}: MiniStatsCardProps) {
  return (
    <div className={`flex items-center gap-3 p-4 bg-white dark:bg-dark-card rounded-xl ${className}`}>
      {Icon && (
        <div className="p-2 bg-primary-50 dark:bg-primary-500/10 rounded-lg">
          <Icon className="w-5 h-5 text-primary-500" />
        </div>
      )}
      <div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="text-lg font-semibold text-neutral-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
        </p>
      </div>
    </div>
  );
}
