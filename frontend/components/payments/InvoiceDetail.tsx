'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface Payment {
  id: string;
  reference_paiement: string;
  montant_loyer: number;
  montant_caution: number;
  montant_frais_service: number;
  montant_total: number;
  methode_paiement: string;
  statut_paiement: string;
  quittance_url: string | null;
  created_at: string;
  date_validation_proprietaire: string | null;
  contrat: {
    id: string;
    reference: string;
    listing: {
      titre: string;
      quartier: string;
    };
  };
  beneficiaire: {
    nom_complet: string;
  };
}

interface InvoiceDetailProps {
  payment: Payment;
  onClose: () => void;
}

export default function InvoiceDetail({ payment, onClose }: InvoiceDetailProps) {
  const formatAmount = (amount: number) =>
    amount.toLocaleString('fr-GN') + ' GNF';

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      en_attente: 'En attente de paiement',
      en_cours: 'Paiement en cours',
      escrow: 'En séquestre (48h)',
      confirme: 'Paiement confirmé',
      rembourse: 'Remboursé',
      litige: 'En litige',
      echoue: 'Paiement échoué',
    };
    return labels[status] || status;
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      orange_money: 'Orange Money',
      mtn_momo: 'MTN Mobile Money',
      especes: 'Espèces',
      virement: 'Virement bancaire',
    };
    return labels[method] || method;
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Détail du paiement">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {payment.reference_paiement}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(payment.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                payment.statut_paiement === 'confirme'
                  ? 'bg-green-100 text-green-700'
                  : payment.statut_paiement === 'escrow'
                  ? 'bg-purple-100 text-purple-700'
                  : payment.statut_paiement === 'litige'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {getStatusLabel(payment.statut_paiement)}
            </span>
          </div>
        </div>

        {/* Property info */}
        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Bien concerné</h4>
          <p className="font-medium text-gray-900">
            {payment.contrat?.listing?.titre}
          </p>
          <p className="text-sm text-gray-500">
            {payment.contrat?.listing?.quartier}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Contrat: {payment.contrat?.reference}
          </p>
        </div>

        {/* Beneficiary */}
        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Bénéficiaire</h4>
          <p className="font-medium text-gray-900">
            {payment.beneficiaire?.nom_complet}
          </p>
        </div>

        {/* Invoice breakdown (FR-041) */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-900">Détail de la facture</h4>
          </div>
          <div className="divide-y divide-gray-100">
            {/* Section 1: Avance */}
            {payment.montant_loyer > 0 && (
              <div className="px-4 py-3 flex justify-between">
                <div>
                  <p className="text-sm text-gray-900">Loyer / Avance</p>
                  <p className="text-xs text-gray-500">Premier(s) mois de loyer</p>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {formatAmount(payment.montant_loyer)}
                </p>
              </div>
            )}

            {/* Section 2: Caution */}
            {payment.montant_caution > 0 && (
              <div className="px-4 py-3 flex justify-between">
                <div>
                  <p className="text-sm text-gray-900">Caution</p>
                  <p className="text-xs text-gray-500">Dépôt de garantie</p>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {formatAmount(payment.montant_caution)}
                </p>
              </div>
            )}

            {/* Section 3: Commission (non-refundable) */}
            <div className="px-4 py-3 flex justify-between bg-yellow-50">
              <div>
                <p className="text-sm text-gray-900">Commission plateforme</p>
                <p className="text-xs text-red-600 font-medium">Non remboursable</p>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {formatAmount(payment.montant_frais_service)}
              </p>
            </div>

            {/* Total */}
            <div className="px-4 py-4 flex justify-between bg-primary-50">
              <p className="text-base font-semibold text-gray-900">Total</p>
              <p className="text-lg font-bold text-primary-600">
                {formatAmount(payment.montant_total)}
              </p>
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Mode de paiement</h4>
          <p className="font-medium text-gray-900">
            {getMethodLabel(payment.methode_paiement)}
          </p>
        </div>

        {/* Escrow info */}
        {payment.statut_paiement === 'escrow' && (
          <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-purple-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-purple-800">Fonds en séquestre</p>
                <p className="text-sm text-purple-700 mt-1">
                  Le paiement est sécurisé. Les fonds seront libérés au propriétaire après
                  validation ou automatiquement après 48h.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Validation info */}
        {payment.date_validation_proprietaire && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">Validé par le propriétaire</p>
                <p className="text-sm text-green-700">
                  Le {new Date(payment.date_validation_proprietaire).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Fermer
          </Button>
          {payment.quittance_url && (
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => window.open(payment.quittance_url!, '_blank')}
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger quittance
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
