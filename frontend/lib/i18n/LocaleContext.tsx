'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { locales, defaultLocale, getLocaleFromCountry, type Locale } from './config';

// P8 — fr (locale par défaut) est importé statiquement pour un rendu synchrone
// dès le premier paint (pas de flash / clé manquante). en (seconde locale) est
// chargé à la demande via dynamic import : il vit dans un chunk séparé et
// n'entre dans le bundle client que si l'utilisateur bascule en anglais.
import fr from '../../messages/fr.json';
type Messages = typeof fr;

let enPromise: Promise<Messages> | null = null;
async function loadEn(): Promise<Messages> {
  if (!enPromise) {
    enPromise = import('../../messages/en.json').then((m) => m.default as Messages);
  }
  return enPromise;
}

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
  // P8 — messages EN chargés à la demande (null = non encore chargés → fallback fr).
  const [enMessages, setEnMessages] = useState<Messages | null>(null);

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
      // P8 — source EN si chargée, sinon fr (fallback synchrone le temps du load).
      const source = locale === 'en' && enMessages ? enMessages : fr;
      const translation = getNestedValue(source as unknown as Record<string, unknown>, key);

      if (!translation) {
        // Fallback to default locale (fr)
        const fallback = getNestedValue(fr as unknown as Record<string, unknown>, key);
        if (fallback) {
          return replaceParams(fallback, params);
        }
        console.warn(`Translation missing for key: ${key}`);
        return key;
      }

      return replaceParams(translation, params);
    },
    [locale, enMessages]
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

  // P8 — charge en.json (chunk séparé) à la demande dès que l'utilisateur bascule
  // en anglais (sélection manuelle ou détection pays). La promesse est mise en
  // cache au niveau module (enPromise) pour ne charger le chunk qu'une fois.
  useEffect(() => {
    if (locale === 'en' && enMessages === null) {
      loadEn().then((m) => setEnMessages(m));
    }
  }, [locale, enMessages]);

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      messages: locale === 'en' && enMessages ? enMessages : fr,
    }),
    [locale, setLocale, t, enMessages]
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
