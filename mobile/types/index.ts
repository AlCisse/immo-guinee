// Types compatible with backend and frontend

export interface User {
  id: string;
  nom_complet: string;
  telephone: string;
  email?: string;
  type_compte: 'PARTICULIER' | 'PROFESSIONNEL' | 'AGENCE';
  photo_profil?: string;
  badge?: 'DEBUTANT' | 'VERIFIE' | 'PREMIUM' | 'SUPER_PROPRIO';
  telephone_verifie: boolean;
  email_verifie?: boolean;
  avg_rating?: number;
  created_at: string;
}

export interface Listing {
  id: string;
  user_id: string;
  titre: string;
  description: string;
  type_bien: 'APPARTEMENT' | 'MAISON' | 'VILLA' | 'STUDIO' | 'TERRAIN' | 'BUREAU' | 'COMMERCIAL';
  type_transaction: 'LOCATION' | 'LOCATION_COURTE' | 'VENTE';
  quartier: string;
  commune: string;
  adresse_complete?: string;
  loyer_mensuel: number;
  caution?: number;
  avance?: number;
  commission_mois?: number;
  duree_minimum_jours?: number;
  nombre_chambres?: number;
  nombre_salles_bain?: number;
  surface_m2?: number;
  meuble: boolean;
  type_locataire_prefere?: 'tous' | 'couple' | 'marie_absent' | 'celibataire' | 'etudiant';
  commodites?: string[];
  photos?: ListingPhoto[];
  photo_principale?: string;
  main_photo_url?: string;
  statut: 'BROUILLON' | 'EN_ATTENTE' | 'ACTIVE' | 'EXPIREE' | 'SUSPENDUE' | 'ARCHIVEE';
  disponible: boolean;
  date_disponibilite?: string;
  slug: string;
  vues_count: number;
  favoris_count: number;
  created_at: string;
  updated_at: string;
  user?: User;
  formatted_price?: string;
}

export interface ListingPhoto {
  id: string;
  url: string;
  thumbnail_url?: string;
  medium_url?: string;
  is_primary: boolean;
  order: number;
}

export interface Conversation {
  id: string;
  listing_id: string;
  listing?: Listing;
  participants: User[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: User;
  type_message: 'TEXT' | 'IMAGE' | 'DOCUMENT';
  contenu: string;
  fichier_url?: string;
  lu: boolean;
  created_at: string;
}

export interface Visit {
  id: string;
  listing_id: string;
  listing?: Listing;
  visiteur_id?: string;
  visiteur?: User;
  proprietaire_id: string;
  proprietaire?: User;
  client_nom: string;
  client_telephone: string;
  client_email?: string;
  date_visite: string;
  heure_visite: string;
  duree_minutes: number;
  statut: 'PLANIFIEE' | 'CONFIRMEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE' | 'NO_SHOW';
  notes?: string;
  created_at: string;
}

export interface Contract {
  id: string;
  listing_id: string;
  listing?: Listing;
  proprietaire_id: string;
  proprietaire?: User;
  locataire_id: string;
  locataire?: User;
  type_contrat: 'BAIL_HABITATION' | 'BAIL_COMMERCIAL' | 'MANDAT_GESTION' | 'COURTE_DUREE';
  statut: 'BROUILLON' | 'EN_ATTENTE' | 'SIGNE_PROPRIETAIRE' | 'SIGNE_LOCATAIRE' | 'ACTIF' | 'TERMINE' | 'RESILIE';
  date_debut: string;
  date_fin?: string;
  loyer_mensuel: number;
  caution: number;
  pdf_url?: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  listing?: Listing;
  created_at: string;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// Filter types for listings
export interface ListingFilters {
  type_bien?: string;
  type_transaction?: string;
  commune?: string;
  quartier?: string;
  prix_min?: number;
  prix_max?: number;
  chambres_min?: number;
  surface_min?: number;
  meuble?: boolean;
  equipements?: string[];
}
