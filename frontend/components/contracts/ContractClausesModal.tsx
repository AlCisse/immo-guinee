'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button } from '@/components/ui/Button';

interface ContractClausesModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractType: string;
}

// Contract clauses by type
const contractClauses: Record<string, { title: string; articles: { title: string; content: string }[] }> = {
  BAIL_LOCATION_RESIDENTIEL: {
    title: 'Clauses du Bail de Location Résidentielle',
    articles: [
      {
        title: 'Article 1 - Objet du contrat',
        content: 'Le présent bail a pour objet la location du bien décrit ci-dessus pour un usage exclusif d\'habitation principale. Le preneur s\'engage à occuper personnellement les lieux loués et à ne pas en modifier la destination sans accord préalable du bailleur.',
      },
      {
        title: 'Article 2 - Paiement du loyer',
        content: 'Le loyer est payable d\'avance le 5 de chaque mois. En cas de retard de paiement supérieur à 15 jours, une pénalité de 2% par mois de retard sera appliquée. Le paiement peut être effectué par Mobile Money ou virement bancaire.',
      },
      {
        title: 'Article 3 - Dépôt de garantie (caution)',
        content: 'Le dépôt de garantie sera restitué dans un délai maximum de 30 jours suivant la remise des clés et l\'état des lieux de sortie. Des déductions pourront être opérées pour couvrir les éventuelles dégradations ou loyers impayés.',
      },
      {
        title: 'Article 4 - Charges et entretien',
        content: 'Les charges courantes (eau, électricité, services) sont à la charge exclusive du preneur. Le preneur s\'engage à maintenir le bien en bon état d\'entretien et à effectuer les réparations locatives courantes.',
      },
      {
        title: 'Article 5 - Travaux et modifications',
        content: 'Toute modification, transformation ou amélioration du bien nécessite l\'accord écrit et préalable du bailleur. À défaut, le bailleur pourra exiger la remise en état aux frais du preneur.',
      },
      {
        title: 'Article 6 - Sous-location',
        content: 'La sous-location totale ou partielle du bien est strictement interdite, sauf accord écrit du bailleur. En cas de non-respect, le bail pourra être résilié de plein droit.',
      },
      {
        title: 'Article 7 - Résiliation et préavis',
        content: 'Chaque partie peut résilier le bail moyennant un préavis de 3 mois, notifié par écrit. En cas de non-respect du préavis, une indemnité compensatoire sera due.',
      },
      {
        title: 'Article 8 - État des lieux',
        content: 'Un état des lieux contradictoire sera établi à l\'entrée et à la sortie du preneur. Tout désaccord sera soumis à la médiation ImmoGuinée avant recours aux tribunaux.',
      },
      {
        title: 'Article 9 - Droit de rétractation',
        content: 'Conformément aux dispositions ImmoGuinée, le preneur bénéficie d\'un délai de rétractation de 48 heures à compter de la signature électronique du contrat.',
      },
      {
        title: 'Article 10 - Règlement des litiges',
        content: 'En cas de litige, les parties s\'engagent à recourir prioritairement au service de médiation ImmoGuinée. À défaut de résolution amiable, les tribunaux de Conakry seront seuls compétents.',
      },
    ],
  },
  BAIL_LOCATION_COMMERCIAL: {
    title: 'Clauses du Bail Commercial',
    articles: [
      {
        title: 'Article 1 - Destination des lieux',
        content: 'Les locaux loués sont destinés exclusivement à l\'exercice de l\'activité commerciale mentionnée au contrat. Toute modification d\'activité nécessite l\'accord préalable et écrit du bailleur.',
      },
      {
        title: 'Article 2 - Droit au bail et fonds de commerce',
        content: 'Conformément aux dispositions de l\'Acte Uniforme OHADA, le preneur bénéficie d\'un droit au renouvellement du bail. La cession du droit au bail est soumise à l\'autorisation du bailleur.',
      },
      {
        title: 'Article 3 - Travaux d\'aménagement',
        content: 'Le preneur peut effectuer les travaux d\'aménagement nécessaires à son activité, sous réserve de l\'accord écrit du bailleur et du respect des normes en vigueur.',
      },
      {
        title: 'Article 4 - Révision du loyer',
        content: 'Le loyer pourra être révisé annuellement selon l\'indice des prix à la consommation publié par l\'Institut National de la Statistique de Guinée, avec un plafond de 5% par an.',
      },
      {
        title: 'Article 5 - Assurances',
        content: 'Le preneur s\'engage à souscrire une assurance couvrant les risques locatifs, le vol, l\'incendie et la responsabilité civile professionnelle.',
      },
      {
        title: 'Article 6 - Horaires d\'exploitation',
        content: 'Le preneur respectera les horaires d\'exploitation conformes à la réglementation locale et ne pourra exercer d\'activités nuisibles au voisinage.',
      },
    ],
  },
  PROMESSE_VENTE_TERRAIN: {
    title: 'Clauses de la Promesse de Vente de Terrain',
    articles: [
      {
        title: 'Article 1 - Conditions suspensives',
        content: 'La présente promesse est consentie sous les conditions suspensives suivantes: vérification du titre foncier par les services compétents, absence d\'hypothèques ou de servitudes non déclarées, obtention des autorisations administratives nécessaires.',
      },
      {
        title: 'Article 2 - Garanties du vendeur',
        content: 'Le promettant déclare être le propriétaire légitime et exclusif du terrain, libre de toute charge, hypothèque, servitude non apparente, et de tout litige en cours.',
      },
      {
        title: 'Article 3 - Origine de propriété',
        content: 'Le promettant s\'engage à fournir tous les documents relatifs à l\'origine de propriété du terrain, notamment le titre foncier, les attestations de non-litige, et tout acte antérieur.',
      },
      {
        title: 'Article 4 - Dédit et clause pénale',
        content: 'En cas de renonciation par le bénéficiaire, l\'acompte versé restera acquis au promettant. En cas de refus de vendre par le promettant, celui-ci devra restituer le double de l\'acompte.',
      },
      {
        title: 'Article 5 - Acte authentique',
        content: 'Les parties s\'engagent à signer l\'acte authentique de vente devant notaire dans le délai convenu. Les frais d\'acte et d\'enregistrement sont à la charge exclusive de l\'acquéreur.',
      },
      {
        title: 'Article 6 - Droit de rétractation',
        content: 'Conformément aux dispositions ImmoGuinée, l\'acquéreur bénéficie d\'un délai de rétractation de 48 heures. Passé ce délai, l\'acompte devient non remboursable sauf motif légitime.',
      },
    ],
  },
  MANDAT_GESTION: {
    title: 'Clauses du Mandat de Gestion',
    articles: [
      {
        title: 'Article 1 - Obligations du mandataire',
        content: 'Le mandataire s\'engage à: gérer le bien en bon père de famille, rechercher activement des locataires solvables, encaisser les loyers et les reverser dans les 10 jours ouvrés, tenir une comptabilité précise et transparente, informer le mandant de tout événement important.',
      },
      {
        title: 'Article 2 - Obligations du mandant',
        content: 'Le mandant s\'engage à: fournir tous les documents nécessaires à la location, maintenir le bien en état de location, assurer le bien (multirisque habitation propriétaire non occupant), régler les honoraires et commissions convenus.',
      },
      {
        title: 'Article 3 - Durée et résiliation',
        content: 'Le mandat est consenti pour une durée initiale renouvelable par tacite reconduction. Chaque partie peut le résilier moyennant un préavis de 3 mois notifié par écrit.',
      },
    ],
  },
  ATTESTATION_CAUTION: {
    title: 'Conditions de l\'Attestation de Caution',
    articles: [
      {
        title: 'Article 1 - Conservation',
        content: 'La caution sera conservée en séquestre par ImmoGuinée pendant toute la durée du bail.',
      },
      {
        title: 'Article 2 - Restitution',
        content: 'La restitution interviendra dans un délai maximum de 30 jours après la remise des clés et l\'état des lieux de sortie.',
      },
      {
        title: 'Article 3 - Déductions',
        content: 'Des déductions pourront être opérées pour couvrir les éventuelles dégradations constatées lors de l\'état des lieux de sortie ainsi que les loyers impayés.',
      },
      {
        title: 'Article 4 - Interdiction',
        content: 'La caution ne peut en aucun cas être utilisée comme paiement du dernier mois de loyer.',
      },
    ],
  },
};

export default function ContractClausesModal({
  isOpen,
  onClose,
  contractType,
}: ContractClausesModalProps) {
  const clauses = contractClauses[contractType] || contractClauses.BAIL_LOCATION_RESIDENTIEL;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="bg-primary-600 px-6 py-4">
                  <Dialog.Title className="text-xl font-bold text-white">
                    {clauses.title}
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-primary-100">
                    Veuillez lire attentivement toutes les clauses avant de signer
                  </p>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                  <div className="space-y-6">
                    {clauses.articles.map((article, index) => (
                      <div key={index} className="border-b border-gray-100 pb-4 last:border-0">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {article.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Legal notice */}
                  <div className="mt-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                    <div className="flex">
                      <svg className="h-5 w-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-yellow-800">
                          Conformité légale
                        </h4>
                        <p className="mt-1 text-sm text-yellow-700">
                          Ce contrat est établi conformément à la Loi L/2016/037/AN du 28 juillet 2016
                          (Code Civil de Guinée) et l&apos;Acte Uniforme OHADA relatif au Droit Commercial Général.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    {clauses.articles.length} articles
                  </p>
                  <Button
                    variant="primary"
                    onClick={onClose}
                  >
                    J&apos;ai lu et compris
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
