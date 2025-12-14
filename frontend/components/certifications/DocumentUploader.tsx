'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface DocumentUploaderProps {
  onUploadSuccess?: () => void;
  className?: string;
}

type DocumentType = 'CNI' | 'TITRE_FONCIER';

interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    type_document: string;
    fichier_url: string;
  };
}

// Upload document
async function uploadDocument(file: File, type: DocumentType): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('fichier', file);
  formData.append('type_document', type);

  const response = await apiClient.post('/certifications/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

const DOCUMENT_TYPES: { value: DocumentType; label: string; description: string }[] = [
  {
    value: 'CNI',
    label: "Carte d'identité nationale",
    description: "Photo recto-verso de votre CNI en cours de validité",
  },
  {
    value: 'TITRE_FONCIER',
    label: 'Titre foncier',
    description: 'Scan ou photo lisible de votre titre de propriété',
  },
];

export default function DocumentUploader({ onUploadSuccess, className }: DocumentUploaderProps) {
  const [selectedType, setSelectedType] = useState<DocumentType>('CNI');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: ({ file, type }: { file: File; type: DocumentType }) => uploadDocument(file, type),
    onSuccess: () => {
      setSelectedFile(null);
      setPreviewUrl(null);
      onUploadSuccess?.();
    },
  });

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Format non supporté. Utilisez JPG, PNG, WebP ou PDF.');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Le fichier est trop volumineux. Taille maximale: 10 Mo.');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate({ file: selectedFile, type: selectedType });
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      {/* Document type selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type de document
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {DOCUMENT_TYPES.map((docType) => (
            <label
              key={docType.value}
              className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                selectedType === docType.value
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="document-type"
                value={docType.value}
                checked={selectedType === docType.value}
                onChange={(e) => setSelectedType(e.target.value as DocumentType)}
                className="sr-only"
              />
              <span className="flex flex-1">
                <span className="flex flex-col">
                  <span className="block text-sm font-medium text-gray-900">
                    {docType.label}
                  </span>
                  <span className="mt-1 text-xs text-gray-500">
                    {docType.description}
                  </span>
                </span>
              </span>
              {selectedType === docType.value && (
                <svg className="h-5 w-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* File upload area */}
      <div
        className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleInputChange}
          className="sr-only"
          id="file-upload"
        />

        {!selectedFile ? (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div className="mt-4">
              <label
                htmlFor="file-upload"
                className="cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500"
              >
                Cliquez pour sélectionner
              </label>
              <p className="text-sm text-gray-500 mt-1">
                ou glissez-déposez un fichier ici
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              JPG, PNG, WebP ou PDF. Max 10 Mo.
            </p>
          </>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            {previewUrl ? (
              <div className="mx-auto max-w-xs">
                <img
                  src={previewUrl}
                  alt="Aperçu du document"
                  className="rounded-lg shadow-sm max-h-48 mx-auto"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}

            {/* File info */}
            <div className="text-sm">
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} Mo
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={uploadMutation.isPending}
              >
                Changer
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Envoi en cours...
                  </>
                ) : (
                  'Envoyer'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {uploadMutation.isError && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Une erreur est survenue lors de l&apos;envoi. Veuillez réessayer.
        </div>
      )}

      {/* Success message */}
      {uploadMutation.isSuccess && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Document envoyé avec succès ! Il sera vérifié sous 24-48h.
        </div>
      )}

      {/* Important notice */}
      <div className="mt-6 rounded-lg bg-yellow-50 p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Important</h3>
            <div className="mt-1 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Assurez-vous que le document est lisible et en cours de validité</li>
                <li>Les informations doivent correspondre à votre profil</li>
                <li>La vérification prend généralement 24 à 48 heures</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
