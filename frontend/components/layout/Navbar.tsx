'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Search,
  Heart,
  MessageSquare,
  User,
  Menu,
  X,
  Bell,
  Plus,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  Settings,
  HelpCircle,
  Loader2,
  FileText,
  Check,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLocale } from '@/lib/i18n';
import type { NavItem } from '@/lib/routes';
import { useUserCounts, useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, type Notification } from '@/lib/hooks/useNotifications';
import {
  ROUTES,
  DESKTOP_NAV_ITEMS,
  MOBILE_NAV_ITEMS,
  USER_MENU_ITEMS,
  MOBILE_MENU_ITEMS,
  isActiveRoute,
} from '@/lib/routes';
import { LanguageSelectorNavbar } from '@/components/ui/LanguageSelector';

// Notification Dropdown Component
function NotificationDropdown({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const { data, isLoading } = useNotifications(isOpen);
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = data?.data?.notifications || [];
  const unreadCount = data?.data?.unread_count || 0;

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already
    if (!notification.read_at) {
      markAsRead.mutate(notification.id);
    }

    // Close the dropdown
    onClose();

    // Navigate to action URL or default notifications page
    const targetUrl = notification.action_url || '/notifications';
    router.push(targetUrl);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return t('time.justNow');
    if (minutes < 60) return t('time.minutesAgo').replace('{count}', String(minutes));
    if (hours < 24) return t('time.hoursAgo').replace('{count}', String(hours));
    if (days < 7) return t('time.daysAgo').replace('{count}', String(days));
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 w-80 bg-white dark:bg-dark-card rounded-xl shadow-2xl z-50 overflow-hidden border border-neutral-200 dark:border-dark-border"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-100 dark:border-dark-border flex items-center justify-between">
        <h3 className="font-semibold text-neutral-900 dark:text-white">{t('nav.notifications')}</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
            className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
          >
            {markAllAsRead.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            {t('nav.markAllRead')}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p className="text-sm text-neutral-500">{t('nav.noNotifications')}</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            {notifications.slice(0, 10).map((notification: Notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 hover:bg-neutral-50 dark:hover:bg-dark-hover cursor-pointer transition-colors ${
                  !notification.read_at ? 'bg-primary-50/50 dark:bg-primary-500/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                    !notification.read_at ? 'bg-primary-500' : 'bg-transparent'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-400 -rotate-90 flex-shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-neutral-100 dark:border-dark-border">
          <Link
            href="/notifications"
            onClick={onClose}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium block text-center"
          >
            {t('nav.viewAllNotifications')}
          </Link>
        </div>
      )}
    </div>
  );
}

// Bottom Navigation Item
function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  badge?: number;
}) {
  return (
    <Link href={href} className="flex-1">
      <div
        className={`flex flex-col items-center gap-1 py-2 relative active:scale-95 transition-transform duration-100 ${
          isActive ? 'text-primary-500' : 'text-neutral-500 dark:text-neutral-400'
        }`}
      >
        <div className="relative">
          <Icon className="w-6 h-6" />
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium">{label}</span>
        {isActive && (
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary-500 rounded-full"
          />
        )}
      </div>
    </Link>
  );
}

interface NavbarProps {
  variant?: 'full' | 'minimal'; // minimal = only home link (for auth pages)
}

export default function Navbar({ variant = 'full' }: NavbarProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLocale();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch user counts from DB
  const { data: userCounts } = useUserCounts(isAuthenticated);
  const unreadMessages = userCounts?.unread_messages || 0;
  const unreadNotifications = userCounts?.unread_notifications || 0;
  const favoritesCount = userCounts?.favorites_count || 0;

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowUserMenu(false);
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handle scroll - Always keep navbar visible with solid background after scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize dark mode from localStorage only (no system preference auto-detection)
  useEffect(() => {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark', newMode);
  };

  // Close menus when pathname changes
  useEffect(() => {
    setShowUserMenu(false);
    setShowNotifications(false);
    setIsMenuOpen(false);
  }, [pathname]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  // Get badge count based on type
  const getBadgeCount = (badge?: string): number | undefined => {
    if (!badge) return undefined;
    switch (badge) {
      case 'messages':
        return unreadMessages;
      case 'notifications':
        return unreadNotifications;
      case 'favorites':
        return favoritesCount;
      default:
        return undefined;
    }
  };

  // Minimal navbar for auth pages (login, register)
  if (variant === 'minimal') {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-dark-card/95 backdrop-blur-md shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            <Link href={ROUTES.HOME} className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <Home className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold">
                <span className="text-neutral-900 dark:text-white">Immo</span>
                <span className="text-orange-500">Guinée</span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <LanguageSelectorNavbar />

              <button
                onClick={toggleDarkMode}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full transition-colors"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-neutral-700 dark:text-white" />
                ) : (
                  <Moon className="w-5 h-5 text-neutral-700" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Desktop Header - Always visible with solid background when scrolled */}
      <header
        className={`hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white dark:bg-dark-card shadow-soft'
            : 'bg-white/95 dark:bg-dark-card/95 backdrop-blur-md shadow-soft'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href={ROUTES.HOME} className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow">
                <Home className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold">
                <span className="text-neutral-900 dark:text-white">Immo</span>
                <span className="text-orange-500">Guinée</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="flex items-center gap-8">
              {DESKTOP_NAV_ITEMS.map((item) => (
                <Link
                  key={item.labelKey}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    isActiveRoute(pathname, item.href)
                      ? 'text-primary-500'
                      : 'text-neutral-700 dark:text-neutral-300 hover:text-primary-500'
                  }`}
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <LanguageSelectorNavbar />

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full transition-colors hover:bg-neutral-100 dark:hover:bg-dark-bg"
                aria-label={isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-neutral-700 dark:text-white" />
                ) : (
                  <Moon className="w-5 h-5 text-neutral-700" />
                )}
              </button>

              {/* Notifications - Only show when authenticated */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setShowUserMenu(false);
                    }}
                    className="p-2 rounded-full relative transition-colors hover:bg-neutral-100 dark:hover:bg-dark-bg"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5 text-neutral-700 dark:text-white" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>

                  <NotificationDropdown
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                  />
                </div>
              )}

              {/* Publish Button */}
              <Link href={ROUTES.PUBLISH}>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-medium rounded-xl transition-all duration-150"
                >
                  <Plus className="w-4 h-4" />
                  {t('nav.publish')}
                </button>
              </Link>

              {/* User Menu */}
              {isAuthenticated && user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => {
                      setShowUserMenu(!showUserMenu);
                      setShowNotifications(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-xl transition-colors hover:bg-neutral-100 dark:hover:bg-dark-bg"
                  >
                    <ChevronDown className={`w-4 h-4 text-neutral-700 dark:text-white transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                    {user.photo_profil_url ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        <Image
                          src={user.photo_profil_url}
                          alt={user.nom_complet || 'Profile'}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {user.nom_complet?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </button>

                  {showUserMenu && (
                    <div
                      className="absolute right-0 top-12 w-56 bg-white dark:bg-dark-card rounded-xl shadow-2xl py-2 z-50 border border-neutral-200 dark:border-dark-border"
                    >
                      <div className="px-4 py-3 border-b border-neutral-100 dark:border-dark-border">
                        <p className="font-semibold text-neutral-900 dark:text-white">{user.nom_complet || 'Utilisateur'}</p>
                        <p className="text-sm text-neutral-500">{user.email || user.telephone}</p>
                      </div>

                      {USER_MENU_ITEMS.filter((item) => {
                        // Filter by account type if specified
                        if (item.forAccountTypes && user?.type_compte) {
                          return item.forAccountTypes.includes(user.type_compte);
                        }
                        // Show item if no account type filter
                        return !item.forAccountTypes;
                      }).map((item) => (
                        <Link
                          key={item.labelKey}
                          href={item.href}
                          onClick={() => setShowUserMenu(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-dark-bg text-neutral-700 dark:text-neutral-300 ${
                            isActiveRoute(pathname, item.href) ? 'text-primary-500' : ''
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                          {t(item.labelKey)}
                          {item.badge && getBadgeCount(item.badge) ? (
                            <span className="ml-auto px-2 py-0.5 bg-primary-100 dark:bg-primary-500/10 text-primary-600 text-xs font-semibold rounded-full">
                              {getBadgeCount(item.badge)}
                            </span>
                          ) : null}
                        </Link>
                      ))}

                      <div className="border-t border-neutral-100 dark:border-dark-border mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 w-full disabled:opacity-50"
                        >
                          {isLoggingOut ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <LogOut className="w-4 h-4" />
                          )}
                          {isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link href={ROUTES.LOGIN}>
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-150 bg-neutral-100 dark:bg-dark-bg text-neutral-700 dark:text-white hover:bg-neutral-200 dark:hover:bg-dark-hover active:scale-95"
                  >
                    <User className="w-4 h-4" />
                    {t('nav.login')}
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header - Always solid background */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-dark-card shadow-soft">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href={ROUTES.HOME} className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Home className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold">
              <span className="text-neutral-900 dark:text-white">Immo</span>
              <span className="text-orange-500">Guinée</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <LanguageSelectorNavbar />

            {/* Notifications - Only show when authenticated */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full relative"
                >
                  <Bell className="w-5 h-5 text-neutral-700 dark:text-white" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>

                <NotificationDropdown
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                />
              </div>
            )}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full"
            >
              <Menu className="w-5 h-5 text-neutral-700 dark:text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide Menu */}
      {isMenuOpen && (
        <>
          <div
            onClick={() => setIsMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-200"
          />
          <div
            className="md:hidden fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-dark-card z-50 overflow-y-auto transition-transform duration-200"
          >
              <div className="p-4 border-b border-neutral-100 dark:border-dark-border flex items-center justify-between">
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-3">
                    {user.photo_profil_url ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden">
                        <Image
                          src={user.photo_profil_url}
                          alt={user.nom_complet || 'Profile'}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {user.nom_complet?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">{user.nom_complet || 'Utilisateur'}</p>
                      <p className="text-sm text-neutral-500">{user.email || user.telephone}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-neutral-200 dark:bg-dark-bg rounded-full flex items-center justify-center text-neutral-500">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">{t('nav.visitor')}</p>
                      <p className="text-sm text-neutral-500">{t('nav.notConnected')}</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <div className="p-4">
                <Link href={ROUTES.PUBLISH} onClick={() => setIsMenuOpen(false)}>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 text-white font-semibold rounded-xl mb-4">
                    <Plus className="w-5 h-5" />
                    {t('nav.publishListing')}
                  </button>
                </Link>

                <nav className="space-y-1">
                  {MOBILE_MENU_ITEMS.filter((item) => {
                    // Skip items that require auth if not authenticated
                    if (item.requiresAuth && !isAuthenticated) return false;
                    // Filter by account type if specified
                    if (item.forAccountTypes) {
                      if (!isAuthenticated || !user?.type_compte) return false;
                      return item.forAccountTypes.includes(user.type_compte);
                    }
                    return true;
                  }).map((item) => (
                    <Link
                      key={item.labelKey}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors ${
                        isActiveRoute(pathname, item.href)
                          ? 'text-primary-500 bg-primary-50 dark:bg-primary-500/10'
                          : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {t(item.labelKey)}
                      {item.badge && getBadgeCount(item.badge) ? (
                        <span className="ml-auto px-2 py-0.5 bg-primary-100 dark:bg-primary-500/10 text-primary-600 text-xs font-semibold rounded-full">
                          {getBadgeCount(item.badge)}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </nav>

                <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-dark-border">
                  <button
                    onClick={toggleDarkMode}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-bg"
                  >
                    <span className="text-neutral-700 dark:text-neutral-300">{t('nav.darkMode')}</span>
                    <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-primary-500' : 'bg-neutral-200'}`}>
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </div>
                  </button>
                </div>

                <div className="mt-4">
                  {isAuthenticated ? (
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 w-full disabled:opacity-50"
                    >
                      {isLoggingOut ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <LogOut className="w-5 h-5" />
                      )}
                      {isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}
                    </button>
                  ) : (
                    <Link
                      href={ROUTES.LOGIN}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white w-full font-semibold justify-center"
                    >
                      <User className="w-5 h-5" />
                      {t('nav.login')}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-card border-t border-neutral-200 dark:border-dark-border z-40 safe-area-pb">
        <div className="flex items-center">
          {MOBILE_NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={t(item.labelKey)}
              isActive={isActiveRoute(pathname, item.href)}
              badge={getBadgeCount(item.badge)}
            />
          ))}
        </div>
      </nav>
    </>
  );
}
