// API Configuration
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100/api' // Local development
  : 'https://immoguinee.com/api'; // Production

export const APP_CONFIG = {
  name: 'ImmoGuinée',
  version: '1.0.0',
  currency: 'GNF',
  currencySymbol: 'GNF',
  defaultLocale: 'fr-GN',
  phonePrefix: '+224',
};

// Listing types
export const TRANSACTION_TYPES = {
  VENTE: 'VENTE',
  LOCATION: 'LOCATION',
} as const;

export const PROPERTY_TYPES = {
  APPARTEMENT: 'APPARTEMENT',
  MAISON: 'MAISON',
  TERRAIN: 'TERRAIN',
  BUREAU: 'BUREAU',
  MAGASIN: 'MAGASIN',
  ENTREPOT: 'ENTREPOT',
  IMMEUBLE: 'IMMEUBLE',
} as const;

export const LISTING_STATUS = {
  BROUILLON: 'BROUILLON',
  EN_ATTENTE: 'EN_ATTENTE',
  ACTIVE: 'ACTIVE',
  LOUEE: 'LOUEE',
  VENDUE: 'VENDUE',
  ARCHIVEE: 'ARCHIVEE',
} as const;

// Guinea regions
export const REGIONS = [
  'Conakry',
  'Kindia',
  'Boké',
  'Mamou',
  'Labé',
  'Faranah',
  'Kankan',
  'Nzérékoré',
] as const;

// Conakry communes
export const CONAKRY_COMMUNES = [
  'Kaloum',
  'Dixinn',
  'Matam',
  'Matoto',
  'Ratoma',
] as const;

// Colors matching the web app
export const COLORS = {
  primary: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316', // Main brand color
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};
