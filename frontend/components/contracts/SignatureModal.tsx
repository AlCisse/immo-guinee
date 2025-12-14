'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (otp: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  contractReference: string;
  otpExpiresIn?: number;
}

export default function SignatureModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  error,
  contractReference,
  otpExpiresIn = 300,
}: SignatureModalProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // FR-028: 4-step process
  const [countdown, setCountdown] = useState(otpExpiresIn);
  const [accepted, setAccepted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      setStep(1);
      setCountdown(otpExpiresIn);
      setAccepted(false);
    }
  }, [isOpen, otpExpiresIn]);

  // Countdown timer
  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, countdown]);

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const otpComplete = otp.every((digit) => digit !== '');

  const handleSubmit = async () => {
    if (!otpComplete) return;
    await onSubmit(otp.join(''));
    setStep(4); // Success step
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="px-2 pb-4">
        {/* Progress indicator */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    step >= stepNum
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step > stepNum ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                {stepNum < 4 && (
                  <div
                    className={`h-0.5 w-8 ${
                      step > stepNum ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Accept terms */}
        {step === 1 && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <svg
                className="h-8 w-8 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Signature électronique
            </h3>
            <p className="text-gray-600 mb-6">
              Vous êtes sur le point de signer le contrat{' '}
              <span className="font-medium">{contractReference}</span>
            </p>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left mb-6">
              <h4 className="font-medium text-gray-900 mb-2">
                Avant de continuer, confirmez que:
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <svg
                    className="mr-2 h-5 w-5 text-gray-400 flex-shrink-0"
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
                  Vous avez lu et compris le contenu du contrat
                </li>
                <li className="flex items-start">
                  <svg
                    className="mr-2 h-5 w-5 text-gray-400 flex-shrink-0"
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
                  Vous acceptez les conditions décrites
                </li>
                <li className="flex items-start">
                  <svg
                    className="mr-2 h-5 w-5 text-gray-400 flex-shrink-0"
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
                  Vous avez accès à votre téléphone pour recevoir le code OTP
                </li>
              </ul>
            </div>

            <label className="flex items-center justify-center mb-6">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                J&apos;accepte les conditions et la politique de confidentialité
              </span>
            </label>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Annuler
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                disabled={!accepted}
                onClick={() => setStep(2)}
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Enter OTP */}
        {step === 2 && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <svg
                className="h-8 w-8 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Vérification OTP
            </h3>
            <p className="text-gray-600 mb-6">
              Un code à 6 chiffres a été envoyé à votre téléphone.
              <br />
              Saisissez-le ci-dessous.
            </p>

            {/* OTP Input */}
            <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="h-12 w-12 rounded-lg border border-gray-300 text-center text-xl font-semibold focus:border-primary-500 focus:ring-primary-500"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {/* Countdown */}
            <p className={`text-sm mb-6 ${countdown < 60 ? 'text-red-600' : 'text-gray-500'}`}>
              Code valide pendant: {formatTime(countdown)}
            </p>

            {/* Error message */}
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                disabled={!otpComplete || countdown === 0}
                onClick={() => setStep(3)}
              >
                Vérifier
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <svg
                className="h-8 w-8 text-yellow-600"
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
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Confirmation finale
            </h3>
            <p className="text-gray-600 mb-6">
              Vous êtes sur le point de signer définitivement ce contrat.
              <br />
              Cette action est irréversible.
            </p>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Période de rétractation:</strong> Après signature des deux parties,
                vous disposerez de 48 heures pour annuler le contrat sans frais.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Retour
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                isLoading={isLoading}
                onClick={handleSubmit}
              >
                Signer maintenant
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Signature enregistrée!
            </h3>
            <p className="text-gray-600 mb-6">
              Votre signature a été enregistrée avec succès.
              Un cachet électronique horodaté a été ajouté au contrat.
            </p>

            <Button variant="primary" className="w-full" onClick={onClose}>
              Fermer
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
