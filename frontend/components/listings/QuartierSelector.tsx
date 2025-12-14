'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression } from 'leaflet';

// Dynamically import React Leaflet components (client-side only)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Communes and quartiers of Conakry
export interface QuartierData {
  commune: string;
  quartiers: string[];
  coordinates: LatLngExpression;
}

export const CONAKRY_QUARTIERS: QuartierData[] = [
  {
    commune: 'Kaloum',
    quartiers: ['Almamya', 'Boulbinet', 'Coronthie', 'Sandervalia', 'Tombo'],
    coordinates: [9.509167, -13.712222],
  },
  {
    commune: 'Dixinn',
    quartiers: ['Dixinn Centre', 'Dixinn Port', 'Dixinn Mosquée', 'Cameroun', 'Landréah'],
    coordinates: [9.545278, -13.680278],
  },
  {
    commune: 'Matam',
    quartiers: ['Matam Centre', 'Madina', 'Hamdallaye', 'Teminetaye', 'Belle-Vue'],
    coordinates: [9.516667, -13.653611],
  },
  {
    commune: 'Ratoma',
    quartiers: ['Ratoma Centre', 'Kipé', 'Dar-es-Salam', 'Sonfonia', 'Kaporo'],
    coordinates: [9.563056, -13.657778],
  },
  {
    commune: 'Matoto',
    quartiers: ['Matoto Centre', 'Yimbaya', 'Cosa', 'Sangoyah', 'Kobaya'],
    coordinates: [9.533889, -13.618611],
  },
];

interface QuartierSelectorProps {
  commune?: string;
  quartier?: string;
  onCommuneChange: (commune: string) => void;
  onQuartierChange: (quartier: string) => void;
  communeError?: string;
  quartierError?: string;
  required?: boolean;
}

export default function QuartierSelector({
  commune,
  quartier,
  onCommuneChange,
  onQuartierChange,
  communeError,
  quartierError,
  required = true,
}: QuartierSelectorProps) {
  const [selectedCommune, setSelectedCommune] = useState<string | undefined>(commune);
  const [selectedQuartier, setSelectedQuartier] = useState<string | undefined>(quartier);
  const [showMap, setShowMap] = useState(false);

  // Get quartiers for selected commune
  const availableQuartiers = useMemo(() => {
    if (!selectedCommune) return [];
    const communeData = CONAKRY_QUARTIERS.find((c) => c.commune === selectedCommune);
    return communeData?.quartiers || [];
  }, [selectedCommune]);

  const handleCommuneSelect = (communeName: string) => {
    setSelectedCommune(communeName);
    setSelectedQuartier(undefined);
    onCommuneChange(communeName);
    onQuartierChange(''); // Clear quartier when commune changes
  };

  const handleQuartierSelect = (quartierName: string) => {
    setSelectedQuartier(quartierName);
    onQuartierChange(quartierName);
  };

  // Center of Conakry
  const conakryCenter: LatLngExpression = [9.531602, -13.680228];

  return (
    <div className="w-full space-y-6">
      {/* Commune Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Commune {required && <span className="text-red-500">*</span>}
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CONAKRY_QUARTIERS.map((communeData) => {
            const isSelected = selectedCommune === communeData.commune;

            return (
              <button
                key={communeData.commune}
                type="button"
                onClick={() => handleCommuneSelect(communeData.commune)}
                className={`
                  relative p-4 rounded-lg border-2 transition-all duration-200 text-left
                  ${
                    isSelected
                      ? 'border-green-600 bg-green-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-sm'
                  }
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                `}
              >
                <div className="font-medium text-gray-900 mb-1">
                  {communeData.commune}
                </div>
                <div className="text-xs text-gray-600">
                  {communeData.quartiers.length} quartiers
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {communeError && (
          <p className="mt-2 text-sm text-red-600">{communeError}</p>
        )}
      </div>

      {/* Quartier Selector */}
      {selectedCommune && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quartier {required && <span className="text-red-500">*</span>}
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {availableQuartiers.map((quartierName) => {
              const isSelected = selectedQuartier === quartierName;

              return (
                <button
                  key={quartierName}
                  type="button"
                  onClick={() => handleQuartierSelect(quartierName)}
                  className={`
                    p-3 rounded-lg border-2 transition-all duration-200 text-sm
                    ${
                      isSelected
                        ? 'border-green-600 bg-green-50 text-green-900 font-medium shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                    }
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1
                  `}
                >
                  {quartierName}
                </button>
              );
            })}
          </div>

          {quartierError && (
            <p className="mt-2 text-sm text-red-600">{quartierError}</p>
          )}
        </div>
      )}

      {/* Map Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          {showMap ? 'Masquer la carte' : 'Voir sur la carte'}
        </button>
      </div>

      {/* Map */}
      {showMap && (
        <div className="w-full h-96 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
          <MapContainer
            center={conakryCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {CONAKRY_QUARTIERS.map((communeData) => (
              <Marker
                key={communeData.commune}
                position={communeData.coordinates}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold text-green-700">
                      {communeData.commune}
                    </div>
                    <div className="mt-1 text-gray-600">
                      {communeData.quartiers.join(', ')}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Helper text */}
      {!communeError && !quartierError && (
        <p className="text-xs text-gray-500">
          Sélectionnez d'abord la commune, puis le quartier où se trouve votre bien
        </p>
      )}
    </div>
  );
}
