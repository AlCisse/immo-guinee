// Property types and operation types for listings

export type OperationType = 'LOCATION' | 'LOCATION_COURTE' | 'VENTE';

export interface OperationTypeOption {
  value: OperationType;
  label: string;
  description: string;
  icon: string;
}

export const OPERATION_TYPES: OperationTypeOption[] = [
  {
    value: 'LOCATION',
    label: 'Louer',
    description: 'Location longue duree',
    icon: 'key-outline',
  },
  {
    value: 'LOCATION_COURTE',
    label: 'Location courte',
    description: 'Meuble, a partir de 1 jour',
    icon: 'calendar-outline',
  },
  {
    value: 'VENTE',
    label: 'Vendre',
    description: 'Mettre en vente',
    icon: 'pricetag-outline',
  },
];

export type PropertyType =
  | 'STUDIO'
  | 'CHAMBRE_SALON'
  | 'APPARTEMENT_2CH'
  | 'APPARTEMENT_3CH'
  | 'VILLA'
  | 'DUPLEX'
  | 'TERRAIN'
  | 'BUREAU'
  | 'MAGASIN'
  | 'ENTREPOT';

export interface PropertyTypeOption {
  value: PropertyType;
  label: string;
  description: string;
  emoji: string;
  category: 'residential' | 'commercial';
  hasRooms: boolean; // Whether it has bedroom count
}

export const PROPERTY_TYPES: PropertyTypeOption[] = [
  // Residential
  {
    value: 'STUDIO',
    label: 'Studio',
    description: 'Espace unique avec coin cuisine',
    emoji: '🏠',
    category: 'residential',
    hasRooms: false,
  },
  {
    value: 'CHAMBRE_SALON',
    label: 'Chambre-Salon',
    description: '1 chambre avec salon',
    emoji: '🛋️',
    category: 'residential',
    hasRooms: true,
  },
  {
    value: 'APPARTEMENT_2CH',
    label: 'Appart. 2CH',
    description: '2 chambres + salon',
    emoji: '🏢',
    category: 'residential',
    hasRooms: true,
  },
  {
    value: 'APPARTEMENT_3CH',
    label: 'Appart. 3+CH',
    description: '3 chambres ou plus',
    emoji: '🏬',
    category: 'residential',
    hasRooms: true,
  },
  {
    value: 'VILLA',
    label: 'Villa',
    description: 'Maison individuelle',
    emoji: '🏡',
    category: 'residential',
    hasRooms: true,
  },
  {
    value: 'DUPLEX',
    label: 'Duplex',
    description: 'Sur 2 niveaux',
    emoji: '🏘️',
    category: 'residential',
    hasRooms: true,
  },
  {
    value: 'TERRAIN',
    label: 'Terrain',
    description: 'Terrain a batir',
    emoji: '🌍',
    category: 'residential',
    hasRooms: false,
  },
  // Commercial
  {
    value: 'BUREAU',
    label: 'Bureau',
    description: 'Espace professionnel',
    emoji: '💼',
    category: 'commercial',
    hasRooms: false,
  },
  {
    value: 'MAGASIN',
    label: 'Boutique',
    description: 'Local commercial',
    emoji: '🏪',
    category: 'commercial',
    hasRooms: false,
  },
  {
    value: 'ENTREPOT',
    label: 'Entrepot',
    description: 'Espace de stockage',
    emoji: '🏭',
    category: 'commercial',
    hasRooms: false,
  },
];

// Get property type info
export function getPropertyTypeInfo(value: PropertyType): PropertyTypeOption | undefined {
  return PROPERTY_TYPES.find(pt => pt.value === value);
}

// Check if property type requires superficie
export function requiresSuperficie(propertyType: PropertyType): boolean {
  return propertyType === 'TERRAIN';
}

// Check if property type has rooms
export function hasRooms(propertyType: PropertyType): boolean {
  const info = getPropertyTypeInfo(propertyType);
  return info?.hasRooms ?? false;
}

// Map to backend values
export function mapPropertyTypeToBackend(type: PropertyType): string {
  const mapping: Record<PropertyType, string> = {
    STUDIO: 'studio',
    CHAMBRE_SALON: 'appartement',
    APPARTEMENT_2CH: 'appartement',
    APPARTEMENT_3CH: 'appartement',
    VILLA: 'villa',
    DUPLEX: 'maison',
    BUREAU: 'bureau',
    MAGASIN: 'magasin',
    ENTREPOT: 'magasin',
    TERRAIN: 'terrain',
  };
  return mapping[type] || 'appartement';
}

export function mapOperationTypeToBackend(type: OperationType): string {
  const mapping: Record<OperationType, string> = {
    LOCATION: 'location',
    LOCATION_COURTE: 'location_courte',
    VENTE: 'vente',
  };
  return mapping[type] || 'location';
}

// Amenities
export interface Amenity {
  id: string;
  label: string;
  icon: string;
  backendKey: string;
}

export const AMENITIES: Amenity[] = [
  { id: 'parking', label: 'Parking', icon: 'car-outline', backendKey: 'garage' },
  { id: 'wifi', label: 'Wifi', icon: 'wifi-outline', backendKey: 'wifi' },
  { id: 'ac', label: 'Climatisation', icon: 'snow-outline', backendKey: 'climatisation' },
  { id: 'security', label: 'Securite 24h', icon: 'shield-checkmark-outline', backendKey: 'gardien' },
  { id: 'pool', label: 'Piscine', icon: 'water-outline', backendKey: 'piscine' },
  { id: 'generator', label: 'Groupe electrogene', icon: 'flash-outline', backendKey: 'electricite' },
  { id: 'balcony', label: 'Balcon', icon: 'business-outline', backendKey: 'balcon' },
  { id: 'kitchen', label: 'Cuisine equipee', icon: 'restaurant-outline', backendKey: 'cuisine' },
  { id: 'well', label: 'Forage', icon: 'water-outline', backendKey: 'forage' },
];
