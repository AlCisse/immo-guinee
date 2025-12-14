'use client';

import { useState } from 'react';

interface TransparencyWarningProps {
  showDetails?: boolean;
}

export default function TransparencyWarning({ showDetails = false }: TransparencyWarningProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Information importante sur les commissions (FR-042)
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            La commission plateforme est <strong>non remboursable</strong> en cas
            d&apos;annulation du contrat ou de litige.
          </p>

          {!isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
            >
              En savoir plus sur nos tarifs
            </button>
          )}

          {isExpanded && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-white p-3 border border-yellow-100">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Grille tarifaire ImmoGuinée
                </h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-2">Type de transaction</th>
                      <th className="pb-2 text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-t border-gray-100">
                      <td className="py-2">Location (résidentielle/commerciale)</td>
                      <td className="py-2 text-right font-medium">50% d&apos;un mois de loyer</td>
                    </tr>
                    <tr className="border-t border-gray-100">
                      <td className="py-2">Vente de terrain</td>
                      <td className="py-2 text-right font-medium">1% du prix de vente</td>
                    </tr>
                    <tr className="border-t border-gray-100">
                      <td className="py-2">Vente de maison/villa/appartement</td>
                      <td className="py-2 text-right font-medium">2% du prix de vente</td>
                    </tr>
                    <tr className="border-t border-gray-100">
                      <td className="py-2">Mandat de gestion</td>
                      <td className="py-2 text-right font-medium">8% du loyer (mensuel)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg bg-white p-3 border border-yellow-100">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Réductions selon votre badge
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-amber-600 mr-2"></span>
                    <span>Bronze: Tarif standard</span>
                  </li>
                  <li className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-gray-400 mr-2"></span>
                    <span>Argent: -5% sur la commission</span>
                  </li>
                  <li className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                    <span>Or: -10% sur la commission</span>
                  </li>
                  <li className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-2"></span>
                    <span>Diamant: -15% sur la commission</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-red-50 p-3 border border-red-100">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-500 mr-2 flex-shrink-0"
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
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Politique de non-remboursement
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      La commission plateforme couvre les frais de mise en relation,
                      vérification des parties, génération des contrats et support.
                      Elle n&apos;est jamais remboursée, même en cas de:
                    </p>
                    <ul className="mt-2 text-sm text-red-700 list-disc pl-5 space-y-1">
                      <li>Annulation du contrat pendant la période de rétractation</li>
                      <li>Résiliation anticipée du bail</li>
                      <li>Litige entre les parties</li>
                      <li>Échec de la transaction</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsExpanded(false)}
                className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
              >
                Masquer les détails
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
