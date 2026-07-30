import { useSearchParams } from 'next/navigation';

/**
 * useSearchParams() retourne `ReadonlyURLSearchParams | null` (null côté SSR /
 * avant l'hydratation). De nombreux composants lisent `searchParams.get(...)`
 * dans l'initialiseur de useState, ce qui déclenche TS18047 (« possibly null »)
 * sur chaque accès. Plutôt qu'éparpiller des `!` (assertions qui masquent un
 * vrai retour null) ou des guards partout, on renvoie ici une instance non
 * nulle : en l'absence de query string on obtient un objet vide (comportement
 * identique à une URL sans paramètres — `get()` renvoie `null`).
 *
 * On renvoie un `URLSearchParams` (mutable) construit depuis la chaîne de
 * requête : `ReadonlyURLSearchParams` omet les mutateurs et n'est donc pas
 * assignable à `URLSearchParams`, mais `.get()` — la seule chose que lisent les
 * appelants — a la même signature sur les deux types. Aucune assertion `!` ni
 * cast : le fallback est nommé, documenté et honnête.
 */
export function useSearchParamsSafe(): URLSearchParams {
  const sp = useSearchParams();
  return new URLSearchParams(sp ? sp.toString() : '');
}