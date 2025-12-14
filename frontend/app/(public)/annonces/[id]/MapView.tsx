'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { CONAKRY_QUARTIERS } from '@/lib/data/communes';

interface MapViewProps {
  commune: string;
  quartier: string;
}

export default function MapView({ commune, quartier }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Calculate position based on commune/quartier
  const position = useMemo((): [number, number] => {
    // Find quartier data first
    const quartierData = CONAKRY_QUARTIERS.find(
      (q) => q.commune === commune && q.name === quartier
    );
    if (quartierData) {
      return [quartierData.lat, quartierData.lng];
    }

    // Fallback: find any entry for this commune
    const communeData = CONAKRY_QUARTIERS.find((q) => q.commune === commune);
    if (communeData) {
      return [communeData.lat, communeData.lng];
    }

    // Fallback to Conakry center
    return [9.5092, -13.7122];
  }, [commune, quartier]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Prevent double initialization in Strict Mode
    if (isInitializedRef.current) return;

    const initMap = async () => {
      // Check if container exists
      if (!mapContainerRef.current) return;

      // Check if container already has a map (Leaflet adds _leaflet_id)
      if ((mapContainerRef.current as any)._leaflet_id) {
        setIsReady(true);
        return;
      }

      isInitializedRef.current = true;

      // Dynamically import Leaflet
      const L = (await import('leaflet')).default;

      // Fix default marker icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      try {
        // Create new map
        const map = L.map(mapContainerRef.current, {
          center: position,
          zoom: 14,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        L.marker(position)
          .addTo(map)
          .bindPopup(`${quartier}, ${commune}`);

        mapInstanceRef.current = map;
        setIsReady(true);
      } catch (error) {
        // Map already initialized, just mark as ready
        console.warn('Map initialization warning:', error);
        setIsReady(true);
      }
    };

    initMap();

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors
        }
        mapInstanceRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [position, commune, quartier]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height: '100%', width: '100%', minHeight: '300px' }}
      className="rounded-lg bg-gray-100"
    >
      {!isReady && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-gray-600">Chargement de la carte...</div>
        </div>
      )}
    </div>
  );
}
