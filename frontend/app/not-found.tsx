import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-500">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-neutral-900">
          Page introuvable
        </h2>
        <p className="mt-2 text-neutral-600 max-w-md mx-auto">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
          >
            Retour à l'accueil
          </Link>
          <Link
            href="/recherche"
            className="px-6 py-3 border border-primary-500 text-primary-500 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
          >
            Rechercher un bien
          </Link>
        </div>
      </div>
    </div>
  );
}
