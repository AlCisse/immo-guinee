'use client';

import { useState, useCallback } from 'react';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NearbyPlace {
  name: string;
  type: string;
  distance: number; // in meters
}

export interface GeolocationResult {
  coordinates: Coordinates;
  nearbyPlaces: NearbyPlace[];
  locationDescription: string;
  detectedQuartier?: string;
  detectedCommune?: string;
  detectedCity?: string;
}

interface UseGeolocationReturn {
  isLoading: boolean;
  error: string | null;
  detectPosition: () => Promise<GeolocationResult | null>;
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Format distance for display
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// Get French label for place type
function getPlaceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'place_of_worship': 'mosquée',
    'mosque': 'mosquée',
    'church': 'église',
    'school': 'école',
    'hospital': 'hôpital',
    'clinic': 'clinique',
    'pharmacy': 'pharmacie',
    'bank': 'banque',
    'atm': 'distributeur',
    'supermarket': 'supermarché',
    'marketplace': 'marché',
    'market': 'marché',
    'restaurant': 'restaurant',
    'fuel': 'station-service',
    'bus_station': 'gare routière',
    'police': 'commissariat',
    'post_office': 'poste',
    'primary': 'route principale',
    'secondary': 'route secondaire',
    'tertiary': 'route',
    'residential': 'route',
    'trunk': 'route nationale',
  };
  return labels[type] || type;
}

interface NominatimResult {
  places: NearbyPlace[];
  quartier?: string;
  commune?: string;
  city?: string;
}

