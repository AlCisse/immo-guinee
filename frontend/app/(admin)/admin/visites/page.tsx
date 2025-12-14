'use client';

import { Calendar, Construction } from 'lucide-react';

export default function VisitesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Calendar className="w-7 h-7 text-primary-500" />
          Gestion des visites
        </h1>
        <p className="text-gray-600 mt-1">Planifiez et gérez les visites de biens</p>
      </div>

      {/* Coming Soon */}
      <div className="bg-white rounded-xl p-12 shadow-sm text-center">
        <Construction className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Fonctionnalité à venir</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          La gestion des visites sera disponible dans une prochaine mise à jour.
          Cette fonctionnalité permettra de planifier, confirmer et suivre les visites de propriétés.
        </p>
      </div>
    </div>
  );
}
