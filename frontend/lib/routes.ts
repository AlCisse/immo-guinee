/**
 * Centralized routes configuration for ImmoGuinée
 * All navigation links must use these constants - no hardcoded URLs
 */

import {
  Home,
  Search,
  Heart,
  MessageSquare,
  User,
  Settings,
  HelpCircle,
  FileText,
  LayoutDashboard,
  ClipboardList,
} from 'lucide-react';

// Route paths
export const ROUTES = {
  // Public routes
  HOME: '/',
  SEARCH: '/recherche',
  SEARCH_LOCATION: '/recherche?type_transaction=LOCATION',
  SEARCH_VENTE: '/recherche?type_transaction=VENTE',
  SEARCH_COMMERCIAL: '/recherche?type_bien=BUREAU,MAGASIN',
  ESTIMER: '/estimer',
  LISTING_DETAIL: (id: string) => `/bien/${id}`,

  // Auth routes
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  VERIFY_OTP: '/auth/verify-otp',

  // User routes (protected)
  DASHBOARD: '/dashboard',
  MY_LISTINGS: '/mes-annonces',
  PROFILE: '/profil',
  FAVORITES: '/favoris',
  MESSAGES: '/messages',
  SETTINGS: '/parametres',
  HELP: '/aide',
  PUBLISH: '/publier',

  // Contract routes (protected)
  CONTRACTS: '/contrats',
  CONTRACT_DETAIL: (id: string) => `/contrats/${id}`,

  // Rating routes
  RATINGS: '/notations',

  // Admin routes
  ADMIN: {
    DASHBOARD: '/admin',
    USERS: '/admin/utilisateurs',
    LISTINGS: '/admin/annonces',
    CONTRACTS: '/admin/contrats',
    PAYMENTS: '/admin/paiements',
    MESSAGES: '/admin/messages',
    DISPUTES: '/admin/litiges',
    RATINGS: '/admin/notations',
    CERTIFICATIONS: '/admin/certifications',
    INSURANCES: '/admin/assurances',
    VISITS: '/admin/visites',
    LOGS: '/admin/logs',
    ANALYTICS: '/admin/statistiques',
  },
} as const;

// Navigation item type
export interface NavItem {
  href: string;
  icon: React.ElementType;
  labelKey: string; // Translation key for i18n
  requiresAuth?: boolean;
  badge?: 'notifications' | 'messages' | 'favorites';
  // Show only for specific account types (AGENCE, AGENT, PROPRIETAIRE, etc.)
  forAccountTypes?: string[];
}

// Desktop nav items (top header)
export const DESKTOP_NAV_ITEMS: NavItem[] = [
  { href: ROUTES.SEARCH_LOCATION, icon: Home, labelKey: 'nav.rent' },
  { href: ROUTES.SEARCH_VENTE, icon: Search, labelKey: 'nav.buy' },
  { href: ROUTES.SEARCH_COMMERCIAL, icon: Search, labelKey: 'nav.commercial' },
  { href: ROUTES.ESTIMER, icon: Search, labelKey: 'nav.estimate' },
];

// Mobile bottom navigation items
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: ROUTES.HOME, icon: Home, labelKey: 'nav.home' },
  { href: ROUTES.SEARCH, icon: Search, labelKey: 'nav.search' },
  { href: ROUTES.FAVORITES, icon: Heart, labelKey: 'nav.favorites', requiresAuth: true, badge: 'favorites' },
  { href: ROUTES.MESSAGES, icon: MessageSquare, labelKey: 'nav.messages', requiresAuth: true, badge: 'messages' },
  { href: ROUTES.PROFILE, icon: User, labelKey: 'nav.profile', requiresAuth: true },
];

// User dropdown menu items
export const USER_MENU_ITEMS: NavItem[] = [
  { href: ROUTES.DASHBOARD, icon: LayoutDashboard, labelKey: 'nav.dashboard', requiresAuth: true, forAccountTypes: ['AGENCE', 'AGENT', 'PROPRIETAIRE'] },
  { href: ROUTES.PROFILE, icon: User, labelKey: 'nav.myProfile' },
  { href: ROUTES.MY_LISTINGS, icon: FileText, labelKey: 'nav.myListings' },
  { href: ROUTES.FAVORITES, icon: Heart, labelKey: 'nav.myFavorites' },
  { href: ROUTES.MESSAGES, icon: MessageSquare, labelKey: 'nav.messages', badge: 'messages' },
  { href: ROUTES.CONTRACTS, icon: FileText, labelKey: 'nav.myContracts' },
  { href: ROUTES.SETTINGS, icon: Settings, labelKey: 'nav.settings' },
  { href: ROUTES.HELP, icon: HelpCircle, labelKey: 'nav.help' },
];

// Mobile menu items (slide out menu)
export const MOBILE_MENU_ITEMS: NavItem[] = [
  { href: ROUTES.HOME, icon: Home, labelKey: 'nav.home' },
  { href: ROUTES.DASHBOARD, icon: LayoutDashboard, labelKey: 'nav.dashboard', requiresAuth: true, forAccountTypes: ['AGENCE', 'AGENT', 'PROPRIETAIRE'] },
  { href: ROUTES.MY_LISTINGS, icon: FileText, labelKey: 'nav.myListings', requiresAuth: true },
  { href: ROUTES.SEARCH, icon: Search, labelKey: 'nav.search' },
  { href: ROUTES.FAVORITES, icon: Heart, labelKey: 'nav.myFavorites', requiresAuth: true },
  { href: ROUTES.MESSAGES, icon: MessageSquare, labelKey: 'nav.messages', requiresAuth: true, badge: 'messages' },
  { href: ROUTES.CONTRACTS, icon: FileText, labelKey: 'nav.myContracts', requiresAuth: true },
  { href: ROUTES.PROFILE, icon: User, labelKey: 'nav.myProfile', requiresAuth: true },
  { href: ROUTES.SETTINGS, icon: Settings, labelKey: 'nav.settings' },
  { href: ROUTES.HELP, icon: HelpCircle, labelKey: 'nav.help' },
];

// Check if current path matches a route
export function isActiveRoute(pathname: string, route: string): boolean {
  // Exact match for home
  if (route === '/') {
    return pathname === '/';
  }
  // For other routes, check if pathname starts with route (handles nested routes)
  return pathname === route || pathname.startsWith(`${route}/`);
}

// Check if path requires authentication
export function requiresAuth(pathname: string): boolean {
  const protectedPaths = [
    ROUTES.DASHBOARD,
    ROUTES.MY_LISTINGS,
    ROUTES.PROFILE,
    ROUTES.FAVORITES,
    ROUTES.MESSAGES,
    ROUTES.SETTINGS,
    ROUTES.PUBLISH,
    ROUTES.CONTRACTS,
    ROUTES.RATINGS,
    '/dashboard',
    '/mes-annonces',
    '/contrats',
    '/notations',
  ];

  return protectedPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );
}

// Check if path is an auth page (login, register, etc.)
export function isAuthPage(pathname: string): boolean {
  return pathname.startsWith('/auth/');
}
