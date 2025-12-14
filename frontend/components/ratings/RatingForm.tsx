'use client';

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { useCreateRating, calculateOverallRating } from '@/lib/hooks/useRatings';

// T211: RatingForm component (FR-067 - 3 criteria rating)

interface RatingFormProps {
  contractId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface CriteriaRating {
  communication: number;
  ponctualite: number;
  proprete: number;
  respect_contrat: number;
}

const CRITERIA_LABELS: Record<keyof CriteriaRating, { label: string; description: string }> = {
  communication: {
    label: 'Communication',
    description: 'Réactivité et qualité des échanges',
  },
  ponctualite: {
    label: 'Ponctualité',
    description: 'Respect des délais et rendez-vous',
  },
  proprete: {
    label: 'Propreté',
    description: 'État général du bien',
  },
  respect_contrat: {
    label: 'Respect du contrat',
    description: 'Conformité aux engagements',
  },
};

function StarRating({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          className="focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
        >
          <svg
            className={clsx(
              sizeClasses[size],
              'transition-colors',
              (hoverValue || value) >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function RatingForm({ contractId, onSuccess, onCancel }: RatingFormProps) {
  const [criteria, setCriteria] = useState<CriteriaRating>({
    communication: 0,
    ponctualite: 0,
    proprete: 0,
    respect_contrat: 0,
  });
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createRating = useCreateRating();

  const overallRating = calculateOverallRating(criteria);
  const allCriteriaRated = Object.values(criteria).every((v) => v > 0);
  const isCommentValid = comment.trim().length >= 20;
  const canSubmit = allCriteriaRated && isCommentValid && !createRating.isPending;

  const handleCriteriaChange = useCallback((key: keyof CriteriaRating, value: number) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      if (!allCriteriaRated) {
        setError('Veuillez noter tous les critères');
      } else if (!isCommentValid) {
        setError('Le commentaire doit contenir au moins 20 caractères');
      }
      return;
    }

    try {
      await createRating.mutateAsync({
        contract_id: contractId,
        note: Math.round(overallRating),
        note_communication: criteria.communication,
        note_ponctualite: criteria.ponctualite,
        note_proprete: criteria.proprete,
        note_respect_contrat: criteria.respect_contrat,
        commentaire: comment.trim(),
      });

      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la soumission');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Overall Rating Preview */}
      <div className="text-center py-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500 mb-2">Note globale</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-4xl font-bold text-primary-600">{overallRating || '–'}</span>
          <span className="text-2xl text-gray-400">/5</span>
        </div>
        {overallRating > 0 && (
          <StarRating value={Math.round(overallRating)} onChange={() => {}} size="lg" />
        )}
      </div>

      {/* Criteria Ratings */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Évaluez chaque critère</h3>

        {(Object.keys(CRITERIA_LABELS) as Array<keyof CriteriaRating>).map((key) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">{CRITERIA_LABELS[key].label}</p>
              <p className="text-sm text-gray-500">{CRITERIA_LABELS[key].description}</p>
            </div>
            <StarRating
              value={criteria[key]}
              onChange={(value) => handleCriteriaChange(key, value)}
            />
          </div>
        ))}
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="comment" className="block font-medium text-gray-900 mb-2">
          Votre commentaire
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Décrivez votre expérience (minimum 20 caractères)..."
          rows={4}
          className={clsx(
            'w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            comment.length > 0 && !isCommentValid ? 'border-yellow-500' : 'border-gray-200'
          )}
          maxLength={500}
        />
        <div className="flex justify-between mt-1">
          <p
            className={clsx(
              'text-sm',
              comment.length > 0 && !isCommentValid ? 'text-yellow-600' : 'text-gray-500'
            )}
          >
            {comment.length < 20 ? `${20 - comment.length} caractères minimum` : 'OK'}
          </p>
          <p className="text-sm text-gray-400">{comment.length}/500</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className={clsx(
            'flex-1 px-4 py-3 rounded-lg font-medium transition-colors',
            canSubmit
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          {createRating.isPending ? 'Envoi...' : 'Publier mon avis'}
        </button>
      </div>

      {/* Guidelines */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>En publiant cet avis, vous confirmez que :</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Votre évaluation est basée sur une expérience réelle</li>
          <li>Votre commentaire est respectueux et constructif</li>
          <li>Vous n'incluez pas d'informations personnelles</li>
        </ul>
      </div>
    </form>
  );
}
