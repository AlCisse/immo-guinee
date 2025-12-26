import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import Colors, { lightTheme } from '@/constants/Colors';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irreversible. Toutes vos donnees seront supprimees.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Info', 'Veuillez contacter le support pour supprimer votre compte.');
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Parametres',
          headerStyle: { backgroundColor: Colors.background.primary },
          headerShadowVisible: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.secondary[800]} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="person-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>Modifier le profil</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/change-password')}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>Changer le mot de passe</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="call-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>Numero de telephone</Text>
              <Text style={styles.menuItemValue}>{user?.telephone}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.switchItem}>
              <View style={styles.switchItemContent}>
                <View style={styles.menuItemIcon}>
                  <Ionicons name="notifications-outline" size={20} color={lightTheme.colors.primary} />
                </View>
                <Text style={styles.menuItemLabel}>Notifications push</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: Colors.neutral[300], true: lightTheme.colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.switchItem, styles.menuItemLast]}>
              <View style={styles.switchItemContent}>
                <View style={styles.menuItemIcon}>
                  <Ionicons name="mail-outline" size={20} color={lightTheme.colors.primary} />
                </View>
                <Text style={styles.menuItemLabel}>Notifications par email</Text>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{ false: Colors.neutral[300], true: lightTheme.colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>A propos</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/legal')}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="document-text-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>Informations legales</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/help')}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="help-circle-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>Aide et support</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <View style={[styles.menuItem, styles.menuItemLast]}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="information-circle-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>Version</Text>
              <Text style={styles.menuItemValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zone de danger</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={[styles.menuItemIcon, styles.menuItemIconDanger]}>
                <Ionicons name="log-out-outline" size={20} color={Colors.error[500]} />
              </View>
              <Text style={[styles.menuItemLabel, styles.menuItemLabelDanger]}>Deconnexion</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={handleDeleteAccount}>
              <View style={[styles.menuItemIcon, styles.menuItemIconDanger]}>
                <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
              </View>
              <Text style={[styles.menuItemLabel, styles.menuItemLabelDanger]}>Supprimer le compte</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[500],
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemIconDanger: {
    backgroundColor: Colors.error[50],
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.secondary[800],
  },
  menuItemLabelDanger: {
    color: Colors.error[500],
  },
  menuItemValue: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  switchItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  footer: {
    height: 40,
  },
});
