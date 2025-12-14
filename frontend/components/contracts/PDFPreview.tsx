'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface PDFPreviewProps {
  url: string;
  title?: string;
  isLoading?: boolean;
  onDownload?: () => void;
  className?: string;
}

export default function PDFPreview({
  url,
  title = 'Aperçu du contrat',
  isLoading = false,
  onDownload,
  className,
}: PDFPreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const zoomLevels = [50, 75, 100, 125, 150, 200];

  const handleZoomIn = useCallback(() => {
    const currentIndex = zoomLevels.indexOf(zoom);
    if (currentIndex < zoomLevels.length - 1) {
      setZoom(zoomLevels[currentIndex + 1]);
    }
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    const currentIndex = zoomLevels.indexOf(zoom);
    if (currentIndex > 0) {
      setZoom(zoomLevels[currentIndex - 1]);
    }
  }, [zoom]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex h-[600px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50',
          className
        )}
      >
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Chargement de l&apos;aperçu...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white shadow-sm',
        isFullscreen && 'fixed inset-4 z-50 overflow-hidden',
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <h3 className="font-medium text-gray-900">{title}</h3>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={handleZoomOut}
              disabled={zoom === zoomLevels[0]}
              className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Zoom arrière"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="border-0 bg-transparent px-2 py-1 text-sm font-medium text-gray-700 focus:outline-none"
              aria-label="Niveau de zoom"
            >
              {zoomLevels.map((level) => (
                <option key={level} value={level}>
                  {level}%
                </option>
              ))}
            </select>

            <button
              onClick={handleZoomIn}
              disabled={zoom === zoomLevels[zoomLevels.length - 1]}
              className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Zoom avant"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100"
            aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {isFullscreen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>

          {/* Download button */}
          {onDownload && (
            <Button variant="primary" size="sm" onClick={onDownload}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger
            </Button>
          )}
        </div>
      </div>

      {/* PDF iframe */}
      <div
        className={cn(
          'overflow-auto bg-gray-100',
          isFullscreen ? 'h-[calc(100%-56px)]' : 'h-[600px]'
        )}
      >
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            width: `${10000 / zoom}%`,
          }}
        >
          <iframe
            src={`${url}#toolbar=0&navpanes=0`}
            className="h-[800px] w-full border-0"
            title={title}
            aria-label={`Aperçu PDF: ${title}`}
          />
        </div>
      </div>

      {/* Mobile-friendly fallback */}
      <div className="border-t border-gray-200 bg-gray-50 p-4 text-center sm:hidden">
        <p className="mb-3 text-sm text-gray-600">
          L&apos;aperçu peut être limité sur mobile.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-primary-600 hover:text-primary-700"
        >
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Ouvrir dans un nouvel onglet
        </a>
      </div>

      {/* Fullscreen overlay background */}
      {isFullscreen && (
        <div
          className="fixed inset-0 -z-10 bg-black/50"
          onClick={toggleFullscreen}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
