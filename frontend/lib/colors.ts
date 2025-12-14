/**
 * Centralized color definitions for ImmoGuinee platform
 * All colors used across the application should be defined here
 */

// Brand Colors
export const brand = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  secondary: {
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
  accent: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },
};

// Status Colors with Tailwind classes
export const statusColors: Record<string, { bg: string; text: string; class: string }> = {
  // Listing statuses
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', class: 'bg-green-100 text-green-700' },
  PUBLIE: { bg: 'bg-green-100', text: 'text-green-700', class: 'bg-green-100 text-green-700' },
  DISPONIBLE: { bg: 'bg-green-100', text: 'text-green-700', class: 'bg-green-100 text-green-700' },
  EN_ATTENTE: { bg: 'bg-yellow-100', text: 'text-yellow-700', class: 'bg-yellow-100 text-yellow-700' },
  SUSPENDU: { bg: 'bg-orange-100', text: 'text-orange-700', class: 'bg-orange-100 text-orange-700' },
  LOUEE: { bg: 'bg-blue-100', text: 'text-blue-700', class: 'bg-blue-100 text-blue-700' },
  ARCHIVEE: { bg: 'bg-blue-100', text: 'text-blue-700', class: 'bg-blue-100 text-blue-700' }, // Same as LOUEE
  EXPIREE: { bg: 'bg-gray-100', text: 'text-gray-700', class: 'bg-gray-100 text-gray-700' },
  SIGNALE: { bg: 'bg-red-100', text: 'text-red-700', class: 'bg-red-100 text-red-700' },
  REJETE: { bg: 'bg-red-100', text: 'text-red-700', class: 'bg-red-100 text-red-700' },
  SUPPRIME: { bg: 'bg-gray-100', text: 'text-gray-700', class: 'bg-gray-100 text-gray-700' },

  // Contract statuses
  ACTIF: { bg: 'bg-green-100', text: 'text-green-700', class: 'bg-green-100 text-green-700' },
  EN_ATTENTE_BAILLEUR: { bg: 'bg-yellow-100', text: 'text-yellow-700', class: 'bg-yellow-100 text-yellow-700' },
  EN_ATTENTE_LOCATAIRE: { bg: 'bg-yellow-100', text: 'text-yellow-700', class: 'bg-yellow-100 text-yellow-700' },
  SIGNE: { bg: 'bg-blue-100', text: 'text-blue-700', class: 'bg-blue-100 text-blue-700' },
  TERMINE: { bg: 'bg-gray-100', text: 'text-gray-700', class: 'bg-gray-100 text-gray-700' },
  RESILIE: { bg: 'bg-red-100', text: 'text-red-700', class: 'bg-red-100 text-red-700' },
  EN_PREAVIS: { bg: 'bg-orange-100', text: 'text-orange-700', class: 'bg-orange-100 text-orange-700' },

  // Payment statuses
  COMPLETE: { bg: 'bg-green-100', text: 'text-green-700', class: 'bg-green-100 text-green-700' },
  EN_COURS: { bg: 'bg-blue-100', text: 'text-blue-700', class: 'bg-blue-100 text-blue-700' },
  ECHOUE: { bg: 'bg-red-100', text: 'text-red-700', class: 'bg-red-100 text-red-700' },
  REMBOURSE: { bg: 'bg-purple-100', text: 'text-purple-700', class: 'bg-purple-100 text-purple-700' },

  // Dispute statuses
  OUVERT: { bg: 'bg-red-100', text: 'text-red-700', class: 'bg-red-100 text-red-700' },
  EN_MEDIATION: { bg: 'bg-blue-100', text: 'text-blue-700', class: 'bg-blue-100 text-blue-700' },
  RESOLU_AMIABLE: { bg: 'bg-green-100', text: 'text-green-700', class: 'bg-green-100 text-green-700' },
  RESOLU_COMPENSATION: { bg: 'bg-green-100', text: 'text-green-700', class: 'bg-green-100 text-green-700' },
  FERME: { bg: 'bg-gray-100', text: 'text-gray-700', class: 'bg-gray-100 text-gray-700' },

  // User account statuses
  BANNI: { bg: 'bg-red-100', text: 'text-red-700', class: 'bg-red-100 text-red-700' },

  // Verification statuses
  VERIFIE: { bg: 'bg-green-100', text: 'text-green-700', class: 'bg-green-100 text-green-700' },
  NON_VERIFIE: { bg: 'bg-gray-100', text: 'text-gray-700', class: 'bg-gray-100 text-gray-700' },
  EXPIRE: { bg: 'bg-gray-100', text: 'text-gray-700', class: 'bg-gray-100 text-gray-700' },

  // Insurance statuses
  RECLAMATION_EN_COURS: { bg: 'bg-orange-100', text: 'text-orange-700', class: 'bg-orange-100 text-orange-700' },
  ANNULEE: { bg: 'bg-red-100', text: 'text-red-700', class: 'bg-red-100 text-red-700' },
};

// Badge Colors
export const badgeColors: Record<string, { bg: string; text: string; class: string }> = {
  DEBUTANT: { bg: 'bg-gray-100', text: 'text-gray-700', class: 'bg-gray-100 text-gray-700' },
  BRONZE: { bg: 'bg-amber-100', text: 'text-amber-700', class: 'bg-amber-100 text-amber-700' },
  ARGENT: { bg: 'bg-slate-200', text: 'text-slate-700', class: 'bg-slate-200 text-slate-700' },
  OR: { bg: 'bg-yellow-100', text: 'text-yellow-700', class: 'bg-yellow-100 text-yellow-700' },
  PLATINE: { bg: 'bg-purple-100', text: 'text-purple-700', class: 'bg-purple-100 text-purple-700' },
  AMBASSADEUR: { bg: 'bg-blue-100', text: 'text-blue-700', class: 'bg-blue-100 text-blue-700' },
};

// Property Type Colors
export const propertyTypeColors: Record<string, { bg: string; text: string; class: string }> = {
  APPARTEMENT: { bg: 'bg-blue-100', text: 'text-blue-700', class: 'bg-blue-100 text-blue-700' },
  MAISON: { bg: 'bg-green-100', text: 'text-green-700', class: 'bg-green-100 text-green-700' },
  STUDIO: { bg: 'bg-purple-100', text: 'text-purple-700', class: 'bg-purple-100 text-purple-700' },
  VILLA: { bg: 'bg-amber-100', text: 'text-amber-700', class: 'bg-amber-100 text-amber-700' },
  BUREAU: { bg: 'bg-slate-100', text: 'text-slate-700', class: 'bg-slate-100 text-slate-700' },
  MAGASIN: { bg: 'bg-orange-100', text: 'text-orange-700', class: 'bg-orange-100 text-orange-700' },
  TERRAIN: { bg: 'bg-lime-100', text: 'text-lime-700', class: 'bg-lime-100 text-lime-700' },
};

// Helper functions
export function getStatusColor(status: string): string {
  return statusColors[status]?.class || 'bg-gray-100 text-gray-700';
}

export function getBadgeColor(badge: string): string {
  return badgeColors[badge]?.class || 'bg-gray-100 text-gray-700';
}

export function getPropertyTypeColor(type: string): string {
  return propertyTypeColors[type]?.class || 'bg-gray-100 text-gray-700';
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
