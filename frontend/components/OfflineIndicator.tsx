'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';

/**
 * R15 — bannière hors-ligne globale.
 *
 * Affichée uniquement quand le navigateur passe offline ; rappelle que les
 * données affichées sont en cache (React Query offlineFirst) et seront
 * resynchronisées au retour du réseau. Volontairement légère (pas de
 * framer-motion) car montée dans le layout racine de toutes les pages.
 */
export default function OfflineIndicator() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[100] bg-warning-500 text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-2 animate-slide-down shadow-md"
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>
        Mode hors-ligne — les modifications seront synchronisées au retour du réseau.
      </span>
    </div>
  );
}