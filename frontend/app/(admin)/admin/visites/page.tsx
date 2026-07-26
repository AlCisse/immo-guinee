'use client';

import { Calendar, Construction } from 'lucide-react';

export default function VisitesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
          <Calendar className="w-7 h-7 text-primary-500" />
          Gestion des visites
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">Planifiez et gérez les visites de biens</p>
      </div>

      {/* Coming Soon */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-12 shadow-sm text-center">
        <Construction className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">Fonctionnalité à venir</h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
          La gestion des visites sera disponible dans une prochaine mise à jour.
          Cette fonctionnalité permettra de planifier, confirmer et suivre les visites de propriétés.
        </p>
      </div>
    </div>
  );
}
