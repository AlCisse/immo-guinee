/**
 * Centralized color definitions for ImmoGuinee platform
 * All colors used across the application should be defined here
 */

// Brand Colors — « Argile de Conakry » (aligned with tailwind.config.ts)
export const brand = {
  // Primary Terracotta — signature accent
  primary: {
    50: '#FCEEE8',
    100: '#F9D9CC',
    200: '#F2B49E',
    300: '#EA8E6E',
    400: '#E26E48',
    500: '#DB5327',
    600: '#B84420',
    700: '#94371B',
    800: '#6F2915',
    900: '#4B1C0F',
  },
  // Teal — support hue (confiance, catégories, données)
  secondary: {
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
  // Accent Green — location, prix, disponible
  accent: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
};

// Status Colors — mapped to the « Argile de Conakry » charte tokens (success/warning/
// error/neutral/secondary=teal), with dark-mode variants. Semantic mapping:
// green→success, yellow/orange→warning, blue/purple→secondary (teal), gray→neutral,
// red→error.
const SUCCESS = { bg: 'bg-success-100 dark:bg-success-500/15', text: 'text-success-700 dark:text-success-300', class: 'bg-success-100 dark:bg-success-500/15 text-success-700 dark:text-success-300' };
const WARNING = { bg: 'bg-warning-100 dark:bg-warning-500/15', text: 'text-warning-700 dark:text-warning-300', class: 'bg-warning-100 dark:bg-warning-500/15 text-warning-700 dark:text-warning-300' };
const ERROR = { bg: 'bg-error-100 dark:bg-error-500/15', text: 'text-error-700 dark:text-error-400', class: 'bg-error-100 dark:bg-error-500/15 text-error-700 dark:text-error-400' };
const NEUTRAL = { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-700 dark:text-neutral-300', class: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300' };
const TEAL = { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', class: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' };
const CLAY = { bg: 'bg-primary-100 dark:bg-primary-500/15', text: 'text-primary-700 dark:text-primary-300', class: 'bg-primary-100 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300' };

export const statusColors: Record<string, { bg: string; text: string; class: string }> = {
  // Listing statuses
  ACTIVE: SUCCESS,
  PUBLIE: SUCCESS,
  DISPONIBLE: SUCCESS,
  EN_ATTENTE: WARNING,
  SUSPENDU: WARNING,
  LOUEE: TEAL,
  ARCHIVEE: TEAL, // Same as LOUEE
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

// Badge tiers — charte mapping: bronze→primary(terracotta), argent→neutral,
// or→warning, platine/diamant→teal, ambassadeur→teal.
export const badgeColors: Record<string, { bg: string; text: string; class: string }> = {
  DEBUTANT: NEUTRAL,
  BRONZE: CLAY,
  ARGENT: NEUTRAL,
  OR: WARNING,
  PLATINE: TEAL,
  AMBASSADEUR: TEAL,
};

// Property Type Colors — kept varied but on-charte (teal / success / warning /
// neutral / primary). Purely categorical, no semantic meaning.
export const propertyTypeColors: Record<string, { bg: string; text: string; class: string }> = {
  APPARTEMENT: TEAL,
  MAISON: SUCCESS,
  STUDIO: TEAL,
  VILLA: WARNING,
  BUREAU: NEUTRAL,
  MAGASIN: CLAY,
  TERRAIN: SUCCESS,
};

// Helper functions
export function getStatusColor(status: string): string {
  return statusColors[status]?.class || NEUTRAL.class;
}

export function getBadgeColor(badge: string): string {
  return badgeColors[badge]?.class || NEUTRAL.class;
}

export function getPropertyTypeColor(type: string): string {
  return propertyTypeColors[type]?.class || NEUTRAL.class;
}

// Format functions
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 GNF';
  }
  return new Intl.NumberFormat('fr-GN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' GNF';
}

// Labels
export const statusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  PUBLIE: 'Publié',
  DISPONIBLE: 'Disponible',
  EN_ATTENTE: 'En attente',
  SUSPENDU: 'Suspendu',
  LOUEE: 'Louée',
  ARCHIVEE: 'Louée', // Properties are archived when contract is signed
  EXPIREE: 'Expirée',
  SIGNALE: 'Signalé',
  REJETE: 'Rejeté',
  SUPPRIME: 'Supprimé',
  ACTIF: 'Actif',
  EN_ATTENTE_BAILLEUR: 'En attente bailleur',
  EN_ATTENTE_LOCATAIRE: 'En attente locataire',
  SIGNE: 'Signé',
  TERMINE: 'Terminé',
  RESILIE: 'Résilié',
  EN_PREAVIS: 'En préavis',
  COMPLETE: 'Complété',
  EN_COURS: 'En cours',
  ECHOUE: 'Échoué',
  REMBOURSE: 'Remboursé',
  OUVERT: 'Ouvert',
  EN_MEDIATION: 'En médiation',
  RESOLU_AMIABLE: 'Résolu à l\'amiable',
  RESOLU_COMPENSATION: 'Résolu avec compensation',
  FERME: 'Fermé',
  BANNI: 'Banni',
  VERIFIE: 'Vérifié',
  NON_VERIFIE: 'Non vérifié',
  EXPIRE: 'Expiré',
  ANNULEE: 'Annulée',
};

export const badgeLabels: Record<string, string> = {
  DEBUTANT: 'Débutant',
  BRONZE: 'Bronze',
  ARGENT: 'Argent',
  OR: 'Or',
  PLATINE: 'Platine',
  AMBASSADEUR: 'Ambassadeur',
};

export const propertyTypeLabels: Record<string, string> = {
  APPARTEMENT: 'Appartement',
  MAISON: 'Maison',
  STUDIO: 'Studio',
  VILLA: 'Villa',
  BUREAU: 'Bureau',
  MAGASIN: 'Magasin',
  TERRAIN: 'Terrain',
};

export const roleLabels: Record<string, string> = {
  PARTICULIER: 'Particulier',
  PROPRIETAIRE: 'Propriétaire',
  AGENT: 'Agent immobilier',
  ADMIN: 'Administrateur',
  MODERATEUR: 'Modérateur',
};

// Type exports
export type StatusKey = keyof typeof statusColors;
export type BadgeKey = keyof typeof badgeColors;
export type PropertyTypeKey = keyof typeof propertyTypeColors;
