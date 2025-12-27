/**
 * Format price for display in GNF (Guinean Franc)
 * Handles millions (M) and billions (Mds)
 */

const BILLION = 1_000_000_000;
const MILLION = 1_000_000;
const THOUSAND = 1_000;

/**
 * Format a price value for compact display
 * @param price - The price in GNF
 * @param options - Formatting options
 * @returns Formatted price string
 *
 * Examples:
 * - 500000 → "500K GNF"
 * - 1500000 → "1.5M GNF"
 * - 4000000000 → "4 Mds GNF"
 */
export function formatPrice(
  price: number | string | null | undefined,
  options: {
    /** Include "GNF" suffix (default: true) */
    showCurrency?: boolean;
    /** Include period suffix like "/mois" (default: none) */
    periodSuffix?: string;
    /** Use compact format (K/M/Mds) (default: true) */
    compact?: boolean;
    /** Number of decimal places (default: 1 for M/Mds, 0 for K) */
    decimals?: number;
  } = {}
): string {
  const {
    showCurrency = true,
    periodSuffix = '',
    compact = true,
    decimals,
  } = options;

  // Handle null/undefined
  if (price === null || price === undefined) {
    return '-';
  }

  // Convert string to number
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  // Handle invalid numbers
  if (isNaN(numPrice)) {
    return '-';
  }

  let formatted: string;

  if (!compact) {
    // Full number format with spaces as thousand separators
    formatted = numPrice.toLocaleString('fr-GN');
  } else if (numPrice >= BILLION) {
    // Billions (Milliards)
    const value = numPrice / BILLION;
    const decimalPlaces = decimals ?? (value % 1 === 0 ? 0 : 1);
    formatted = `${value.toFixed(decimalPlaces)} Mds`;
  } else if (numPrice >= MILLION) {
    // Millions
    const value = numPrice / MILLION;
    const decimalPlaces = decimals ?? (value % 1 === 0 ? 0 : 1);
    formatted = `${value.toFixed(decimalPlaces)}M`;
  } else if (numPrice >= THOUSAND) {
    // Thousands
    const value = numPrice / THOUSAND;
    const decimalPlaces = decimals ?? 0;
    formatted = `${value.toFixed(decimalPlaces)}K`;
  } else {
    // Small numbers
    formatted = numPrice.toLocaleString('fr-GN');
  }

  // Add currency suffix
  if (showCurrency) {
    formatted += ' GNF';
  }

  // Add period suffix
  if (periodSuffix) {
    formatted += periodSuffix;
  }

  return formatted;
}

/**
 * Format price with transaction type suffix
 * @param price - The price in GNF
 * @param transactionType - Type of transaction (VENTE, LOCATION, LOCATION_COURTE)
 * @returns Formatted price with appropriate suffix
 */
export function formatListingPrice(
  price: number | string | null | undefined,
  transactionType?: string
): string {
  let periodSuffix = '';

  switch (transactionType) {
    case 'LOCATION':
      periodSuffix = '/mois';
      break;
    case 'LOCATION_COURTE':
      periodSuffix = '/jour';
      break;
    case 'VENTE':
    default:
      periodSuffix = '';
      break;
  }

  return formatPrice(price, { periodSuffix });
}

/**
 * Format price for input display (with spaces as thousand separators)
 * @param value - Raw input value
 * @returns Formatted string for display in input field
 */
export function formatPriceInput(value: string): string {
  // Remove all non-digits
  const numbers = value.replace(/\D/g, '');
  // Add space separators for thousands
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Parse formatted price input back to number
 * @param value - Formatted input string
 * @returns Numeric value
 */
export function parsePriceInput(value: string): number {
  const numbers = value.replace(/\D/g, '');
  return parseInt(numbers, 10) || 0;
}

export default formatPrice;
