'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Eye,
  MessageSquare,
  FileText,
  Settings,
  ChevronRight,
  Edit,
  Camera,
  Shield,
  Bell,
  Moon,
  Sun,
  Globe,
  LogOut,
  Download,
  Clock,
  Home,
  CheckCircle,
  Star,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiClient } from '@/lib/api/client';

// Fetch user counts (favorites, messages, notifications)
async function fetchUserCounts() {
  const response = await apiClient.get('/auth/me/counts');
  return response.data.data;
}

// Fetch user visits
async function fetchUserVisits() {
  const response = await apiClient.get('/visits');
  const data = response.data.data;
  // Handle different response formats (array, paginated object, or object with visits key)
  if (Array.isArray(data)) return data;
  if (data?.visits && Array.isArray(data.visits)) return data.visits;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
}

// Fetch user contracts
async function fetchUserContracts() {
  const response = await apiClient.get('/contracts');
  const data = response.data.data;
  // Handle different response formats
  if (Array.isArray(data)) return data;
  if (data?.contracts && Array.isArray(data.contracts)) return data.contracts;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
}

// Fetch user listings to get total views
async function fetchUserListings() {
  const response = await apiClient.get('/listings/my');
  const data = response.data.data;
  // Handle different response formats
  if (Array.isArray(data)) return data;
  if (data?.listings && Array.isArray(data.listings)) return data.listings;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
}

