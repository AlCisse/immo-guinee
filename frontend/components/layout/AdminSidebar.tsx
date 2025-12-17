'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Building2,
  Users,
  FileText,
  MessageSquare,
  Calendar,
  BarChart3,
  Settings,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Moon,
  Sun,
  Search,
  CreditCard,
  Scale,
  Star,
  FileCheck,
  Umbrella,
  BookOpen,
} from 'lucide-react';

// Get dynamic label based on user roles
const getRoleLabel = (roles: string[]): string => {
  if (roles.includes('super-admin') || roles.includes('admin')) {
    return 'Administration';
  }
  if (roles.includes('moderator')) {
    return 'Modération';
  }
  if (roles.includes('agence')) {
    return 'Espace Agence';
  }
  if (roles.includes('proprietaire')) {
    return 'Espace Propriétaire';
  }
  if (roles.includes('mediator')) {
    return 'Médiation';
  }
  if (roles.includes('chercheur')) {
    return 'Espace Chercheur';
  }
  return 'Tableau de bord';
};

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: string;
}

interface SidebarCounts {
  listings_pending: number;
  listings_active: number;
  messages_unread: number;
  contracts_pending: number;
  disputes_open: number;
  ratings_pending: number;
  certifications_pending: number;
  notifications: number;
}

const getNavItems = (counts: SidebarCounts): NavItem[] => [
  { name: 'Tableau de bord', href: '/admin', icon: Home },
  { name: 'Annonces', href: '/admin/annonces', icon: Building2, badgeKey: 'listings_active' },
  { name: 'Utilisateurs', href: '/admin/users', icon: Users },
  { name: 'Contrats', href: '/admin/contrats', icon: FileText, badgeKey: 'contracts_pending' },
  { name: 'Paiements', href: '/admin/paiements', icon: CreditCard },
  { name: 'Messages', href: '/admin/messages', icon: MessageSquare, badgeKey: 'messages_unread' },
  { name: 'Visites', href: '/admin/visites', icon: Calendar },
  { name: 'Litiges', href: '/admin/litiges', icon: Scale, badgeKey: 'disputes_open' },
  { name: 'Notations', href: '/admin/notations', icon: Star, badgeKey: 'ratings_pending' },
  { name: 'Certifications', href: '/admin/certifications', icon: FileCheck, badgeKey: 'certifications_pending' },
  { name: 'Assurances', href: '/admin/assurances', icon: Umbrella },
  { name: 'Modération', href: '/admin/moderation', icon: Shield, badgeKey: 'listings_pending' },
  { name: 'Statistiques', href: '/admin/stats', icon: BarChart3 },
];

const getBottomNavItems = (counts: SidebarCounts): NavItem[] => [
  { name: 'Notifications', href: '/admin/notifications', icon: Bell, badgeKey: 'notifications' },
  { name: 'Documentation', href: '/admin/documentation', icon: BookOpen },
  { name: 'Paramètres', href: '/admin/settings', icon: Settings },
  { name: 'Aide', href: '/admin/aide', icon: HelpCircle },
];

interface AdminSidebarProps {
  onToggle?: (collapsed: boolean) => void;
}

export default function AdminSidebar({ onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [counts, setCounts] = useState<SidebarCounts>({
    listings_pending: 0,
    listings_active: 0,
    messages_unread: 0,
    contracts_pending: 0,
    disputes_open: 0,
    ratings_pending: 0,
    certifications_pending: 0,
    notifications: 0,
  });

  // Check if user is admin
  const isAdmin = user?.roles?.some((role: string) =>
    ['super-admin', 'admin', 'moderator'].includes(role)
  );

  // Fetch sidebar counts from API (only for admin users)
  useEffect(() => {
    if (!isAdmin) return;

    const fetchCounts = async () => {
      try {
        const response = await api.admin.sidebarCounts();
        if (response.data?.success && response.data?.data) {
          setCounts(response.data.data);
        }
      } catch (error) {
        // Silently ignore errors for non-admin users
        if (process.env.NODE_ENV === 'development') {
          console.debug('Failed to fetch sidebar counts:', error);
        }
      }
    };

    fetchCounts();
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handle dark mode
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setIsDarkMode(!isDarkMode);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    onToggle?.(!isCollapsed);
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 },
  };

  const navItems = getNavItems(counts);
  const bottomNavItems = getBottomNavItems(counts);

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const badge = item.badgeKey ? counts[item.badgeKey as keyof SidebarCounts] : undefined;

    return (
      <Link
        href={item.href}
        className={`
          relative flex items-center gap-3 px-4 py-3.5 rounded-2xl
          transition-all duration-300 ease-out group
          ${active
            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
            : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-dark-hover'
          }
        `}
      >
        {/* Active indicator */}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
        )}

        <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-primary-500'} transition-colors`} />

        {!isCollapsed && (
          <span className="font-medium text-sm whitespace-nowrap">
            {item.name}
          </span>
        )}

        {/* Badge - only show if > 0 */}
        {badge !== undefined && badge > 0 && (
          <span
            className={`
              ${isCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}
              min-w-[20px] h-5 px-1.5 flex items-center justify-center
              text-xs font-bold rounded-full
              ${active ? 'bg-white text-primary-500' : 'bg-primary-500 text-white'}
            `}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}

        {/* Tooltip for collapsed state - CSS only */}
        {isCollapsed && (
          <div className="absolute left-full ml-3 px-3 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-lg shadow-lg whitespace-nowrap z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            {item.name}
            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-neutral-900 dark:bg-white rotate-45" />
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white dark:bg-dark-card rounded-2xl shadow-soft"
      >
        <Menu className="w-6 h-6 text-neutral-700 dark:text-white" />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        variants={sidebarVariants}
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`
          fixed lg:sticky top-0 left-0 h-screen
          bg-white dark:bg-dark-card
          border-r border-neutral-200 dark:border-dark-border
          flex flex-col z-50
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform lg:transition-none duration-300
        `}
      >
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-neutral-100 dark:border-dark-border">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <span className="font-bold text-lg text-neutral-900 dark:text-white">
                    Immo<span className="text-primary-500">Guinee</span>
                  </span>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400 -mt-0.5">
                    {getRoleLabel(user?.roles || [])}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          {/* Mobile Close */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-xl"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* User Info */}
        <AnimatePresence>
          {!isCollapsed && user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-3 border-b border-neutral-100 dark:border-dark-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                    {user.nom_complet?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {user.nom_complet || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {user.type_compte || 'Admin'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-3"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-dark-hover border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 dark:text-white placeholder:text-neutral-400"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin overscroll-contain">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 border-t border-neutral-100 dark:border-dark-border" />

        {/* Bottom Navigation */}
        <nav className="py-4 px-3 space-y-1">
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-dark-hover transition-all"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-warning-500" />
            ) : (
              <Moon className="w-5 h-5 text-secondary-500" />
            )}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-medium text-sm"
                >
                  {isDarkMode ? 'Mode clair' : 'Mode sombre'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className={`w-5 h-5 ${isLoggingOut ? 'animate-spin' : ''}`} />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-medium text-sm"
                >
                  {isLoggingOut ? 'Deconnexion...' : 'Deconnexion'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </nav>

        {/* Collapse Toggle */}
        <div className="hidden lg:block p-4 border-t border-neutral-100 dark:border-dark-border">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-100 dark:bg-dark-hover text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Reduire</span>
              </>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
