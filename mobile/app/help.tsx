import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';

const FAQ_KEYS = [
  'publishListing',
  'contactOwner',
  'scheduleVisit',
  'editProfile',
  'reportListing',
];

export default function HelpScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleContact = () => {
    Linking.openURL('mailto:support@immoguinee.com');
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/224613354420');
  };

  const handleWebsite = () => {
    Linking.openURL('https://immoguinee.com/aide');
  };

  const handleLegal = () => {
    router.push('/legal');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('help.title'),
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
        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('help.contact')}</Text>
          <View style={styles.contactCard}>
            <TouchableOpacity style={styles.contactItem} onPress={handleContact}>
              <View style={styles.contactIcon}>
                <Ionicons name="mail-outline" size={24} color={lightTheme.colors.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>{t('help.email')}</Text>
                <Text style={styles.contactValue}>support@immoguinee.com</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactItem} onPress={handleWhatsApp}>
              <View style={[styles.contactIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="logo-whatsapp" size={24} color="#22C55E" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>{t('help.whatsapp')}</Text>
                <Text style={styles.contactValue}>+224 613 354 420</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactItem} onPress={handleWebsite}>
              <View style={styles.contactIcon}>
                <Ionicons name="globe-outline" size={24} color={lightTheme.colors.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>{t('help.website')}</Text>
                <Text style={styles.contactValue}>immoguinee.com/aide</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactItem, styles.contactItemLast]} onPress={handleLegal}>
              <View style={[styles.contactIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#0284C7" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>{t('help.legalInfo')}</Text>
                <Text style={styles.contactValue}>{t('help.termsAndPrivacy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('help.faq')}</Text>
          <View style={styles.faqCard}>
            {FAQ_KEYS.map((key, index) => (
              <View
                key={key}
                style={[
                  styles.faqItem,
                  index === FAQ_KEYS.length - 1 && styles.faqItemLast,
                ]}
              >
                <View style={styles.faqQuestion}>
                  <Ionicons name="help-circle" size={20} color={lightTheme.colors.primary} />
                  <Text style={styles.faqQuestionText}>{t(`help.faqItems.${key}.question`)}</Text>
                </View>
                <Text style={styles.faqAnswer}>{t(`help.faqItems.${key}.answer`)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>ImmoGuinee</Text>
          <Text style={styles.appVersion}>{t('help.version')} 1.0.0</Text>
          <Text style={styles.appCopyright}>{t('help.copyright', { year: new Date().getFullYear() })}</Text>
        </View>
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
  contactCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  contactItemLast: {
    borderBottomWidth: 0,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  faqCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  faqItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  faqItemLast: {
    borderBottomWidth: 0,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.neutral[600],
    lineHeight: 22,
    marginLeft: 30,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: lightTheme.colors.primary,
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
});
