import { APP_CONFIG } from '../constants/config';

/**
 * Format price in GNF
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-GN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price) + ' ' + APP_CONFIG.currencySymbol;
};

/**
 * Format price with period for rentals
 */
export const formatPriceWithPeriod = (
  price: number,
  periode?: 'JOUR' | 'SEMAINE' | 'MOIS' | 'ANNEE' | null
): string => {
  const formattedPrice = formatPrice(price);

  if (!periode) return formattedPrice;

  const periodLabels: Record<string, string> = {
    JOUR: '/jour',
    SEMAINE: '/sem',
    MOIS: '/mois',
    ANNEE: '/an',
  };

  return `${formattedPrice}${periodLabels[periode] || ''}`;
};

/**
 * Format surface area
 */
export const formatSurface = (surface: number): string => {
  return `${surface} m²`;
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Format as Guinea phone number
  if (cleaned.startsWith('224')) {
    const number = cleaned.slice(3);
    return `+224 ${number.slice(0, 3)} ${number.slice(3, 5)} ${number.slice(5, 7)} ${number.slice(7)}`;
  }

  return `+224 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-GN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

/**
 * Format relative time
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return formatDate(dateString);
};

/**
 * Format time for display
 */
export const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':');
  return `${hours}h${minutes}`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Get property type label in French
 */
export const getPropertyTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    APPARTEMENT: 'Appartement',
    MAISON: 'Maison',
    TERRAIN: 'Terrain',
    BUREAU: 'Bureau',
    MAGASIN: 'Magasin',
    ENTREPOT: 'Entrepôt',
    IMMEUBLE: 'Immeuble',
  };
  return labels[type] || type;
};

/**
 * Get transaction type label
 */
export const getTransactionTypeLabel = (type: string): string => {
  return type === 'VENTE' ? 'À vendre' : 'À louer';
};

/**
 * Get status label and color
 */
export const getStatusInfo = (status: string): { label: string; color: string } => {
  const statusMap: Record<string, { label: string; color: string }> = {
    BROUILLON: { label: 'Brouillon', color: '#6B7280' },
    EN_ATTENTE: { label: 'En attente', color: '#F59E0B' },
    ACTIVE: { label: 'Active', color: '#10B981' },
    LOUEE: { label: 'Louée', color: '#3B82F6' },
    VENDUE: { label: 'Vendue', color: '#8B5CF6' },
    ARCHIVEE: { label: 'Archivée', color: '#6B7280' },
  };
  return statusMap[status] || { label: status, color: '#6B7280' };
};
