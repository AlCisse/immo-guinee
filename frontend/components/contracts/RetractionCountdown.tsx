'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface RetractionCountdownProps {
  expiresAt: string;
  contractId: string;
  onCancel?: () => void;
}

// Cancel contract during retraction period
async function cancelContract(contractId: string, motif: string) {
  const response = await apiClient.post(`/contracts/${contractId}/cancel`, { motif });
  return response.data;
}

export default function RetractionCountdown({
  expiresAt,
  contractId,
  onCancel,
}: RetractionCountdownProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, expired: false });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelMotif, setCancelMotif] = useState('');

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () => cancelContract(contractId, cancelMotif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      setShowCancelModal(false);
      onCancel?.();
      router.push('/dashboard/mes-contrats');
    },
  });

  // Calculate time remaining
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const expirationDate = new Date(expiresAt);
      const now = new Date();
      const diff = expirationDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds, expired: false });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const { hours, minutes, seconds, expired } = timeRemaining;
  const isUrgent = hours < 6 && !expired;

  if (expired) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-green-800">
              Contrat actif
            </h3>
            <p className="mt-1 text-sm text-green-700">
              La période de rétractation est terminée.
              Le contrat est maintenant officiellement en vigueur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`rounded-lg border p-6 ${
          isUrgent
            ? 'border-red-200 bg-red-50'
            : 'border-yellow-200 bg-yellow-50'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3
              className={`text-lg font-medium ${
                isUrgent ? 'text-red-800' : 'text-yellow-800'
              }`}
            >
              Période de rétractation
            </h3>
            <p
              className={`mt-1 text-sm ${
                isUrgent ? 'text-red-700' : 'text-yellow-700'
              }`}
            >
              Vous pouvez encore annuler ce contrat sans frais
            </p>
          </div>
          <div
            className={`flex-shrink-0 rounded-full p-2 ${
              isUrgent ? 'bg-red-100' : 'bg-yellow-100'
            }`}
          >
            <svg
              className={`h-6 w-6 ${isUrgent ? 'text-red-600' : 'text-yellow-600'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Countdown timer */}
        <div className="mt-4 flex justify-center space-x-4">
          <div className="text-center">
            <div
              className={`text-3xl font-bold ${
                isUrgent ? 'text-red-600' : 'text-yellow-600'
              }`}
            >
              {hours.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-gray-500">heures</div>
          </div>
          <div className="text-3xl font-bold text-gray-400">:</div>
          <div className="text-center">
            <div
              className={`text-3xl font-bold ${
                isUrgent ? 'text-red-600' : 'text-yellow-600'
              }`}
            >
              {minutes.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-gray-500">minutes</div>
          </div>
          <div className="text-3xl font-bold text-gray-400">:</div>
          <div className="text-center">
            <div
              className={`text-3xl font-bold ${
                isUrgent ? 'text-red-600' : 'text-yellow-600'
              }`}
            >
              {seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-gray-500">secondes</div>
          </div>
        </div>

        {/* Cancel button */}
        <div className="mt-4">
          <Button
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => setShowCancelModal(true)}
          >
            Annuler le contrat
          </Button>
        </div>

        {/* Warning */}
        {isUrgent && (
          <div className="mt-4 flex items-center rounded-lg bg-red-100 p-3">
            <svg
              className="h-5 w-5 text-red-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="ml-2 text-sm text-red-700">
              <strong>Attention:</strong> Il reste peu de temps pour exercer votre droit de rétractation.
            </p>
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Annuler le contrat"
      >
        <div className="p-4">
          <div className="mb-4 rounded-lg bg-red-50 p-4">
            <div className="flex items-start">
              <svg
                className="h-6 w-6 text-red-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">
                  Cette action est irréversible
                </h4>
                <p className="mt-1 text-sm text-red-700">
                  Une fois annulé, ce contrat sera définitivement résilié et les deux parties seront notifiées.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motif de l&apos;annulation <span className="text-red-500">*</span>
            </label>
            <textarea
              value={cancelMotif}
              onChange={(e) => setCancelMotif(e.target.value)}
              placeholder="Veuillez expliquer la raison de votre annulation..."
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary-500 focus:ring-primary-500"
              rows={4}
              required
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCancelModal(false)}
            >
              Conserver le contrat
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={!cancelMotif.trim()}
              isLoading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Confirmer l&apos;annulation
            </Button>
          </div>

          {cancelMutation.isError && (
            <div className="mt-4 rounded-lg bg-red-50 p-3">
              <p className="text-sm text-red-600">
                {cancelMutation.error?.message || 'Une erreur est survenue'}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
