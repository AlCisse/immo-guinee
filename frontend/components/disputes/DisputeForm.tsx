'use client';

import { useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  useCreateDispute,
  DisputeCategory,
  getCategoryLabel,
} from '@/lib/hooks/useDisputes';

// T215: DisputeForm component (FR-072 with file uploads)

interface DisputeFormProps {
  contractId: string;
  onSuccess?: (disputeId: string) => void;
  onCancel?: () => void;
}

const CATEGORIES: DisputeCategory[] = [
  'IMPAYE',
  'DEGATS',
  'EXPULSION_ABUSIVE',
  'CAUTION_NON_RENDUE',
  'NON_CONFORMITE',
  'HARCELEMENT',
  'AUTRE',
];

interface UploadedFile {
  file: File;
  preview?: string;
}

export default function DisputeForm({ contractId, onSuccess, onCancel }: DisputeFormProps) {
  const [category, setCategory] = useState<DisputeCategory | null>(null);
  const [motif, setMotif] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createDispute = useCreateDispute();

  const isMotifValid = motif.trim().length >= 10;
  const isDescriptionValid = description.trim().length >= 200;
  const canSubmit = category && isMotifValid && isDescriptionValid && !createDispute.isPending;

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];

    Array.from(selectedFiles).forEach((file) => {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setError('Seuls les fichiers JPG, PNG et PDF sont acceptés');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('La taille maximale par fichier est de 5 Mo');
        return;
      }

      // Create preview for images
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      newFiles.push({ file, preview });
    });

    if (newFiles.length > 0) {
      setFiles((prev) => {
        // Max 5 files
        const combined = [...prev, ...newFiles].slice(0, 5);
        return combined;
      });
      setError(null);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      // Revoke preview URL if exists
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canSubmit) return;

    try {
      const dispute = await createDispute.mutateAsync({
        contract_id: contractId,
        motif: motif.trim(),
        description: description.trim(),
        categorie: category,
        preuves: files.map((f) => f.file),
      });

      onSuccess?.(dispute.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création du litige');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step >= s
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-200 text-neutral-500'
              )}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={clsx(
                  'w-12 h-1 mx-1',
                  step > s ? 'bg-primary-500' : 'bg-neutral-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Category Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Type de litige</h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">Sélectionnez la catégorie qui correspond à votre situation</p>
          </div>

          <div className="grid gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setStep(2);
                }}
                className={clsx(
                  'p-4 rounded-lg border text-left transition-all',
                  category === cat
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 dark:border-dark-border hover:border-primary-300 hover:bg-neutral-50 dark:hover:bg-dark-hover'
                )}
              >
                <span className="font-medium text-neutral-900 dark:text-white">{getCategoryLabel(cat)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Description */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Description du litige</h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">Décrivez votre situation en détail</p>
          </div>

          {/* Category Badge */}
          <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-dark-bg rounded-lg">
            <span className="text-sm text-neutral-500">Catégorie:</span>
            <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm font-medium">
              {category && getCategoryLabel(category)}
            </span>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="ml-auto text-sm text-primary-600 hover:text-primary-700"
            >
              Modifier
            </button>
          </div>

          {/* Motif */}
          <div>
            <label htmlFor="motif" className="block font-medium text-neutral-900 dark:text-white mb-2">
              Motif (titre court)
            </label>
            <input
              id="motif"
              type="text"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex: Loyers impayés depuis 3 mois"
              className={clsx(
                'w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                motif.length > 0 && !isMotifValid ? 'border-warning-500' : 'border-neutral-200 dark:border-dark-border'
              )}
              maxLength={100}
            />
            <p className="text-sm text-neutral-500 mt-1">Minimum 10 caractères</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block font-medium text-neutral-900 dark:text-white mb-2">
              Description détaillée
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre situation en détail: les faits, les dates, les montants concernés, les démarches déjà effectuées..."
              rows={6}
              className={clsx(
                'w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                description.length > 0 && !isDescriptionValid ? 'border-warning-500' : 'border-neutral-200 dark:border-dark-border'
              )}
              maxLength={2000}
            />
            <div className="flex justify-between mt-1">
              <p
                className={clsx(
                  'text-sm',
                  description.length > 0 && !isDescriptionValid ? 'text-warning-600' : 'text-neutral-500'
                )}
              >
                {description.length < 200 ? `${200 - description.length} caractères minimum` : 'OK'}
              </p>
              <p className="text-sm text-neutral-400">{description.length}/2000</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-neutral-300 dark:border-dark-border rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-hover"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!isMotifValid || !isDescriptionValid}
              className={clsx(
                'flex-1 px-6 py-3 rounded-lg font-medium transition-colors',
                isMotifValid && isDescriptionValid
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-neutral-100 dark:bg-dark-hover text-neutral-400 cursor-not-allowed'
              )}
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preuves */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Preuves (optionnel)</h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">Ajoutez des documents pour appuyer votre demande</p>
          </div>

          {/* File Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-300 dark:border-dark-border rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-colors"
          >
            <svg
              className="w-12 h-12 text-neutral-400 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-neutral-600 dark:text-neutral-400">Cliquez pour ajouter des fichiers</p>
            <p className="text-sm text-neutral-500 mt-1">JPG, PNG, PDF - Max 5 Mo par fichier</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,application/pdf"
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />

          {/* Files Preview */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{files.length}/5 fichiers</p>
              <div className="grid grid-cols-2 gap-3">
                {files.map((f, index) => (
                  <div
                    key={index}
                    className="relative bg-neutral-50 dark:bg-dark-bg rounded-lg p-3 flex items-center gap-3"
                  >
                    {f.preview ? (
                      <img
                        src={f.preview}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-error-100 rounded flex items-center justify-center">
                        <svg className="w-6 h-6 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-900 dark:text-white truncate">{f.file.name}</p>
                      <p className="text-xs text-neutral-500">
                        {(f.file.size / 1024 / 1024).toFixed(1)} Mo
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 text-neutral-400 hover:text-error-500"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-error-50 text-error-700 rounded-lg text-sm">{error}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-neutral-300 dark:border-dark-border rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-hover"
            >
              Retour
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={clsx(
                'flex-1 px-6 py-3 rounded-lg font-medium transition-colors',
                canSubmit
                  ? 'bg-error-500 text-white hover:bg-error-600'
                  : 'bg-neutral-100 dark:bg-dark-hover text-neutral-400 cursor-not-allowed'
              )}
            >
              {createDispute.isPending ? 'Création...' : 'Ouvrir le litige'}
            </button>
          </div>

          {/* Warning */}
          <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-warning-800">Avant de confirmer</p>
                <ul className="text-sm text-warning-700 mt-1 list-disc list-inside space-y-1">
                  <li>Un médiateur sera assigné sous 24h</li>
                  <li>L'autre partie sera notifiée</li>
                  <li>Cette action peut affecter les badges des deux parties</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