// Fetch nearby places using Nominatim reverse geocoding
async function fetchNearbyPlacesNominatim(lat: number, lon: number): Promise<NominatimResult> {
  try {
    // Use Nominatim to get location details
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&extratags=1&namedetails=1`,
      {
        headers: {
          'User-Agent': 'ImmoGuinee/1.0 (contact@immoguinee.com)',
        },
      }
    );

    if (!response.ok) {
      return { places: [] };
    }

    const data = await response.json();
    const places: NearbyPlace[] = [];
    let quartier: string | undefined;
    let commune: string | undefined;
    let city: string | undefined;

    // Extract meaningful location data
    if (data.address) {
      // Add neighbourhood/suburb as a reference point
      if (data.address.suburb || data.address.neighbourhood) {
        const name = data.address.neighbourhood || data.address.suburb;
        quartier = name;
        places.push({ name: `Quartier ${name}`, type: 'neighbourhood', distance: 0 });
      }

      // Add road if available
      if (data.address.road) {
        places.push({ name: data.address.road, type: 'road', distance: 50 });
      }

      // Add city area
      if (data.address.city_district || data.address.town) {
        const name = data.address.city_district || data.address.town;
        commune = name;
        places.push({ name, type: 'district', distance: 100 });
      }

      // Get city
      city = data.address.city;
    }

    return { places, quartier, commune, city };
  } catch (error) {
    console.error('Nominatim error:', error);
    return { places: [] };
  }
}

// Fetch location details and nearby places
async function fetchLocationData(lat: number, lon: number): Promise<{
  places: NearbyPlace[];
  quartier?: string;
  commune?: string;
  city?: string;
}> {
  // Always fetch location details from Nominatim first
  const nominatimResult = await fetchNearbyPlacesNominatim(lat, lon);

  // Try to get more detailed nearby places from Overpass
  const radius = 500;
  const query = `[out:json][timeout:15];
(
  node["amenity"~"place_of_worship|school|hospital|clinic|pharmacy|bank|fuel|marketplace"](around:${radius},${lat},${lon});
  node["shop"="supermarket"](around:${radius},${lat},${lon});
  way["highway"~"primary|secondary|tertiary"](around:200,${lat},${lon});
);
out center tags;`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Overpass API failed, using Nominatim data only');
      return nominatimResult;
    }

    const text = await response.text();

    if (text.startsWith('<?xml') || text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      console.warn('Overpass returned HTML error, using Nominatim data only');
      return nominatimResult;
    }

    const data = JSON.parse(text);
    const places: NearbyPlace[] = [];

    for (const element of data.elements) {
      let placeLat: number, placeLon: number;

      if (element.type === 'way' && element.center) {
        placeLat = element.center.lat;
        placeLon = element.center.lon;
      } else if (element.lat && element.lon) {
        placeLat = element.lat;
        placeLon = element.lon;
      } else {
        continue;
      }

      const distance = calculateDistance(lat, lon, placeLat, placeLon);
      const tags = element.tags || {};

      let type = '';
      let name = '';

      if (tags.amenity === 'place_of_worship') {
        type = tags.religion === 'muslim' ? 'mosque' : tags.religion === 'christian' ? 'church' : 'place_of_worship';
        name = tags.name || (type === 'mosque' ? 'Mosquée' : type === 'church' ? 'Église' : 'Lieu de culte');
      } else if (tags.amenity) {
        type = tags.amenity;
        name = tags.name || getPlaceTypeLabel(type);
      } else if (tags.shop) {
        type = tags.shop;
        name = tags.name || getPlaceTypeLabel(type);
      } else if (tags.highway) {
        type = tags.highway;
        name = tags.name || 'Route ' + getPlaceTypeLabel(type);
      }

      if (name && type) {
        places.push({ name, type, distance });
      }
    }

    const uniquePlaces = places
      .sort((a, b) => a.distance - b.distance)
      .filter((place, index, self) =>
        index === self.findIndex(p => p.name.toLowerCase() === place.name.toLowerCase())
      );

    // If Overpass found places, use them; otherwise use Nominatim places
    return {
      places: uniquePlaces.length > 0 ? uniquePlaces : nominatimResult.places,
      quartier: nominatimResult.quartier,
      commune: nominatimResult.commune,
      city: nominatimResult.city,
    };
  } catch (error) {
    console.error('Error fetching from Overpass:', error);
    return nominatimResult;
  }
}

// Generate location description from nearby places
function generateLocationDescription(places: NearbyPlace[]): string {
  if (places.length === 0) {
    return '';
  }

  // Take max 3 places, prioritize mosques, schools, markets, then Nominatim fallbacks
  const priorityOrder = [
    'mosque', 'place_of_worship', 'school', 'marketplace', 'market', 'hospital',
    'primary', 'secondary', 'tertiary', 'trunk',
    'neighbourhood', 'road', 'district' // Nominatim types
  ];

  const sortedPlaces = [...places].sort((a, b) => {
    const aPriority = priorityOrder.indexOf(a.type);
    const bPriority = priorityOrder.indexOf(b.type);
    const aIndex = aPriority === -1 ? 100 : aPriority;
    const bIndex = bPriority === -1 ? 100 : bPriority;
    return aIndex - bIndex;
  });

  const selectedPlaces = sortedPlaces.slice(0, 3);

  if (selectedPlaces.length === 0) {
    return '';
  }

  // Check if we have Nominatim-style data (has neighbourhood or district)
  const hasNominatimData = selectedPlaces.some(p =>
    ['neighbourhood', 'district', 'road'].includes(p.type)
  );

  if (hasNominatimData) {
    // Generate a simpler description for Nominatim data
    const neighbourhood = selectedPlaces.find(p => p.type === 'neighbourhood');
    const road = selectedPlaces.find(p => p.type === 'road');
    const district = selectedPlaces.find(p => p.type === 'district');

    const parts: string[] = [];
    if (neighbourhood) {
      parts.push(`dans le ${neighbourhood.name}`);
    }
    if (road) {
      // Format road name with "rue" prefix if not already present
      const roadName = road.name.toLowerCase().startsWith('rue ') ||
                       road.name.toLowerCase().startsWith('avenue ') ||
                       road.name.toLowerCase().startsWith('boulevard ')
        ? road.name
        : `la rue ${road.name}`;
      parts.push(`à proximité de ${roadName}`);
    }
    if (district && !neighbourhood) {
      parts.push(`dans la commune de ${district.name}`);
    }

    if (parts.length === 0) {
      return '';
    }

    return `Le bien est situé ${parts.join(', ')}.`;
  }

  // Build description with distances for Overpass data
  const parts = selectedPlaces.map((place) => {
    const distanceStr = formatDistance(place.distance);

    // Format place label based on type
    let placeLabel: string;
    const nameLower = place.name.toLowerCase();

    if (nameLower.startsWith('la ') || nameLower.startsWith('le ') || nameLower.startsWith("l'")) {
      placeLabel = place.name;
    } else if (place.type === 'mosque' || place.type === 'place_of_worship') {
      placeLabel = `la ${place.name}`;
    } else if (place.type === 'school') {
      placeLabel = nameLower.includes('école') ? place.name : `l'école ${place.name}`;
    } else if (place.type === 'hospital') {
      placeLabel = nameLower.includes('hôpital') ? place.name : `l'hôpital ${place.name}`;
    } else if (place.type === 'pharmacy') {
      placeLabel = nameLower.includes('pharmacie') ? place.name : `la pharmacie ${place.name}`;
    } else if (place.type === 'marketplace' || place.type === 'market') {
      placeLabel = nameLower.includes('marché') ? place.name : `le marché ${place.name}`;
    } else if (['primary', 'secondary', 'tertiary', 'trunk'].includes(place.type)) {
      placeLabel = nameLower.startsWith('route') || nameLower.startsWith('rue') ? place.name : `la route ${place.name}`;
    } else {
      placeLabel = place.name;
    }

    return `à ${distanceStr} de ${placeLabel}`;
  });

  return `Le bien se situe ${parts.join(', ')}.`;
}

export function useGeolocation(): UseGeolocationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectPosition = useCallback(async (): Promise<GeolocationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('La géolocalisation n\'est pas supportée par votre navigateur');
      }

      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const coordinates: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Fetch location data (includes nearby places and detected quartier/commune)
      const locationData = await fetchLocationData(coordinates.latitude, coordinates.longitude);

      // Generate description
      const locationDescription = generateLocationDescription(locationData.places);

      return {
        coordinates,
        nearbyPlaces: locationData.places,
        locationDescription,
        detectedQuartier: locationData.quartier,
        detectedCommune: locationData.commune,
        detectedCity: locationData.city,
      };
    } catch (err) {
      let errorMessage = 'Erreur lors de la détection de position';

      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Accès à la position refusé. Veuillez autoriser la géolocalisation.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Position non disponible. Vérifiez vos paramètres de localisation.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Délai de détection dépassé. Réessayez.';
            break;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, detectPosition };
}
