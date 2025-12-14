'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { TransparencyWarning } from '@/components/payments';
import { useProcessPayment, usePaymentStatus, formatPaymentAmount, PaymentInvoice } from '@/lib/hooks/usePayments';

type PaymentMethod = 'orange_money' | 'mtn_momo' | 'especes';

interface PaymentFormProps {
  contractId: string;
  invoice: PaymentInvoice;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

type Step = 'method' | 'phone' | 'otp' | 'processing' | 'success' | 'error';

export default function PaymentForm({ contractId, invoice, onSuccess, onCancel }: PaymentFormProps) {
  const [step, setStep] = useState<Step>('method');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const processPayment = useProcessPayment();
  const { data: paymentStatus, isLoading: statusLoading } = usePaymentStatus(
    paymentId || '',
    step === 'processing' && !!paymentId
  );

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Monitor payment status
  useEffect(() => {
    if (paymentStatus) {
      if (paymentStatus.status === 'escrow' || paymentStatus.status === 'confirme') {
        setStep('success');
        if (paymentId) {
          onSuccess(paymentId);
        }
      } else if (paymentStatus.status === 'echoue') {
        setStep('error');
        setError(paymentStatus.message || 'Le paiement a échoué');
      }
    }
  }, [paymentStatus, paymentId, onSuccess]);

  const handleMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setError(null);
    if (method === 'especes') {
      // Cash payments handled differently - show info
      setStep('phone'); // Will show cash instructions instead
    } else {
      setStep('phone');
    }
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      setError('Veuillez entrer un numéro de téléphone valide');
      return;
    }

    // Validate phone prefix matches payment method
    const prefix = phoneNumber.substring(0, 2);
    if (paymentMethod === 'orange_money' && !['62', '63', '64', '65', '66'].includes(prefix)) {
      setError('Ce numéro ne semble pas être un numéro Orange Money');
      return;
    }
    if (paymentMethod === 'mtn_momo' && !['66', '67', '68', '69'].includes(prefix)) {
      setError('Ce numéro ne semble pas être un numéro MTN');
      return;
    }

