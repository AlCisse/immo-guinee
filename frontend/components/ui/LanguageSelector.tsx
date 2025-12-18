'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useLocale } from '@/lib/i18n';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/config';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'buttons' | 'compact' | 'navbar';
  showNativeName?: boolean;
  className?: string;
}

export default function LanguageSelector({
  variant = 'dropdown',
  showNativeName = true,
  className,
}: LanguageSelectorProps) {
  const { locale, setLocale, t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentConfig = SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSelect = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  // Navbar variant - globe icon with dropdown
  if (variant === 'navbar') {
    return (
      <div ref={dropdownRef} className={clsx('relative', className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-dark-bg transition-colors"
          aria-label={t('language.select')}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <Globe className="w-5 h-5 text-neutral-700 dark:text-white" />
        </button>

        {isOpen && (
          <div
            className="absolute right-0 top-12 w-48 bg-white dark:bg-dark-card rounded-xl shadow-2xl py-2 z-50 border border-neutral-200 dark:border-dark-border"
            role="listbox"
            aria-label={t('language.select')}
          >
            <div className="px-3 py-2 border-b border-neutral-100 dark:border-dark-border">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                {t('language.select')}
              </p>
            </div>

            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc.code}
                onClick={() => handleSelect(loc.code)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors',
                  locale === loc.code ? 'bg-primary-50 dark:bg-primary-500/10' : ''
                )}
                role="option"
                aria-selected={locale === loc.code}
              >
                <span className="text-lg">{loc.flag}</span>
                <span
                  className={clsx(
                    'flex-1 text-left text-sm',
                    locale === loc.code
                      ? 'font-semibold text-primary-600 dark:text-primary-400'
                      : 'text-neutral-700 dark:text-neutral-300'
                  )}
                >
                  {loc.nativeName}
                </span>
                {locale === loc.code && <Check className="w-4 h-4 text-primary-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className={clsx('flex gap-2 flex-wrap', className)}>
        {SUPPORTED_LOCALES.map((loc) => (
          <button
            key={loc.code}
            onClick={() => handleSelect(loc.code)}
            className={clsx(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              locale === loc.code
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 dark:bg-dark-bg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-dark-hover'
            )}
            title={loc.nativeName}
          >
            <span className="mr-1">{loc.flag}</span>
            {showNativeName ? loc.nativeName : loc.code.toUpperCase()}
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
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium bg-neutral-100 dark:bg-dark-bg hover:bg-neutral-200 dark:hover:bg-dark-hover transition-colors text-neutral-700 dark:text-neutral-300"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span>{currentConfig.flag}</span>
          <span className="hidden sm:inline">{locale.toUpperCase()}</span>
          <ChevronDown
            className={clsx('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-neutral-200 dark:border-dark-border py-1 z-50">
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc.code}
                onClick={() => handleSelect(loc.code)}
                className={clsx(
                  'w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-neutral-50 dark:hover:bg-dark-hover',
                  locale === loc.code && 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                )}
              >
                <span>{loc.flag}</span>
                <span>{loc.nativeName}</span>
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
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        {t('settings.language')}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-dark-card border border-neutral-300 dark:border-dark-border rounded-xl hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{currentConfig.flag}</span>
          <div className="text-left">
            <div className="font-medium text-neutral-900 dark:text-white">{currentConfig.nativeName}</div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">{currentConfig.name}</div>
          </div>
        </div>
        <ChevronDown
          className={clsx('w-5 h-5 text-neutral-400 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="absolute w-full mt-2 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-neutral-200 dark:border-dark-border py-2 z-50">
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc.code}
              onClick={() => handleSelect(loc.code)}
              className={clsx(
                'w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors',
                locale === loc.code && 'bg-primary-50 dark:bg-primary-500/10'
              )}
            >
              <span className="text-xl">{loc.flag}</span>
              <div className="flex-1">
                <div
                  className={clsx(
                    'font-medium',
                    locale === loc.code ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-900 dark:text-white'
                  )}
                >
                  {loc.nativeName}
                </div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">{loc.name}</div>
              </div>
              {locale === loc.code && (
                <Check className="w-5 h-5 text-primary-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact version for headers/navbars
export function LanguageSelectorCompact({ className }: { className?: string }) {
  return <LanguageSelector variant="compact" className={className} />;
}

// Navbar version with globe icon
export function LanguageSelectorNavbar({ className }: { className?: string }) {
  return <LanguageSelector variant="navbar" className={className} />;
}
