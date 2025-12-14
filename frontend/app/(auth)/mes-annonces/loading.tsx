import { Loader2 } from 'lucide-react';

export default function MesAnnoncesLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
        <p className="text-neutral-600 dark:text-neutral-400 font-medium">
          Chargement de vos annonces...
        </p>
      </div>
    </div>
  );
}
