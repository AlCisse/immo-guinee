'use client';

import { clsx } from 'clsx';
import BadgeDisplay from './BadgeDisplay';

interface Requirement {
  type: string;
  current: number | string;
  required: number | string;
}

interface ProgressTrackerProps {
  currentBadge: string;
  nextBadge: string;
  progress: number;
  requirementsMet: string[];
  requirementsMissing: Requirement[];
  className?: string;
}

// Requirement labels and icons
const REQUIREMENT_INFO: Record<string, { label: string; icon: JSX.Element }> = {
  transactions: {
    label: 'Transactions complétées',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  rating: {
    label: 'Note moyenne',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  verification: {
    label: 'Niveau de vérification',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
};

// Verification status labels
const VERIFICATION_LABELS: Record<string, string> = {
  NON_VERIFIE: 'Non vérifié',
  CNI_VERIFIEE: 'CNI vérifiée',
  TITRE_FONCIER_VERIFIE: 'Titre foncier vérifié',
};

function formatValue(type: string, value: number | string): string {
  if (type === 'rating') {
    return typeof value === 'number' ? value.toFixed(1) : String(value);
  }
  if (type === 'verification') {
    return VERIFICATION_LABELS[value as string] || String(value);
  }
  return String(value);
}

export default function ProgressTracker({
  currentBadge,
  nextBadge,
  progress,
  requirementsMet,
  requirementsMissing,
  className,
}: ProgressTrackerProps) {
  return (
    <div className={clsx('space-y-6', className)}>
      {/* Badge progression */}
      <div className="flex items-center justify-between">
        <BadgeDisplay badge={currentBadge} size="md" showLabel />
        <div className="flex-1 mx-6">
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="absolute -top-6 right-0 text-sm font-medium text-gray-700">
              {progress}%
            </span>
          </div>
        </div>
        <BadgeDisplay badge={nextBadge} size="md" showLabel />
      </div>

      {/* Requirements list */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Exigences pour le niveau suivant</h3>

        {/* Met requirements */}
        {requirementsMet.map((req) => {
          const info = REQUIREMENT_INFO[req] || { label: req, icon: null };
          return (
            <div
              key={req}
              className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3"
            >
              <div className="flex-shrink-0 text-green-600">{info.icon}</div>
              <div className="flex-1">
                <p className="font-medium text-green-800">{info.label}</p>
                <p className="text-sm text-green-600">Exigence remplie</p>
              </div>
              <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          );
        })}

        {/* Missing requirements */}
        {requirementsMissing.map((req) => {
          const info = REQUIREMENT_INFO[req.type] || { label: req.type, icon: null };
          const currentFormatted = formatValue(req.type, req.current);
          const requiredFormatted = formatValue(req.type, req.required);

          // Calculate progress for this requirement
          let reqProgress = 0;
          if (typeof req.current === 'number' && typeof req.required === 'number') {
            reqProgress = Math.min(100, (req.current / req.required) * 100);
          }

          return (
            <div
              key={req.type}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 text-gray-400">{info.icon}</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{info.label}</p>
                  <p className="text-sm text-gray-500">
                    Actuel: <span className="font-medium">{currentFormatted}</span> / Requis:{' '}
                    <span className="font-medium">{requiredFormatted}</span>
                  </p>
                </div>
              </div>
              {typeof req.current === 'number' && typeof req.required === 'number' && (
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${reqProgress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="rounded-lg bg-blue-50 p-4">
        <h4 className="font-medium text-blue-800 mb-2">Conseils pour progresser</h4>
        <ul className="space-y-1 text-sm text-blue-700">
          {requirementsMissing.some(r => r.type === 'transactions') && (
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Complétez plus de transactions pour augmenter votre compteur</span>
            </li>
          )}
          {requirementsMissing.some(r => r.type === 'rating') && (
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Offrez un excellent service pour améliorer vos notes</span>
            </li>
          )}
          {requirementsMissing.some(r => r.type === 'verification') && (
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Soumettez vos documents d&apos;identité ou titre foncier pour vérification</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
