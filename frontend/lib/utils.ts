import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for merging Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for proper class merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Shared input styles - consistent across all form inputs
 */
export const inputStyles = {
  // text-base (16px) prevents iOS auto-zoom on input focus
  base: 'w-full py-3 bg-white dark:bg-dark-card rounded-xl ring-1 ring-gray-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary-400 focus:outline-none transition-all text-base text-neutral-900 dark:text-white placeholder-gray-400',
  withIcon: 'pl-10 sm:pl-11 pr-3 sm:pr-4',
  withIconRight: 'pl-10 sm:pl-11 pr-10 sm:pr-12',
  error: 'ring-red-300 focus:ring-red-400',
};

/**
 * Format currency in GNF (Guinean Franc)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date in French locale
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-GN', {
    dateStyle: 'long',
    ...options,
  }).format(dateObj);
}

/**
 * Format relative time (e.g., "il y a 2 heures")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  }
  if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  }
  if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  }
  if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  }
  if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  }
  return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Validate Guinean phone number format
 */
export function isValidGuineanPhone(phone: string): boolean {
  // Formats: +224XXXXXXXXX, 224XXXXXXXXX, 6XXXXXXXX, 0XXXXXXXX
  const cleanPhone = phone.replace(/[\s-]/g, '');
  const patterns = [
    /^\+224[6][0-9]{8}$/, // +224 6XX XX XX XX
    /^224[6][0-9]{8}$/, // 224 6XX XX XX XX
    /^[6][0-9]{8}$/, // 6XX XX XX XX
    /^0[6][0-9]{8}$/, // 06XX XX XX XX
  ];
  return patterns.some((pattern) => pattern.test(cleanPhone));
}

/**
 * Format phone number for display
 * Handles both Guinea local numbers and international numbers
 */
export function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/[\s-+]/g, '');

  // Check if it's a Guinea number (starts with 224 or is a 9-digit local number)
  if (cleanPhone.startsWith('224')) {
    const localPart = cleanPhone.slice(3);
    if (localPart.length === 9) {
      return `+224 ${localPart.slice(0, 3)} ${localPart.slice(3, 5)} ${localPart.slice(5, 7)} ${localPart.slice(7, 9)}`;
    }
    return `+${cleanPhone}`;
  }

  // Local Guinea number (9 digits starting with 6 or 7)
  if (cleanPhone.length === 9 && ['6', '7'].includes(cleanPhone[0])) {
    return `+224 ${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 5)} ${cleanPhone.slice(5, 7)} ${cleanPhone.slice(7, 9)}`;
  }

  // International number - just add + prefix
  return `+${cleanPhone}`;
}
