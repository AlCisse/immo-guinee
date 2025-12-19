'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  Locale,
  defaultLocale,
  locales,
  getLocaleConfig,
  isRTL,
  COMMON_TIMEZONES,
} from '@/lib/i18n/config';

// T240: useLocale hook for i18n support

// Import translations dynamically
type Translations = Record<string, Record<string, string | Record<string, string>>>;

const translationsCache: Partial<Record<Locale, Translations | null>> = {};

async function loadTranslations(locale: Locale): Promise<Translations> {
  if (translationsCache[locale]) {
    return translationsCache[locale]!;
  }

  try {
    const response = await fetch(`/locales/${locale}.json`);
    const translations = await response.json();
    translationsCache[locale] = translations;
    return translations;
  } catch (error) {
    console.error(`Failed to load translations for ${locale}:`, error);
    // Fallback to French
    if (locale !== 'fr' && translationsCache['fr']) {
      return translationsCache['fr'];
    }
    return {};
  }
}

// Update user locale preference on server
async function updateUserLocale(locale: Locale): Promise<void> {
  await apiClient.patch('/auth/me/locale', { locale });
}

// Update user timezone on server
async function updateUserTimezone(timezone: string): Promise<void> {
  await apiClient.patch('/auth/me/timezone', { timezone });
}

interface UseLocaleReturn {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  dir: 'ltr' | 'rtl';
  isLoading: boolean;
  timezone: string;
  setTimezone: (timezone: string) => void;
  formatDate: (date: Date | string, format?: 'short' | 'long' | 'relative') => string;
  formatMoney: (amount: number) => string;
}

export function useLocale(): UseLocaleReturn {
  const queryClient = useQueryClient();

  // Get initial locale from localStorage or browser preference
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('locale') as Locale;
      if (stored && (locales as readonly string[]).includes(stored)) {
        return stored;
      }

      // Detect from browser
      const browserLang = navigator.language.split('-')[0] as Locale;
      if ((locales as readonly string[]).includes(browserLang)) {
        return browserLang;
      }
    }
    return defaultLocale;
  });

  const [timezone, setTimezoneState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return 'Africa/Conakry';
  });

  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations on mount and locale change
  useEffect(() => {
    setIsLoading(true);
    loadTranslations(locale).then((t) => {
      setTranslations(t);
      setIsLoading(false);
    });
  }, [locale]);

  // Update document direction and lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const config = getLocaleConfig(locale);
      document.documentElement.lang = locale;
      document.documentElement.dir = config.direction;
    }
  }, [locale]);

  // Mutation to sync locale with server
  const localeMutation = useMutation({
    mutationFn: updateUserLocale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const timezoneMutation = useMutation({
    mutationFn: updateUserTimezone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // Set locale and persist
  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      if (typeof window !== 'undefined') {
        localStorage.setItem('locale', newLocale);
      }
      // Sync with server if authenticated
      localeMutation.mutate(newLocale);
    },
    [localeMutation]
  );

  // Set timezone and persist
  const setTimezone = useCallback(
    (newTimezone: string) => {
      setTimezoneState(newTimezone);
      if (typeof window !== 'undefined') {
        localStorage.setItem('timezone', newTimezone);
      }
      timezoneMutation.mutate(newTimezone);
    },
    [timezoneMutation]
  );

  // Translation function with interpolation
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let value: unknown = translations;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          // Key not found, return the key itself
          return key;
        }
      }

      if (typeof value !== 'string') {
        return key;
      }

      // Interpolate params
      if (params) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
          return params[paramKey]?.toString() || `{{${paramKey}}}`;
        });
      }

      return value;
    },
    [translations]
  );

  // Format date according to locale
  const formatDate = useCallback(
    (date: Date | string, format: 'short' | 'long' | 'relative' = 'short'): string => {
      const d = typeof date === 'string' ? new Date(date) : date;

      if (format === 'relative') {
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          if (diffHours === 0) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            if (diffMinutes < 1) return locale === 'ar' ? 'الآن' : "À l'instant";
            return locale === 'ar' ? `منذ ${diffMinutes} دقيقة` : `Il y a ${diffMinutes} min`;
          }
          return locale === 'ar' ? `منذ ${diffHours} ساعة` : `Il y a ${diffHours}h`;
        }
        if (diffDays === 1) return locale === 'ar' ? 'أمس' : 'Hier';
        if (diffDays < 7) return locale === 'ar' ? `منذ ${diffDays} أيام` : `Il y a ${diffDays} jours`;
      }

      const options: Intl.DateTimeFormatOptions =
        format === 'long'
          ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
          : { year: 'numeric', month: '2-digit', day: '2-digit' };

      return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-GB' : 'fr-FR', {
        ...options,
        timeZone: timezone,
      });
    },
    [locale, timezone]
  );

  // Format money according to locale
  const formatMoney = useCallback(
    (amount: number): string => {
      const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-GB' : 'fr-FR', {
        style: 'decimal',
        maximumFractionDigits: 0,
      }).format(amount);

      return locale === 'ar' ? `${formatted} GNF` : `${formatted} GNF`;
    },
    [locale]
  );

  return {
    locale,
    setLocale,
    t,
    isRTL: isRTL(locale),
    dir: getLocaleConfig(locale).direction,
    isLoading,
    timezone,
    setTimezone,
    formatDate,
    formatMoney,
  };
}

// Provider component for locale context
import { createContext, useContext, ReactNode } from 'react';

type LocaleContextType = UseLocaleReturn;

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const localeValue = useLocale();

  return <LocaleContext.Provider value={localeValue}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocaleContext must be used within a LocaleProvider');
  }
  return context;
}

// Timezone selector hook
export function useTimezones() {
  return {
    timezones: COMMON_TIMEZONES,
    detectTimezone: () => {
      if (typeof Intl !== 'undefined') {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      }
      return 'Africa/Conakry';
    },
  };
}
