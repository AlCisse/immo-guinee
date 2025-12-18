'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { locales, defaultLocale, getLocaleFromCountry, type Locale } from './config';

// Import all translation files
import fr from '../../messages/fr.json';
import en from '../../messages/en.json';
import es from '../../messages/es.json';
import de from '../../messages/de.json';
import zh from '../../messages/zh.json';

const messages: Record<Locale, typeof fr> = { fr, en, es, de, zh };

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  messages: typeof fr;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'immoguinee-locale';
const COUNTRY_DETECTED_KEY = 'immoguinee-country-detected';

// Get nested value from object by dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let result: unknown = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof result === 'string' ? result : undefined;
}

// Detect user's country via IP geolocation
async function detectCountry(): Promise<string | null> {
  try {
    // Use a free IP geolocation service
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      // Fallback to another service
      const fallbackResponse = await fetch('https://ip-api.com/json/?fields=countryCode');
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        return data.countryCode || null;
      }
      return null;
    }

    const data = await response.json();
    return data.country_code || data.country || null;
  } catch {
    console.warn('Failed to detect country, using default locale');
    return null;
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize locale from localStorage or detect from country
  useEffect(() => {
    async function initLocale() {
      // First, check if user has manually selected a locale
      const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (savedLocale && locales.includes(savedLocale as Locale)) {
        setLocaleState(savedLocale as Locale);
        setIsInitialized(true);
        return;
      }

      // Check if we've already detected the country before
      const alreadyDetected = localStorage.getItem(COUNTRY_DETECTED_KEY);
      if (alreadyDetected) {
        // Use browser language as fallback if country was already detected
        const browserLang = navigator.language.split('-')[0];
        if (locales.includes(browserLang as Locale)) {
          setLocaleState(browserLang as Locale);
        }
        setIsInitialized(true);
        return;
      }

      // Try to detect country from IP
      const countryCode = await detectCountry();
      localStorage.setItem(COUNTRY_DETECTED_KEY, 'true');

      if (countryCode) {
        const detectedLocale = getLocaleFromCountry(countryCode);
        setLocaleState(detectedLocale);
        // Don't save to localStorage - let user manually select to persist
      } else {
        // Fallback to browser language
        const browserLang = navigator.language.split('-')[0];
        if (locales.includes(browserLang as Locale)) {
          setLocaleState(browserLang as Locale);
        }
      }

      setIsInitialized(true);
    }

    initLocale();
  }, []);

  // Set locale and persist to localStorage
  const setLocale = useCallback((newLocale: Locale) => {
    if (locales.includes(newLocale)) {
      setLocaleState(newLocale);
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      // Update HTML lang attribute
      document.documentElement.lang = newLocale;
    }
  }, []);

  // Translation function
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const translation = getNestedValue(messages[locale] as unknown as Record<string, unknown>, key);

      if (!translation) {
        // Fallback to default locale
        const fallback = getNestedValue(messages[defaultLocale] as unknown as Record<string, unknown>, key);
        if (fallback) {
          return replaceParams(fallback, params);
        }
        console.warn(`Translation missing for key: ${key}`);
        return key;
      }

      return replaceParams(translation, params);
    },
    [locale]
  );

  // Replace {param} placeholders with values
  function replaceParams(text: string, params?: Record<string, string | number>): string {
    if (!params) return text;

    return Object.entries(params).reduce((result, [key, value]) => {
      return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }, text);
  }

  // Update HTML lang attribute when locale changes
  useEffect(() => {
    if (isInitialized) {
      document.documentElement.lang = locale;
    }
  }, [locale, isInitialized]);

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      messages: messages[locale],
    }),
    [locale, setLocale, t]
  );

  return <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

export function useTranslations(namespace?: string) {
  const { t, locale, messages } = useLocale();

  const scopedT = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return t(fullKey, params);
    },
    [t, namespace]
  );

  return {
    t: scopedT,
    locale,
    messages,
  };
}
