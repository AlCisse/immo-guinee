// T236: i18n configuration for Next.js
// Supports French and Arabic for diaspora users (FR-092)

export type Locale = 'fr' | 'ar' | 'en';

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  flag: string;
  dateFormat: string;
  timeFormat: string;
  currencyFormat: string;
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  {
    code: 'fr',
    name: 'Français',
    nativeName: 'Français',
    direction: 'ltr',
    flag: '🇫🇷',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    currencyFormat: '# ### GNF',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    flag: '🇸🇦',
    dateFormat: 'yyyy/MM/dd',
    timeFormat: 'HH:mm',
    currencyFormat: 'GNF # ###',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    flag: '🇬🇧',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'h:mm a',
    currencyFormat: 'GNF #,###',
  },
];

export const DEFAULT_LOCALE: Locale = 'fr';

export function getLocaleConfig(locale: Locale): LocaleConfig {
  return SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];
}

export function isRTL(locale: Locale): boolean {
  return getLocaleConfig(locale).direction === 'rtl';
}

// Common timezones for Guinean diaspora
export const COMMON_TIMEZONES = [
  { value: 'Africa/Conakry', label: 'Conakry (GMT)', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Paris (CET)', offset: '+01:00' },
  { value: 'America/New_York', label: 'New York (EST)', offset: '-05:00' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)', offset: '-08:00' },
  { value: 'Asia/Dubai', label: 'Dubaï (GST)', offset: '+04:00' },
  { value: 'Africa/Dakar', label: 'Dakar (GMT)', offset: '+00:00' },
  { value: 'Africa/Abidjan', label: 'Abidjan (GMT)', offset: '+00:00' },
  { value: 'Europe/London', label: 'Londres (GMT)', offset: '+00:00' },
  { value: 'Europe/Brussels', label: 'Bruxelles (CET)', offset: '+01:00' },
  { value: 'America/Montreal', label: 'Montréal (EST)', offset: '-05:00' },
];

export function getTimezoneLabel(timezone: string): string {
  const tz = COMMON_TIMEZONES.find((t) => t.value === timezone);
  return tz?.label || timezone;
}