    setError(null);
    setOtpSent(true);
    setCountdown(60);
    setStep('otp');
  };

  const handleResendOtp = () => {
    if (countdown === 0) {
      setCountdown(60);
      // In real implementation, this would trigger OTP resend
    }
  };

  const handleOtpSubmit = async () => {
    if (otpCode.length !== 6) {
      setError('Le code OTP doit contenir 6 chiffres');
      return;
    }

    setError(null);
    setStep('processing');

    try {
      const payment = await processPayment.mutateAsync({
        contract_id: contractId,
        methode_paiement: paymentMethod!,
        numero_telephone: phoneNumber,
      });

      setPaymentId(payment.id);
      // Payment status will be monitored by usePaymentStatus hook
    } catch (err: unknown) {
      setStep('error');
      if (err instanceof Error) {
        setError(err.message || 'Une erreur est survenue lors du paiement');
      } else {
        setError('Une erreur est survenue lors du paiement');
      }
    }
  };

  const handleCashPayment = async () => {
    if (!acceptedTerms) {
      setError('Vous devez accepter les conditions pour continuer');
      return;
    }

    setError(null);
    setStep('processing');

    try {
      const payment = await processPayment.mutateAsync({
        contract_id: contractId,
        methode_paiement: 'especes',
      });

      setPaymentId(payment.id);
      setStep('success');
      onSuccess(payment.id);
    } catch (err: unknown) {
      setStep('error');
      if (err instanceof Error) {
        setError(err.message || 'Une erreur est survenue');
      } else {
        setError('Une erreur est survenue');
      }
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Choisissez votre mode de paiement
        </h3>
        <p className="text-sm text-gray-500">
          Contrat: {invoice.contract_reference}
        </p>
      </div>

      {/* Invoice summary */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900">Montant à payer</h4>
        </div>
        <div className="divide-y divide-gray-100">
          {invoice.sections.map((section, idx) => (
            <div key={idx} className={`px-4 py-3 flex justify-between ${section.non_refundable ? 'bg-yellow-50' : ''}`}>
              <div>
                <p className="text-sm text-gray-900">{section.label}</p>
                {section.description && (
                  <p className="text-xs text-gray-500">{section.description}</p>
                )}
                {section.non_refundable && (
                  <p className="text-xs text-red-600 font-medium">Non remboursable</p>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900">{section.formatted}</p>
            </div>
          ))}
          <div className="px-4 py-4 flex justify-between bg-primary-50">
            <p className="text-base font-semibold text-gray-900">Total</p>
            <p className="text-lg font-bold text-primary-600">{invoice.total.formatted}</p>
          </div>
        </div>
      </div>

      {/* Transparency warning */}
      <TransparencyWarning />

      {/* Payment method buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => handleMethodSelect('orange_money')}
          className="flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-3 group-hover:bg-orange-200">
            <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900 group-hover:text-orange-600">
            Orange Money
          </span>
          <span className="text-xs text-gray-500 mt-1">Instantané</span>
        </button>

        <button
          onClick={() => handleMethodSelect('mtn_momo')}
          className="flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-3 group-hover:bg-yellow-200">
            <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900 group-hover:text-yellow-600">
            MTN MoMo
          </span>
          <span className="text-xs text-gray-500 mt-1">Instantané</span>
        </button>

        <button
          onClick={() => handleMethodSelect('especes')}
          className="flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3 group-hover:bg-green-200">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900 group-hover:text-green-600">
            Espèces
          </span>
          <span className="text-xs text-gray-500 mt-1">En agence</span>
        </button>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );

  const renderPhoneInput = () => {
    if (paymentMethod === 'especes') {
      return (
        <div className="space-y-6">
          <div className="flex items-center">
            <button
              onClick={() => setStep('method')}
              className="mr-4 p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-lg font-semibold text-gray-900">
              Paiement en espèces
            </h3>
          </div>

          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">Instructions pour le paiement en espèces</p>
                <ol className="mt-2 text-sm text-green-700 list-decimal pl-5 space-y-2">
                  <li>Présentez-vous dans l&apos;une de nos agences partenaires</li>
                  <li>Communiquez la référence du contrat: <strong>{invoice.contract_reference}</strong></li>
                  <li>Payez le montant total: <strong>{invoice.total.formatted}</strong></li>
                  <li>Conservez votre reçu comme preuve de paiement</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Montant à payer</h4>
            <p className="text-2xl font-bold text-primary-600">{invoice.total.formatted}</p>
            <p className="text-sm text-gray-500 mt-1">
              Dont {invoice.pour_plateforme.formatted} de commission (non remboursable)
            </p>
          </div>

          <div className="flex items-start">
            <input
              id="accept-terms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-1"
            />
            <label htmlFor="accept-terms" className="ml-3 text-sm text-gray-600">
              J&apos;ai compris que la commission plateforme ({invoice.pour_plateforme.formatted}) est{' '}
              <strong>non remboursable</strong> en cas d&apos;annulation ou de litige (FR-042)
            </label>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Annuler
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleCashPayment}
              disabled={!acceptedTerms || processPayment.isPending}
            >
              {processPayment.isPending ? 'Traitement...' : 'Confirmer le paiement'}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <button
            onClick={() => setStep('method')}
            className="mr-4 p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-lg font-semibold text-gray-900">
            {paymentMethod === 'orange_money' ? 'Orange Money' : 'MTN MoMo'}
          </h3>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Montant à payer</h4>
          <p className="text-2xl font-bold text-primary-600">{invoice.total.formatted}</p>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            Numéro de téléphone {paymentMethod === 'orange_money' ? 'Orange' : 'MTN'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              +224
            </span>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="6XX XX XX XX"
              className="w-full pl-14 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              maxLength={9}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {paymentMethod === 'orange_money'
              ? 'Numéros commençant par 62, 63, 64, 65 ou 66'
              : 'Numéros commençant par 66, 67, 68 ou 69'}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handlePhoneSubmit}
            disabled={phoneNumber.length < 9}
          >
            Continuer
          </Button>
        </div>
      </div>
    );
  };

  const renderOtpInput = () => (
    <div className="space-y-6">
      <div className="flex items-center">
        <button
          onClick={() => setStep('phone')}
          className="mr-4 p-2 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          Vérification OTP
        </h3>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">Code envoyé</p>
            <p className="text-sm text-blue-700 mt-1">
              Un code de vérification a été envoyé au +224 {phoneNumber}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
          Code de vérification (6 chiffres)
        </label>
        <input
          id="otp"
          type="text"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-2xl tracking-widest"
          maxLength={6}
        />
      </div>

      <div className="flex items-center justify-center">
        {countdown > 0 ? (
          <p className="text-sm text-gray-500">
            Renvoyer le code dans {countdown}s
          </p>
        ) : (
          <button
            onClick={handleResendOtp}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Renvoyer le code
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleOtpSubmit}
          disabled={otpCode.length !== 6 || processPayment.isPending}
        >
          {processPayment.isPending ? 'Traitement...' : 'Confirmer le paiement'}
        </Button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="space-y-6 text-center py-8">
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600"></div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Traitement en cours...
        </h3>
        <p className="text-sm text-gray-500 mt-2">
          Veuillez patienter pendant que nous traitons votre paiement.
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Ne fermez pas cette fenêtre.
        </p>
      </div>

      {paymentMethod !== 'especes' && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-left">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">Validation requise</p>
              <p className="text-sm text-yellow-700 mt-1">
                Vous allez recevoir une demande de confirmation sur votre téléphone.
                Veuillez valider le paiement sur votre application{' '}
                {paymentMethod === 'orange_money' ? 'Orange Money' : 'MTN MoMo'}.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-6 text-center py-8">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Paiement réussi !
        </h3>
        <p className="text-sm text-gray-500 mt-2">
          Votre paiement de {invoice.total.formatted} a été effectué avec succès.
        </p>
      </div>

      <div className="rounded-lg bg-purple-50 border border-purple-200 p-4 text-left">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-purple-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-purple-800">Fonds en séquestre</p>
            <p className="text-sm text-purple-700 mt-1">
              Les fonds sont sécurisés et seront libérés au propriétaire après validation
              ou automatiquement après 48h.
            </p>
          </div>
        </div>
      </div>

      <Button variant="primary" onClick={() => onSuccess(paymentId!)} className="w-full">
        Voir le détail du paiement
      </Button>
    </div>
  );

  const renderError = () => (
    <div className="space-y-6 text-center py-8">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Échec du paiement
        </h3>
        <p className="text-sm text-red-600 mt-2">
          {error || 'Une erreur est survenue lors du paiement'}
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={() => {
            setStep('method');
            setError(null);
            setOtpCode('');
            setPaymentId(null);
          }}
        >
          Réessayer
        </Button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg mx-auto">
      {/* Progress indicator */}
      {!['processing', 'success', 'error'].includes(step) && (
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'method' ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-600'
            }`}>
              1
            </div>
            <div className={`w-12 h-1 ${['phone', 'otp'].includes(step) ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'phone' ? 'bg-primary-600 text-white' : ['otp'].includes(step) ? 'bg-primary-100 text-primary-600' : 'bg-gray-200 text-gray-400'
            }`}>
              2
            </div>
            <div className={`w-12 h-1 ${step === 'otp' ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'otp' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              3
            </div>
          </div>
        </div>
      )}

      {step === 'method' && renderMethodSelection()}
      {step === 'phone' && renderPhoneInput()}
      {step === 'otp' && renderOtpInput()}
      {step === 'processing' && renderProcessing()}
      {step === 'success' && renderSuccess()}
      {step === 'error' && renderError()}
    </div>
  );
}
