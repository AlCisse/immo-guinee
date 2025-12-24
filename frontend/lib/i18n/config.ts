// i18n configuration for Next.js with next-intl
// Supports French (default) and English

export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

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
    name: 'French',
    nativeName: 'Francais',
    direction: 'ltr',
    flag: '🇬🇳',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    currencyFormat: '# ### GNF',
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

export const localeNames: Record<Locale, string> = {
  fr: 'Francais',
  en: 'English',
};

export const localeFlags: Record<Locale, string> = {
  fr: '🇬🇳',
  en: '🇬🇧',
};

export function getLocaleConfig(locale: Locale): LocaleConfig {
  return SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];
}

export function isRTL(locale: Locale): boolean {
  return getLocaleConfig(locale).direction === 'rtl';
}

// Country code to locale mapping for automatic detection
export const countryToLocale: Record<string, Locale> = {
  // French-speaking countries
  FR: 'fr',
  GN: 'fr', // Guinea
  SN: 'fr', // Senegal
  CI: 'fr', // Ivory Coast
  ML: 'fr', // Mali
  BF: 'fr', // Burkina Faso
  NE: 'fr', // Niger
  TG: 'fr', // Togo
  BJ: 'fr', // Benin
  CM: 'fr', // Cameroon
  GA: 'fr', // Gabon
  CG: 'fr', // Congo
  CD: 'fr', // DRC
  MG: 'fr', // Madagascar
  BE: 'fr', // Belgium
  CH: 'fr', // Switzerland
  CA: 'fr', // Canada
  MC: 'fr', // Monaco
  LU: 'fr', // Luxembourg
  HT: 'fr', // Haiti

  // English-speaking countries
  US: 'en',
  GB: 'en',
  AU: 'en',
  NZ: 'en',
  IE: 'en',
  ZA: 'en',
  NG: 'en', // Nigeria
  GH: 'en', // Ghana
  KE: 'en', // Kenya
  UG: 'en', // Uganda
  TZ: 'en', // Tanzania
  ZW: 'en', // Zimbabwe
  IN: 'en', // India
  PK: 'en', // Pakistan
  PH: 'en', // Philippines
  SG: 'en', // Singapore
  MY: 'en', // Malaysia
  JM: 'en', // Jamaica
};

export function getLocaleFromCountry(countryCode: string): Locale {
  return countryToLocale[countryCode.toUpperCase()] || defaultLocale;
}

// Common timezones for Guinean diaspora
export const COMMON_TIMEZONES = [
  { value: 'Africa/Conakry', label: 'Conakry (GMT)', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Paris (CET)', offset: '+01:00' },
  { value: 'America/New_York', label: 'New York (EST)', offset: '-05:00' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)', offset: '-08:00' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00' },
  { value: 'Africa/Dakar', label: 'Dakar (GMT)', offset: '+00:00' },
  { value: 'Africa/Abidjan', label: 'Abidjan (GMT)', offset: '+00:00' },
  { value: 'Europe/London', label: 'London (GMT)', offset: '+00:00' },
  { value: 'Europe/Brussels', label: 'Brussels (CET)', offset: '+01:00' },
  { value: 'America/Montreal', label: 'Montreal (EST)', offset: '-05:00' },
];

export function getTimezoneLabel(timezone: string): string {
  const tz = COMMON_TIMEZONES.find((t) => t.value === timezone);
  return tz?.label || timezone;
}