// Stat Card
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  isLoading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  isLoading?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-dark-card rounded-xl p-4 text-center"
    >
      <div className={`w-10 h-10 mx-auto mb-2 ${color} rounded-full flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-neutral-400" />
      ) : (
        <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      )}
      <p className="text-xs text-neutral-500">{label}</p>
    </motion.div>
  );
}

// Menu Item
function MenuItem({
  icon: Icon,
  label,
  description,
  href,
  onClick,
  badge,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  danger?: boolean;
}) {
  const content = (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
        danger
          ? 'hover:bg-red-50 dark:hover:bg-red-500/10'
          : 'hover:bg-neutral-50 dark:hover:bg-dark-bg'
      }`}
    >
      <div className={`p-2.5 rounded-xl ${
        danger
          ? 'bg-red-100 dark:bg-red-500/10'
          : 'bg-neutral-100 dark:bg-dark-bg'
      }`}>
        <Icon className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-neutral-600 dark:text-neutral-300'}`} />
      </div>
      <div className="flex-1">
        <p className={`font-medium ${danger ? 'text-red-600' : 'text-neutral-900 dark:text-white'}`}>
          {label}
        </p>
        {description && (
          <p className="text-sm text-neutral-500">{description}</p>
        )}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="px-2.5 py-1 bg-primary-100 dark:bg-primary-500/10 text-primary-600 text-xs font-semibold rounded-full">
          {badge}
        </span>
      )}
      <ChevronRight className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-neutral-400'}`} />
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return <button onClick={onClick} className="w-full text-left">{content}</button>;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Fetch real data
  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ['user-counts'],
    queryFn: fetchUserCounts,
  });

  const { data: visits, isLoading: visitsLoading } = useQuery({
    queryKey: ['user-visits'],
    queryFn: fetchUserVisits,
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['user-contracts'],
    queryFn: fetchUserContracts,
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['user-listings'],
    queryFn: fetchUserListings,
  });

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    logout();
  };

  // Calculate real stats (ensure arrays before calling array methods)
  const visitsArray = Array.isArray(visits) ? visits : [];
  const listingsArray = Array.isArray(listings) ? listings : [];
  const contractsArray = Array.isArray(contracts) ? contracts : [];

  const totalViews = listingsArray.reduce((sum: number, listing: any) => sum + (listing.vues_count || 0), 0);
  const upcomingVisits = visitsArray.filter((v: any) =>
    v.statut === 'CONFIRMEE' || v.statut === 'EN_ATTENTE'
  );
  const completedVisits = visitsArray.filter((v: any) => v.statut === 'TERMINEE');

  // Get member since date
  const memberSince = user?.created_at
    ? new Date(user.created_at).getFullYear()
    : new Date().getFullYear();

  return (
    <div>
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-500 pt-8 pb-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold text-white">Mon profil</h1>
            <Link href="/parametres">
              <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full">
                <Settings className="w-5 h-5 text-white" />
              </button>
            </Link>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold text-white">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <button className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-lg">
                <Camera className="w-4 h-4 text-primary-500" />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{user?.name || 'Utilisateur'}</h2>
                {user?.isVerified && (
                  <CheckCircle className="w-5 h-5 text-emerald-300" />
                )}
              </div>
              <p className="text-white/80 text-sm">{user?.email || user?.phone || ''}</p>
              <p className="text-white/60 text-xs mt-1">
                Membre depuis {memberSince}
              </p>
            </div>
            <Link href="/profil/edit">
              <button className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white font-medium rounded-xl text-sm">
                Modifier
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-3xl mx-auto px-4 -mt-12">
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            icon={Heart}
            label="Favoris"
            value={counts?.favorites_count || 0}
            color="bg-red-500"
            isLoading={countsLoading}
          />
          <StatCard
            icon={Eye}
            label="Vues"
            value={totalViews}
            color="bg-blue-500"
            isLoading={listingsLoading}
          />
          <StatCard
            icon={MessageSquare}
            label="Messages"
            value={counts?.unread_messages || 0}
            color="bg-emerald-500"
            isLoading={countsLoading}
          />
          <StatCard
            icon={Calendar}
            label="Visites"
            value={visitsArray.length}
            color="bg-purple-500"
            isLoading={visitsLoading}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-dark-border">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Actions rapides</h3>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            <MenuItem
              icon={Heart}
              label="Mes favoris"
              description={`${counts?.favorites_count || 0} biens sauvegardés`}
              href="/favoris"
              badge={counts?.favorites_count || 0}
            />
            <MenuItem
              icon={MessageSquare}
              label="Mes messages"
              description={counts?.unread_messages ? `${counts.unread_messages} nouveaux messages` : 'Aucun nouveau message'}
              href="/messages"
              badge={counts?.unread_messages || 0}
            />
            <MenuItem
              icon={Calendar}
              label="Mes visites"
              description={upcomingVisits.length ? `${upcomingVisits.length} visite(s) à venir` : 'Aucune visite programmée'}
              href="/visites"
              badge={upcomingVisits.length}
            />
          </div>
        </div>

        {/* Upcoming Visit */}
        {upcomingVisits.length > 0 && (
          <Link href="/visites">
            <div className="bg-primary-50 dark:bg-primary-500/10 rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-100 dark:bg-primary-500/20 rounded-xl">
                  <Calendar className="w-6 h-6 text-primary-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    Prochaine visite
                  </p>
                  <p className="text-sm text-primary-600 dark:text-primary-400">
                    {upcomingVisits[0]?.listing?.titre || 'Visite programmée'}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {upcomingVisits[0]?.date_visite && new Date(upcomingVisits[0].date_visite).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-primary-500" />
              </div>
            </div>
          </Link>
        )}

        {/* Visit History */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-dark-border flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Historique des visites</h3>
            <Link href="/visites" className="text-sm text-primary-500 font-medium">
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            {visitsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-neutral-400" />
              </div>
            ) : visitsArray.length > 0 ? (
              visitsArray.slice(0, 3).map((visit: any) => (
                <div key={visit.id} className="p-4 flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    visit.statut === 'TERMINEE'
                      ? 'bg-emerald-100 dark:bg-emerald-500/10'
                      : visit.statut === 'ANNULEE'
                      ? 'bg-red-100 dark:bg-red-500/10'
                      : 'bg-primary-100 dark:bg-primary-500/10'
                  }`}>
                    {visit.statut === 'TERMINEE' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-primary-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900 dark:text-white text-sm">
                      {visit.listing?.titre || 'Visite'}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {visit.date_visite && new Date(visit.date_visite).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    visit.statut === 'TERMINEE'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : visit.statut === 'ANNULEE'
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      : 'bg-primary-100 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                  }`}>
                    {visit.statut === 'TERMINEE' ? 'Terminée' :
                     visit.statut === 'ANNULEE' ? 'Annulée' :
                     visit.statut === 'CONFIRMEE' ? 'Confirmée' : 'En attente'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-neutral-500">
                Aucune visite pour le moment
              </div>
            )}
          </div>
        </div>

        {/* Documents (Contracts) */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-dark-border flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Mes contrats</h3>
            <Link href="/dashboard/mes-contrats" className="text-sm text-primary-500 font-medium">
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            {contractsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-neutral-400" />
              </div>
            ) : contractsArray.length > 0 ? (
              contractsArray.slice(0, 3).map((contract: any) => (
                <Link key={contract.id} href={`/contrats/${contract.id}`}>
                  <div className="p-4 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-dark-bg">
                    <div className="p-2 bg-red-100 dark:bg-red-500/10 rounded-lg">
                      <FileText className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900 dark:text-white text-sm">
                        {contract.reference || `Contrat ${contract.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {contract.listing?.titre || 'Contrat de location'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      contract.statut === 'SIGNE' || contract.statut === 'ACTIF'
                        ? 'bg-emerald-100 text-emerald-700'
                        : contract.statut?.includes('ATTENTE')
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {contract.statut === 'SIGNE' ? 'Signé' :
                       contract.statut === 'ACTIF' ? 'Actif' :
                       contract.statut?.includes('ATTENTE') ? 'En attente' :
                       contract.statut || 'Brouillon'}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-neutral-500">
                Aucun contrat pour le moment
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-dark-border">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Paramètres</h3>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            <MenuItem icon={User} label="Informations personnelles" href="/profil/edit" />
            <MenuItem icon={Bell} label="Notifications" description="Alertes et préférences" href="/parametres" />
            <MenuItem icon={Shield} label="Sécurité" description="Mot de passe et connexion" href="/parametres" />
            <MenuItem icon={Globe} label="Langue" description="Français" href="/parametres" />

            {/* Dark Mode Toggle */}
            <div className="flex items-center gap-4 p-4">
              <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-dark-bg">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                ) : (
                  <Sun className="w-5 h-5 text-neutral-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-neutral-900 dark:text-white">Mode sombre</p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`w-14 h-8 rounded-full p-1 transition-colors ${
                  isDarkMode ? 'bg-primary-500' : 'bg-neutral-200'
                }`}
              >
                <motion.div
                  animate={{ x: isDarkMode ? 24 : 0 }}
                  className="w-6 h-6 bg-white rounded-full shadow"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Help & Support */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            <MenuItem icon={MessageSquare} label="Aide & Support" href="/aide" />
            <MenuItem icon={Star} label="Noter l'application" onClick={() => {}} />
            <MenuItem icon={FileText} label="Conditions d'utilisation" href="/conditions" />
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
          <MenuItem icon={LogOut} label="Déconnexion" danger onClick={handleLogout} />
        </div>

        {/* App Version */}
        <p className="text-center text-xs text-neutral-400">
          ImmoGuinée v1.0.0
        </p>
      </div>
    </div>
  );
}
