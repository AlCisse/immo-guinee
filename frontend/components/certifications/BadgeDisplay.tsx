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
        <circle cx="12" cy="12" r="10" fill="#CD7F32" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">B</text>
      </svg>
    ),
    gradient: 'from-amber-600 to-amber-800',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    discount: 0,
  },
  ARGENT: {
    label: 'Argent',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <circle cx="12" cy="12" r="10" fill="#C0C0C0" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">A</text>
      </svg>
    ),
    gradient: 'from-gray-400 to-gray-600',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    discount: 5,
  },
  OR: {
    label: 'Or',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <circle cx="12" cy="12" r="10" fill="#FFD700" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fill="#8B6914" fontWeight="bold">O</text>
      </svg>
    ),
    gradient: 'from-yellow-400 to-yellow-600',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    discount: 10,
  },
  DIAMANT: {
    label: 'Diamant',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <polygon points="12,2 22,9 12,22 2,9" fill="#B9F2FF" stroke="#00BFFF" strokeWidth="1" />
        <polygon points="12,2 17,9 12,16 7,9" fill="#00BFFF" opacity="0.7" />
      </svg>
    ),
    gradient: 'from-blue-400 to-cyan-500',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
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
            <span className={clsx('text-green-600 font-medium', sizeConfig.discount)}>
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
