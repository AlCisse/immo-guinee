// Colors matching frontend web (tailwind.config.ts) — « Argile de Conakry » charte.
// Source of truth: frontend/tailwind.config.ts and frontend/lib/colors.ts.
// Keep scales and named exports stable — screens consume Colors.* / lightTheme / themeColors.

const Colors = {
  // Primary Terracotta — signature accent (was orange in v1; aligned to web 2026-07)
  primary: {
    50: '#FCEEE8',
    100: '#F9D9CC',
    200: '#F2B49E',
    300: '#EA8E6E',
    400: '#E26E48',
    500: '#DB5327', // Main terracotta
    600: '#B84420', // hover
    700: '#94371B',
    800: '#6F2915',
    900: '#4B1C0F',
    950: '#2A0F08',
  },
  // Secondary Blue - Trust & Professionalism (unchanged; web tailwind secondary is blue)
  secondary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e3a5f', // Dark blue for text
    900: '#1e3a8a',
    950: '#172554',
  },
  // Neutral — cool-biased grays (aligned to web; was default Tailwind gray)
  neutral: {
    50: '#F7F8FA',
    100: '#F2F4F7',
    200: '#E6E9EE',
    300: '#D7DCE3',
    400: '#A9B0BA',
    500: '#79808B',
    600: '#565D67',
    700: '#3D434C',
    800: '#262B32',
    900: '#171A1F',
    950: '#0C0E12',
  },
  // Teal — support hue (confiance, catégories, données) — NEW, aligned to web
  teal: {
    50: '#E4F0F2',
    100: '#C9E1E6',
    200: '#9DC7CF',
    300: '#6FA9B4',
    400: '#468B99',
    500: '#2C6E7D',
    600: '#235967',
    700: '#1B4551',
    800: '#14343D',
    900: '#0D2329',
  },
  // Accent Green - Location, Prix, Disponible
  accent: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981', // Main Emerald Green
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  // Success Green
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  // Warning Yellow
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  // Error Red
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  // Background
  background: {
    primary: '#ffffff',
    secondary: '#F7F8FA',
    tertiary: '#F2F4F7',
  },
  // Text
  text: {
    primary: '#171A1F', // neutral-900 (was blue #1e3a5f)
    secondary: '#565D67',
    tertiary: '#79808B',
    muted: '#A9B0BA',
    inverse: '#ffffff',
  },
  // Border
  border: {
    light: '#E6E9EE',
    default: '#D7DCE3',
    dark: '#A9B0BA',
  },
  // Dark mode (aligned to web dark tokens)
  dark: {
    bg: '#0C0E12',
    card: '#14171D',
    border: '#242A33',
    hover: '#1B1F27',
    text: '#F2F4F7',
    textSecondary: '#A9B0BA',
  },
};

// Theme configuration for light mode
export const lightTheme = {
  colors: {
    primary: Colors.primary[500],
    primaryLight: Colors.primary[100],
    primaryDark: Colors.primary[700],
    accent: Colors.accent[500],
    accentLight: Colors.accent[100],
    accentDark: Colors.accent[700],
    secondary: Colors.secondary[500],
    secondaryDark: Colors.secondary[800],
    background: Colors.background.primary,
    backgroundSecondary: Colors.background.secondary,
    card: Colors.background.primary,
    text: Colors.text.primary,
    textSecondary: Colors.text.secondary,
    textMuted: Colors.text.muted,
    border: Colors.border.light,
    success: Colors.success[500],
    warning: Colors.warning[500],
    error: Colors.error[500],
    tabBar: Colors.background.primary,
    tabBarInactive: Colors.neutral[400],
    tabBarActive: Colors.primary[500],
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    tabBar: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 10,
    },
  },
};

// Theme-based colors for Themed components
export const themeColors = {
  light: {
    text: Colors.text.primary,
    background: Colors.background.primary,
    tint: Colors.primary[500],
    tabIconDefault: Colors.neutral[400],
    tabIconSelected: Colors.primary[500],
  },
  dark: {
    text: Colors.dark.text,
    background: Colors.dark.bg,
    tint: Colors.primary[400],
    tabIconDefault: Colors.neutral[500],
    tabIconSelected: Colors.primary[400],
  },
};

