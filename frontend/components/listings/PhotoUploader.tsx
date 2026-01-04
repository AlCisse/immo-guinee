'use client';

import { useState, useRef, useCallback } from 'react';

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  order: number;
}

interface PhotoUploaderProps {
  photos: PhotoFile[];
  onChange: (photos: PhotoFile[]) => void;
  error?: string;
  required?: boolean;
}

export default function PhotoUploader({
  photos,
  onChange,
  error,
  required = true,
}: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return `${file.name}: Format non supporté. Utilisez JPG, PNG ou WebP.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: Fichier trop volumineux (max 5MB).`;
    }
    return null;
  };

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const errors: string[] = [];
      const validFiles: PhotoFile[] = [];

      // Check if adding these files would exceed the maximum
      if (photos.length + fileArray.length > MAX_PHOTOS) {
        errors.push(`Maximum ${MAX_PHOTOS} photos autorisées.`);
        setUploadErrors(errors);
        return;
      }

      fileArray.forEach((file) => {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
        } else {
          const photoFile: PhotoFile = {
            id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            file,
            preview: URL.createObjectURL(file),
            order: photos.length + validFiles.length,
          };
          validFiles.push(photoFile);
        }
      });

      if (errors.length > 0) {
        setUploadErrors(errors);
      } else {
        setUploadErrors([]);
      }

      if (validFiles.length > 0) {
        onChange([...photos, ...validFiles]);
      }
    },
    [photos, onChange]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const removePhoto = (photoId: string) => {
    const updatedPhotos = photos
      .filter((p) => p.id !== photoId)
      .map((p, index) => ({ ...p, order: index }));

    onChange(updatedPhotos);
    setUploadErrors([]);

    // Revoke object URL to free memory
    const photo = photos.find((p) => p.id === photoId);
    if (photo) {
      URL.revokeObjectURL(photo.preview);
    }
  };

  const movePhoto = (photoId: string, direction: 'left' | 'right') => {
    const currentIndex = photos.findIndex((p) => p.id === photoId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= photos.length) return;

    const newPhotos = [...photos];
    [newPhotos[currentIndex], newPhotos[newIndex]] = [newPhotos[newIndex], newPhotos[currentIndex]];

    // Update order
    const reorderedPhotos = newPhotos.map((p, index) => ({ ...p, order: index }));
    onChange(reorderedPhotos);
  };

  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Photos {required && <span className="text-red-500">*</span>}
        <span className="ml-2 text-xs font-normal text-gray-500">
          ({photos.length}/{MAX_PHOTOS})
        </span>
      </label>

      {/* Upload Area */}
      {canAddMore && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
            ${
              isDragging
                ? 'border-green-600 bg-green-50 scale-[1.02]'
                : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50/50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FORMATS.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />

          <svg
            className={`mx-auto h-12 w-12 ${isDragging ? 'text-green-600' : 'text-gray-400'}`}
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <p className="mt-2 text-sm font-medium text-gray-700">
            {isDragging
              ? 'Déposez les photos ici'
              : 'Glissez-déposez vos photos ou cliquez pour sélectionner'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            PNG, JPG, WebP jusqu'à 5MB • Max {MAX_PHOTOS} photos
          </p>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100"
            >
              {/* Photo Preview */}
              <img
                src={photo.preview}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Main Photo Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-medium px-2 py-1 rounded">
                  Photo principale
                </div>
              )}

              {/* Order Badge */}
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded">
                {index + 1}
              </div>

              {/* Action Buttons - Show on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {/* Move Left */}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => movePhoto(photo.id, 'left')}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                    title="Déplacer à gauche"
                  >
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="p-2 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Move Right */}
                {index < photos.length - 1 && (
                  <button
                    type="button"
                    onClick={() => movePhoto(photo.id, 'right')}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                    title="Déplacer à droite"
                  >
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Messages */}
      {(error || uploadErrors.length > 0) && (
        <div className="mt-3 space-y-1">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {uploadErrors.map((err, index) => (
            <p key={index} className="text-sm text-red-600">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Helper Text */}
      {!error && uploadErrors.length === 0 && (
        <p className="mt-2 text-xs text-gray-500">
          La première photo sera utilisée comme photo principale. Vous pouvez réorganiser l'ordre en cliquant sur les flèches.
        </p>
      )}
    </div>
  );
}
