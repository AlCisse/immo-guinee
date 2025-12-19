// User types
export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string;
  role: 'USER' | 'AGENT' | 'AGENCE' | 'ADMIN' | 'SUPER_ADMIN';
  avatar_url: string | null;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_at: string;
}

// Listing types
export interface Listing {
  id: string;
  titre: string;
  description: string;
  type_transaction: 'VENTE' | 'LOCATION';
  type_bien: string;
  prix: number;
  prix_periode?: 'JOUR' | 'SEMAINE' | 'MOIS' | 'ANNEE';
  surface: number;
  nb_chambres: number | null;
  nb_salles_bain: number | null;
  nb_etages: number | null;
  annee_construction: number | null;
  meuble: boolean;
  adresse: string;
  ville: string;
  commune: string | null;
  quartier: string | null;
  latitude: number | null;
  longitude: number | null;
  statut: 'BROUILLON' | 'EN_ATTENTE' | 'ACTIVE' | 'LOUEE' | 'VENDUE' | 'ARCHIVEE';
  certifie: boolean;
  featured: boolean;
  vues: number;
  user_id: string;
  user: User;
  medias: Media[];
  amenities: Amenity[];
  created_at: string;
  updated_at: string;
}

export interface Media {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  ordre: number;
  is_primary: boolean;
}

export interface Amenity {
  id: string;
  nom: string;
  icone: string;
  categorie: string;
}

// Search & Filter types
export interface SearchFilters {
  type_transaction?: 'VENTE' | 'LOCATION';
  type_bien?: string;
  ville?: string;
  commune?: string;
  prix_min?: number;
  prix_max?: number;
  surface_min?: number;
  surface_max?: number;
  nb_chambres_min?: number;
  meuble?: boolean;
  certifie?: boolean;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// Message types
export interface Conversation {
  id: string;
  listing_id: string;
  listing: Listing;
  participants: User[];
  last_message: Message | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: User;
  content: string;
  read_at: string | null;
  created_at: string;
}

// Visit types
export interface Visit {
  id: string;
  listing_id: string;
  listing: Listing;
  visitor_id: string;
  visitor: User;
  date_visite: string;
  heure_debut: string;
  heure_fin: string;
  statut: 'EN_ATTENTE' | 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE';
  notes: string | null;
  created_at: string;
}

// Favorite type
export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  listing: Listing;
  created_at: string;
}

// Navigation types
export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  ListingDetail: { id: string };
  Search: { filters?: SearchFilters };
  UserProfile: { id: string };
  EditListing: { id?: string };
  Chat: { conversationId: string };
  VisitBooking: { listingId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Publish: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { phone: string; type: 'login' | 'register' };
};