// ---------------------------------------------------------------------------
// Centralized status / badge / property-type colors — mirrors frontend/lib/colors.ts,
// adapted for React Native (hex values instead of Tailwind classes).
// Charte mapping: green→success, yellow/orange→warning, blue/purple→secondary(teal),
// gray→neutral, red→error, bronze→primary(terracotta), or→warning, platine/diamant→teal.
// ---------------------------------------------------------------------------

type StatusPalette = { bg: string; text: string; border: string };

const SUCCESS: StatusPalette = {
  bg: Colors.success[100],
  text: Colors.success[700],
  border: Colors.success[200],
};
const WARNING: StatusPalette = {
  bg: Colors.warning[100],
  text: Colors.warning[700],
  border: Colors.warning[200],
};
const ERROR: StatusPalette = {
  bg: Colors.error[100],
  text: Colors.error[700],
  border: Colors.error[200],
};
const NEUTRAL: StatusPalette = {
  bg: Colors.neutral[100],
  text: Colors.neutral[700],
  border: Colors.neutral[200],
};
const TEAL: StatusPalette = {
  bg: Colors.teal[100],
  text: Colors.teal[700],
  border: Colors.teal[200],
};
const CLAY: StatusPalette = {
  bg: Colors.primary[100],
  text: Colors.primary[700],
  border: Colors.primary[200],
};

export const statusColors: Record<string, StatusPalette> = {
  // Listing statuses
  ACTIVE: SUCCESS,
  PUBLIE: SUCCESS,
  DISPONIBLE: SUCCESS,
  EN_ATTENTE: WARNING,
  SUSPENDU: WARNING,
  LOUEE: TEAL,
  ARCHIVEE: TEAL,
  EXPIREE: NEUTRAL,
  SIGNALE: ERROR,
  REJETE: ERROR,
  SUPPRIME: NEUTRAL,

  // Contract statuses
  ACTIF: SUCCESS,
  EN_ATTENTE_BAILLEUR: WARNING,
  EN_ATTENTE_LOCATAIRE: WARNING,
  SIGNE: TEAL,
  TERMINE: NEUTRAL,
  RESILIE: ERROR,
  EN_PREAVIS: WARNING,

  // Payment statuses
  COMPLETE: SUCCESS,
  EN_COURS: TEAL,
  ECHOUE: ERROR,
  REMBOURSE: TEAL,

  // Dispute statuses
  OUVERT: ERROR,
  EN_MEDIATION: TEAL,
  RESOLU_AMIABLE: SUCCESS,
  RESOLU_COMPENSATION: SUCCESS,
  FERME: NEUTRAL,

  // User account statuses
  BANNI: ERROR,

  // Verification statuses
  VERIFIE: SUCCESS,
  NON_VERIFIE: NEUTRAL,
  EXPIRE: NEUTRAL,

  // Insurance statuses
  RECLAMATION_EN_COURS: WARNING,
  ANNULEE: ERROR,
};

// Badge tiers — bronze→primary(terracotta), argent→neutral, or→warning,
// platine/diamant→teal, ambassadeur→teal.
export const badgeColors: Record<string, StatusPalette> = {
  DEBUTANT: NEUTRAL,
  BRONZE: CLAY,
  ARGENT: NEUTRAL,
  OR: WARNING,
  PLATINE: TEAL,
  DIAMANT: TEAL,
  AMBASSADEUR: TEAL,
};

// Property Type Colors — categorical, on-charte (teal/success/warning/neutral/primary).
export const propertyTypeColors: Record<string, StatusPalette> = {
  APPARTEMENT: TEAL,
  MAISON: SUCCESS,
  STUDIO: TEAL,
  VILLA: WARNING,
  BUREAU: NEUTRAL,
  MAGASIN: CLAY,
  TERRAIN: SUCCESS,
};

export function getStatusColor(status: string): StatusPalette {
  return statusColors[status] || NEUTRAL;
}

export function getBadgeColor(badge: string): StatusPalette {
  return badgeColors[badge] || NEUTRAL;
}

export function getPropertyTypeColor(type: string): StatusPalette {
  return propertyTypeColors[type] || NEUTRAL;
}

export default Colors;