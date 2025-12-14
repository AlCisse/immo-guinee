'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
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
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

// Mock visit history
const visitHistory = [
  {
    id: '1',
    property: 'Villa de luxe à Kipé',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'completed',
  },
  {
    id: '2',
    property: 'Appartement T3 Nongo',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    status: 'upcoming',
  },
  {
    id: '3',
    property: 'Bureau commercial Kaloum',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    status: 'completed',
  },
];

// Mock documents
const documents = [
  {
    id: '1',
    name: 'Contrat_location_villa.pdf',
    type: 'Contrat',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    size: '245 KB',
  },
  {
    id: '2',
    name: 'Facture_visite.pdf',
    type: 'Facture',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    size: '128 KB',
  },
];

// Stat Card
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-dark-card rounded-xl p-4 text-center"
    >
      <div className={`w-10 h-10 mx-auto mb-2 ${color} rounded-full flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
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
      {badge && (
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

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    logout();
  };

  // User stats (mock for now)
  const stats = {
    favorites: 12,
    views: 156,
    messages: 24,
    visits: 5,
  };

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
              <p className="text-white/80 text-sm">{user?.email || ''}</p>
              <p className="text-white/60 text-xs mt-1">
                Membre depuis 2024
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
          <StatCard icon={Heart} label="Favoris" value={stats.favorites} color="bg-red-500" />
          <StatCard icon={Eye} label="Vues" value={stats.views} color="bg-blue-500" />
          <StatCard icon={MessageSquare} label="Messages" value={stats.messages} color="bg-emerald-500" />
          <StatCard icon={Calendar} label="Visites" value={stats.visits} color="bg-purple-500" />
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
            <MenuItem icon={Heart} label="Mes favoris" description="12 biens sauvegardés" href="/favoris" badge={12} />
            <MenuItem icon={MessageSquare} label="Mes messages" description="2 nouveaux messages" href="/messages" badge={2} />
            <MenuItem icon={Calendar} label="Mes visites" description="1 visite à venir" href="/visites" />
          </div>
        </div>

        {/* Upcoming Visit */}
        {visitHistory.filter(v => v.status === 'upcoming').length > 0 && (
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
                  {visitHistory.find(v => v.status === 'upcoming')?.property}
                </p>
                <p className="text-xs text-neutral-500">
                  {visitHistory.find(v => v.status === 'upcoming')?.date.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-primary-500" />
            </div>
          </div>
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
            {visitHistory.slice(0, 3).map((visit) => (
              <div key={visit.id} className="p-4 flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  visit.status === 'completed'
                    ? 'bg-emerald-100 dark:bg-emerald-500/10'
                    : 'bg-primary-100 dark:bg-primary-500/10'
                }`}>
                  {visit.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-primary-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900 dark:text-white text-sm">
                    {visit.property}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {visit.date.toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  visit.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-primary-100 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                }`}>
                  {visit.status === 'completed' ? 'Terminée' : 'À venir'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-dark-border flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Mes documents</h3>
            <span className="text-sm text-neutral-500">{documents.length} fichiers</span>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center gap-4">
                <div className="p-2 bg-red-100 dark:bg-red-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900 dark:text-white text-sm">
                    {doc.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {doc.type} • {doc.size}
                  </p>
                </div>
                <button className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg">
                  <Download className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-dark-border">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Paramètres</h3>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            <MenuItem icon={User} label="Informations personnelles" href="/profil/edit" />
            <MenuItem icon={Bell} label="Notifications" description="Alertes et préférences" href="/parametres/notifications" />
            <MenuItem icon={Shield} label="Sécurité" description="Mot de passe et connexion" href="/parametres/securite" />
            <MenuItem icon={Globe} label="Langue" description="Français" href="/parametres/langue" />

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
