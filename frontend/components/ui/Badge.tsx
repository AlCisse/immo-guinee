import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'premium' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
      primary: 'bg-primary-100 text-primary-800 dark:bg-primary-500/15 dark:text-primary-300',
      secondary: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-500/15 dark:text-secondary-300',
      success: 'bg-success-100 text-success-800 dark:bg-success-500/15 dark:text-success-300',
      warning: 'bg-warning-100 text-warning-800 dark:bg-warning-500/15 dark:text-warning-300',
      danger: 'bg-error-100 text-error-800 dark:bg-error-500/15 dark:text-error-300',
      // U1 — badge « premium » : dégradé warning centralisé ici (source unique de
      // vérité). Avant, ce dégradé était dupliqué en dur dans les cartes (recherche
      // ×2). Modifier la charte premium maintenant se fait en un seul endroit.
      premium: 'bg-gradient-to-r from-warning-400 to-warning-500 text-white',
      outline: 'bg-transparent border border-neutral-300 text-neutral-700 dark:border-dark-border dark:text-neutral-300',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-sm',
      lg: 'px-3 py-1 text-sm',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium rounded-full',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
