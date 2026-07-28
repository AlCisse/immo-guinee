'use client';

import { clsx } from 'clsx';

interface BadgeDisplayProps {
  badge: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showDiscount?: boolean;
  className?: string;
}

// Badge configurations
const BADGE_CONFIG = {
  BRONZE: {
    label: 'Bronze',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <circle cx="12" cy="12" r="10" fill="#DB5327" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">B</text>
      </svg>
    ),
    gradient: 'from-primary-500 to-primary-700',
    textColor: 'text-primary-700',
    bgColor: 'bg-primary-100',
    borderColor: 'border-primary-300',
    discount: 0,
  },
  ARGENT: {
    label: 'Argent',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <circle cx="12" cy="12" r="10" fill="#A9B0BA" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">A</text>
      </svg>
    ),
    gradient: 'from-neutral-400 to-neutral-600',
    textColor: 'text-neutral-600 dark:text-neutral-400',
    bgColor: 'bg-neutral-100 dark:bg-dark-hover',
    borderColor: 'border-neutral-300 dark:border-dark-border',
    discount: 5,
  },
  OR: {
    label: 'Or',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <circle cx="12" cy="12" r="10" fill="#fbbf24" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fill="#92400e" fontWeight="bold">O</text>
      </svg>
    ),
    gradient: 'from-warning-400 to-warning-600',
    textColor: 'text-warning-700',
    bgColor: 'bg-warning-100',
    borderColor: 'border-warning-300',
    discount: 10,
  },
  DIAMANT: {
    label: 'Diamant',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <polygon points="12,2 22,9 12,22 2,9" fill="#9DC7CF" stroke="#2C6E7D" strokeWidth="1" />
        <polygon points="12,2 17,9 12,16 7,9" fill="#2C6E7D" opacity="0.7" />
      </svg>
    ),
    gradient: 'from-teal-400 to-teal-600',
    textColor: 'text-teal-700',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-300',
    discount: 15,
  },
};

// Size configurations
const SIZE_CONFIG = {
  sm: {
    container: 'h-6 w-6',
    text: 'text-xs',
    discount: 'text-xs',
    wrapper: 'gap-1',
  },
  md: {
    container: 'h-10 w-10',
    text: 'text-sm',
    discount: 'text-sm',
    wrapper: 'gap-2',
  },
  lg: {
    container: 'h-16 w-16',
    text: 'text-lg',
    discount: 'text-base',
    wrapper: 'gap-3',
  },
};

export default function BadgeDisplay({
  badge,
  size = 'md',
  showLabel = false,
  showDiscount = false,
  className,
}: BadgeDisplayProps) {
  const badgeConfig = BADGE_CONFIG[badge as keyof typeof BADGE_CONFIG] || BADGE_CONFIG.BRONZE;
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div className={clsx('flex items-center', sizeConfig.wrapper, className)}>
      {/* Badge icon */}
      <div
        className={clsx(
          'flex-shrink-0 rounded-full p-0.5 shadow-md',
          sizeConfig.container,
          `bg-gradient-to-br ${badgeConfig.gradient}`
        )}
        title={badgeConfig.label}
      >
        {badgeConfig.icon}
      </div>

      {/* Label and discount */}
      {(showLabel || showDiscount) && (
        <div className="flex flex-col">
          {showLabel && (
            <span className={clsx('font-semibold', sizeConfig.text, badgeConfig.textColor)}>
              {badgeConfig.label}
            </span>
          )}
          {showDiscount && badgeConfig.discount > 0 && (
            <span className={clsx('text-success-600 font-medium', sizeConfig.discount)}>
              -{badgeConfig.discount}% commission
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Export as named export for use in other components
export { BADGE_CONFIG };
