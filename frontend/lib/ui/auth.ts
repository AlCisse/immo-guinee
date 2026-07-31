// U2 — source unique de vérité pour les dégradés de marque des écrans
// d'authentification. Avant, le dégradé d'arrière-plan `from-primary-600 via-
// primary-500 to-primary-400` était copié en dur dans chaque page d'auth
// (forgot-password, reset-password, inscription...), ce qui divergeait à chaque
// retouche de charte. Centralisé ici, un changement de marque se propage partout.
//
// Utilisation :
//   import { AUTH_GRADIENT_BG } from '@/lib/ui/auth';
//   <div className={`min-h-screen ${AUTH_GRADIENT_BG} flex flex-col`}>

/** Dégradé plein écran des pages d'auth (fond de marque « Argile de Conakry »). */
export const AUTH_GRADIENT_BG =
  'bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400';

/** Bouton principal CTA des écrans d'auth (dégradé primary + état hover). */
export const AUTH_BUTTON_GRADIENT =
  'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/25';