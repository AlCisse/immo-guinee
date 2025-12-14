import type { LatLngExpression, MapOptions, TileLayerOptions } from 'leaflet';

// Guinea's geographic center (Conakry region)
export const GUINEA_CENTER: LatLngExpression = [9.6412, -13.5784];

// Guinea's bounding box for map constraints
export const GUINEA_BOUNDS = {
  north: 12.6746,
  south: 7.1906,
  east: -7.6414,
  west: -15.0816,
};

// Conakry quartiers coordinates
export const QUARTIERS: Record<string, { center: LatLngExpression; zoom: number }> = {
  kaloum: { center: [9.5092, -13.7122], zoom: 14 },
  dixinn: { center: [9.5355, -13.6809], zoom: 14 },
  matam: { center: [9.5556, -13.6469], zoom: 14 },
  ratoma: { center: [9.5881, -13.5969], zoom: 14 },
  matoto: { center: [9.6127, -13.5312], zoom: 14 },
};

// Regional capitals
export const REGIONAL_CAPITALS: Record<string, LatLngExpression> = {
  conakry: [9.6412, -13.5784],
  kindia: [10.0572, -12.8642],
  boke: [10.9408, -14.2989],
  labe: [11.3167, -12.2833],
  mamou: [10.3833, -12.0833],
  faranah: [10.0333, -10.7333],
  kankan: [10.3833, -9.3000],
  nzerekore: [7.7500, -8.8167],
};

// Default map options optimized for Guinea
export const DEFAULT_MAP_OPTIONS: MapOptions = {
  center: GUINEA_CENTER,
  zoom: 12,
  minZoom: 6,
  maxZoom: 18,
  scrollWheelZoom: true,
  zoomControl: true,
  attributionControl: true,
};

// Tile layer configurations
export const TILE_LAYERS = {
  // OpenStreetMap (default, free)
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    } as TileLayerOptions,
  },

  // OpenStreetMap France (better French labels)
  osmFr: {
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    options: {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> France',
      maxZoom: 20,
    } as TileLayerOptions,
  },

  // Carto Positron (light theme)
  cartoLight: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    } as TileLayerOptions,
  },

  // Carto Dark Matter (dark theme)
  cartoDark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    } as TileLayerOptions,
  },

  // Satellite (ESRI)
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: {
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18,
    } as TileLayerOptions,
  },
};

// Custom marker icons for different property types
export const MARKER_ICONS = {
  appartement: {
    iconUrl: '/icons/markers/appartement.svg',
    iconSize: [32, 32] as [number, number],
    iconAnchor: [16, 32] as [number, number],
    popupAnchor: [0, -32] as [number, number],
  },
  maison: {
    iconUrl: '/icons/markers/maison.svg',
    iconSize: [32, 32] as [number, number],
    iconAnchor: [16, 32] as [number, number],
    popupAnchor: [0, -32] as [number, number],
  },
  terrain: {
    iconUrl: '/icons/markers/terrain.svg',
    iconSize: [32, 32] as [number, number],
    iconAnchor: [16, 32] as [number, number],
    popupAnchor: [0, -32] as [number, number],
  },
  bureau: {
    iconUrl: '/icons/markers/bureau.svg',
    iconSize: [32, 32] as [number, number],
    iconAnchor: [16, 32] as [number, number],
    popupAnchor: [0, -32] as [number, number],
  },
  default: {
    iconUrl: '/icons/markers/default.svg',
    iconSize: [32, 32] as [number, number],
    iconAnchor: [16, 32] as [number, number],
    popupAnchor: [0, -32] as [number, number],
  },
};

// Cluster options for performance with many markers
export const CLUSTER_OPTIONS = {
  chunkedLoading: true,
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  disableClusteringAtZoom: 16,
};

// Helper to calculate distance between two points (in km)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper to check if coordinates are within Guinea
export function isWithinGuinea(lat: number, lng: number): boolean {
  return (
    lat >= GUINEA_BOUNDS.south &&
    lat <= GUINEA_BOUNDS.north &&
    lng >= GUINEA_BOUNDS.west &&
    lng <= GUINEA_BOUNDS.east
  );
}

// Format coordinates for display
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'O';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

export default {
  GUINEA_CENTER,
  GUINEA_BOUNDS,
  QUARTIERS,
  REGIONAL_CAPITALS,
  DEFAULT_MAP_OPTIONS,
  TILE_LAYERS,
  MARKER_ICONS,
  CLUSTER_OPTIONS,
  calculateDistance,
  isWithinGuinea,
  formatCoordinates,
};
