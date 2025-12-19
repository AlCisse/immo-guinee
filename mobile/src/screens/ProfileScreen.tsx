import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS } from '../constants/config';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { formatPhoneNumber } from '../utils/format';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  badge?: number;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress, badge, danger }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemLeft}>
      <Text style={styles.menuItemIcon}>{icon}</Text>
      <Text style={[styles.menuItemLabel, danger && styles.dangerText]}>{label}</Text>
    </View>
    <View style={styles.menuItemRight}>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.chevron}>›</Text>
    </View>
  </TouchableOpacity>
);

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleMyListings = () => {
    // Navigate to user's listings
    Alert.alert('À venir', 'Cette fonctionnalité sera bientôt disponible');
  };

  const handleFavorites = () => {
    Alert.alert('À venir', 'Cette fonctionnalité sera bientôt disponible');
  };

  const handleVisits = () => {
    Alert.alert('À venir', 'Cette fonctionnalité sera bientôt disponible');
  };

  const handleSettings = () => {
    Alert.alert('À venir', 'Cette fonctionnalité sera bientôt disponible');
  };

  const handleHelp = () => {
    Alert.alert('À venir', 'Cette fonctionnalité sera bientôt disponible');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mon profil</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.prenom?.charAt(0) || user?.nom?.charAt(0) || '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>
              {user?.prenom} {user?.nom}
            </Text>
            <Text style={styles.userPhone}>
              {user?.telephone ? formatPhoneNumber(user.telephone) : '-'}
            </Text>
            {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Modifier</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Mes activités</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="🏠"
              label="Mes annonces"
              onPress={handleMyListings}
            />
            <MenuItem
              icon="❤️"
              label="Mes favoris"
              onPress={handleFavorites}
            />
            <MenuItem
              icon="📅"
              label="Mes visites"
              onPress={handleVisits}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Paramètres</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="⚙️"
              label="Paramètres"
              onPress={handleSettings}
            />
            <MenuItem
              icon="❓"
              label="Aide & Support"
              onPress={handleHelp}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <View style={styles.menuCard}>
            <MenuItem
              icon="🚪"
              label="Se déconnecter"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>ImmoGuinée v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  editButtonText: {
    fontSize: 13,
    color: COLORS.primary[500],
    fontWeight: '500',
  },
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[500],
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    color: COLORS.gray[800],
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: COLORS.primary[500],
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chevron: {
    fontSize: 20,
    color: COLORS.gray[400],
  },
  dangerText: {
    color: COLORS.error,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appVersion: {
    fontSize: 12,
    color: COLORS.gray[400],
  },
});

export default ProfileScreen;
