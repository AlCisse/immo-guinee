import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth/AuthContext';
import { changeLanguage, LANGUAGES, getCurrentLanguage } from '@/lib/i18n';
import Colors, { lightTheme } from '@/constants/Colors';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
    setCurrentLang(langCode);
    setShowLanguageModal(false);
  };

  const getCurrentLanguageLabel = () => {
    const lang = LANGUAGES.find(l => l.code === currentLang);
    return lang ? `${lang.flag} ${lang.name}` : `🇫🇷 ${t('settings.french')}`;
  };

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      t('alerts.confirmLogout'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(t('alerts.info'), t('help.contact'));
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
          title: t('settings.title'),
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
        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => setShowLanguageModal(true)}
            >
              <View style={styles.menuItemIcon}>
                <Ionicons name="language-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>{t('settings.selectLanguage')}</Text>
              <Text style={styles.menuItemValue}>{getCurrentLanguageLabel()}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.myProfile')}</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="person-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>{t('profile.editProfile')}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/change-password')}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>{t('settings.changePassword')}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="call-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>{t('auth.phone')}</Text>
              <Text style={styles.menuItemValue}>{user?.telephone}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <View style={styles.card}>
            <View style={styles.switchItem}>
              <View style={styles.switchItemContent}>
                <View style={styles.menuItemIcon}>
                  <Ionicons name="notifications-outline" size={20} color={lightTheme.colors.primary} />
                </View>
                <Text style={styles.menuItemLabel}>{t('settings.pushNotifications')}</Text>
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
                <Text style={styles.menuItemLabel}>{t('settings.emailNotifications')}</Text>
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
          <Text style={styles.sectionTitle}>{t('profile.about')}</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/legal')}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="document-text-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>{t('profile.legal')}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/help')}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="help-circle-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>{t('profile.help')}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <View style={[styles.menuItem, styles.menuItemLast]}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="information-circle-outline" size={20} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>{t('settings.version')}</Text>
              <Text style={styles.menuItemValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.security')}</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={[styles.menuItemIcon, styles.menuItemIconDanger]}>
                <Ionicons name="log-out-outline" size={20} color={Colors.error[500]} />
              </View>
              <Text style={[styles.menuItemLabel, styles.menuItemLabelDanger]}>{t('auth.logout')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={handleDeleteAccount}>
              <View style={[styles.menuItemIcon, styles.menuItemIconDanger]}>
                <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
              </View>
              <Text style={[styles.menuItemLabel, styles.menuItemLabelDanger]}>{t('settings.deleteAccount')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer} />
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  currentLang === lang.code && styles.languageOptionActive
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageName,
                  currentLang === lang.code && styles.languageNameActive
                ]}>
                  {lang.name}
                </Text>
                {currentLang === lang.code && (
                  <Ionicons name="checkmark" size={20} color={lightTheme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 20,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.neutral[50],
  },
  languageOptionActive: {
    backgroundColor: Colors.primary[50],
    borderWidth: 1.5,
    borderColor: lightTheme.colors.primary,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.secondary[800],
  },
  languageNameActive: {
    color: lightTheme.colors.primary,
    fontWeight: '600',
  },
});
