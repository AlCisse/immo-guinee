'use client';

import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { Locale, SUPPORTED_LOCALES, getLocaleConfig } from '@/lib/i18n/config';

// T239: Language Selector component for diaspora users

interface LanguageSelectorProps {
  currentLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
  variant?: 'dropdown' | 'buttons' | 'compact';
  showNativeName?: boolean;
  className?: string;
}

export default function LanguageSelector({
  currentLocale,
  onLocaleChange,
  variant = 'dropdown',
  showNativeName = true,
  className,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentConfig = getLocaleConfig(currentLocale);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  if (variant === 'buttons') {
    return (
      <div className={clsx('flex gap-2', className)}>
        {SUPPORTED_LOCALES.map((locale) => (
          <button
            key={locale.code}
            onClick={() => onLocaleChange(locale.code)}
            className={clsx(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              currentLocale === locale.code
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
            title={locale.nativeName}
          >
            <span className="mr-1">{locale.flag}</span>
            {showNativeName ? locale.nativeName : locale.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div ref={dropdownRef} className={clsx('relative inline-block', className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span>{currentConfig.flag}</span>
          <span className="hidden sm:inline">{currentLocale.toUpperCase()}</span>
          <svg
            className={clsx('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {SUPPORTED_LOCALES.map((locale) => (
              <button
                key={locale.code}
                onClick={() => {
                  onLocaleChange(locale.code);
                  setIsOpen(false);
                }}
                className={clsx(
                  'w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50',
                  currentLocale === locale.code && 'bg-blue-50 text-blue-600'
                )}
              >
                <span>{locale.flag}</span>
                <span>{locale.nativeName}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div ref={dropdownRef} className={clsx('relative', className)}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Langue / اللغة
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-xl hover:border-gray-400 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{currentConfig.flag}</span>
          <div className="text-left">
            <div className="font-medium text-gray-900">{currentConfig.nativeName}</div>
            <div className="text-sm text-gray-500">{currentConfig.name}</div>
          </div>
        </div>
        <svg
          className={clsx('w-5 h-5 text-gray-400 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          {SUPPORTED_LOCALES.map((locale) => (
            <button
              key={locale.code}
              onClick={() => {
                onLocaleChange(locale.code);
                setIsOpen(false);
              }}
              className={clsx(
                'w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors',
                currentLocale === locale.code && 'bg-blue-50'
              )}
            >
              <span className="text-xl">{locale.flag}</span>
              <div>
                <div
                  className={clsx(
                    'font-medium',
                    currentLocale === locale.code ? 'text-blue-600' : 'text-gray-900'
                  )}
                >
                  {locale.nativeName}
                </div>
                <div className="text-sm text-gray-500">{locale.name}</div>
              </div>
              {currentLocale === locale.code && (
                <svg
                  className="w-5 h-5 text-blue-600 ml-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact version for headers/navbars
export function LanguageSelectorCompact({
  currentLocale,
  onLocaleChange,
  className,
}: Omit<LanguageSelectorProps, 'variant' | 'showNativeName'>) {
  return (
    <LanguageSelector
      currentLocale={currentLocale}
      onLocaleChange={onLocaleChange}
      variant="compact"
      className={className}
    />
  );
}
