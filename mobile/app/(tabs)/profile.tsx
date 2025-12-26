import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import Colors, { lightTheme } from '@/constants/Colors';

const MENU_ITEMS = [
  { id: 'publish', label: 'Publier une annonce', icon: 'add-circle-outline', route: '/publish', highlight: true },
  { id: 'my-listings', label: 'Mes annonces', icon: 'home-outline', route: '/my-listings' },
  { id: 'my-visits', label: 'Mes visites', icon: 'calendar-outline', route: '/my-visits' },
  { id: 'my-contracts', label: 'Mes contrats', icon: 'document-text-outline', route: '/my-contracts' },
  { id: 'settings', label: 'Parametres', icon: 'settings-outline', route: '/settings' },
  { id: 'help', label: 'Aide', icon: 'help-circle-outline', route: '/help' },
];

const BADGE_COLORS: Record<string, string> = {
  DEBUTANT: Colors.neutral[400],
  VERIFIE: Colors.success[500],
  PREMIUM: '#F59E0B',
  SUPER_PROPRIO: '#8B5CF6',
};

const BADGE_LABELS: Record<string, string> = {
  DEBUTANT: 'Debutant',
  VERIFIE: 'Verifie',
  PREMIUM: 'Premium',
  SUPER_PROPRIO: 'Super Proprio',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 24 : 16;
  const maxWidth = isTablet ? 500 : width;

  const handleLogout = () => {
    Alert.alert(
      'Deconnexion',
      'Voulez-vous vraiment vous deconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Deconnecter',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>
        <View style={[styles.authRequired, isTablet && { maxWidth }]}>
          <View style={styles.guestAvatar}>
            <Ionicons name="person-outline" size={48} color={Colors.neutral[400]} />
          </View>
          <Text style={styles.authTitle}>Bienvenue sur ImmoGuinee</Text>
          <Text style={styles.authText}>
            Connectez-vous pour acceder a toutes les fonctionnalites
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>Creer un compte</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={isTablet && styles.scrollContentTablet}
      >
        <View style={[styles.contentWrapper, isTablet && { maxWidth }]}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarSection}>
              {user?.photo_profil ? (
                <Image source={{ uri: user.photo_profil }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {user?.nom_complet?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.editAvatarBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/edit-profile')}
              >
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{user?.nom_complet}</Text>
            <View style={styles.userInfo}>
              <Ionicons name="call-outline" size={14} color={Colors.neutral[500]} />
              <Text style={styles.userPhone}>{user?.telephone}</Text>
            </View>
            {user?.badge && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: BADGE_COLORS[user.badge] || Colors.neutral[400] },
                ]}
              >
                <Ionicons name="shield-checkmark" size={12} color="#fff" />
                <Text style={styles.badgeText}>
                  {BADGE_LABELS[user.badge] || user.badge}
                </Text>
              </View>
            )}
          </View>

          {/* Account Type */}
          <View style={[styles.accountType, { marginHorizontal: horizontalPadding }]}>
            <View style={styles.accountTypeIcon}>
              <Ionicons
                name={
                  user?.type_compte === 'AGENCE'
                    ? 'business-outline'
                    : user?.type_compte === 'PROFESSIONNEL'
                    ? 'briefcase-outline'
                    : 'person-outline'
                }
                size={24}
                color={lightTheme.colors.primary}
              />
            </View>
            <View style={styles.accountTypeContent}>
              <Text style={styles.accountTypeLabel}>Type de compte</Text>
              <Text style={styles.accountTypeValue}>
                {user?.type_compte === 'AGENCE'
                  ? 'Agence immobiliere'
                  : user?.type_compte === 'PROFESSIONNEL'
                  ? 'Professionnel'
                  : 'Particulier'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
          </View>

          {/* Publish Button */}
          <TouchableOpacity
            style={[styles.publishButton, { marginHorizontal: horizontalPadding }]}
            onPress={() => router.push('/publish')}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.publishButtonText}>Publier une annonce</Text>
          </TouchableOpacity>

          {/* Menu Items */}
          <View style={[styles.menuSection, { marginHorizontal: horizontalPadding }]}>
            {MENU_ITEMS.filter(item => item.id !== 'publish').map((item, index, arr) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index === arr.length - 1 && styles.menuItemLast,
                ]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemIconContainer}>
                  <Ionicons name={item.icon as any} size={22} color={lightTheme.colors.primary} />
                </View>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.logoutButton, { marginHorizontal: horizontalPadding }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            <Text style={styles.logoutText}>Deconnexion</Text>
          </TouchableOpacity>

          {/* Version */}
          <Text style={styles.version}>ImmoGuinee v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.secondary[800],
    letterSpacing: -0.5,
  },
  scrollContentTablet: {
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
  },
  profileHeader: {
    backgroundColor: Colors.background.primary,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: lightTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '700',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.secondary[800],
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  userPhone: {
    fontSize: 15,
    color: Colors.neutral[500],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  accountType: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  accountTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  accountTypeContent: {
    flex: 1,
  },
  accountTypeLabel: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  accountTypeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: lightTheme.colors.primary,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: lightTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  menuSection: {
    backgroundColor: Colors.background.primary,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.secondary[800],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.neutral[400],
    marginTop: 24,
    marginBottom: 32,
  },
  authRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    alignSelf: 'center',
    width: '100%',
  },
  guestAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 8,
  },
  authText: {
    fontSize: 15,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  loginButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: lightTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: lightTheme.colors.primary,
    alignItems: 'center',
  },
  registerButtonText: {
    color: lightTheme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
