'use client';

import { useEffect, useState } from 'react';

/**
 * R15 — suivi de la connectivité navigateur.
 *
 * React Query gère déjà le refetch automatique au retour réseau, mais
 * l'utilisateur n'a aucun signal visuel quand il est hors-ligne : il peut
 * croire que les données affichées sont fraîches alors qu'elles viennent du
 * cache. Ce hook alimente la bannière globale `OfflineIndicator`.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Synchronise l'état initial au montage ( SSR-safe : ne s'exécute qu'client).
    setOnline(navigator.onLine);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}