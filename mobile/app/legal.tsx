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
import Colors, { lightTheme } from '@/constants/Colors';

const LEGAL_ITEMS = [
  {
    id: 'cgu',
    title: "Conditions Generales d'Utilisation",
    description: "Regles d'utilisation de la plateforme, droits et obligations",
    icon: 'document-text-outline' as const,
    url: 'https://immoguinee.com/legal/conditions-utilisation',
  },
  {
    id: 'privacy',
    title: 'Politique de Confidentialite',
    description: 'Protection de vos donnees personnelles et vos droits',
    icon: 'shield-checkmark-outline' as const,
    url: 'https://immoguinee.com/legal/politique-confidentialite',
  },
];

const SECURITY_FEATURES = [
  {
    icon: 'lock-closed' as const,
    title: 'Chiffrement AES-256',
    description: 'Documents et contrats proteges',
  },
  {
    icon: 'shield' as const,
    title: 'E2E pour les medias',
    description: 'Cles jamais stockees sur serveur',
  },
  {
    icon: 'key' as const,
    title: '2FA disponible',
    description: 'Double authentification',
  },
  {
    icon: 'eye-off' as const,
    title: 'Vie privee',
    description: 'Nous ne vendons pas vos donnees',
  },
];

export default function LegalScreen() {
  const router = useRouter();

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Informations Legales',
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
        {/* Legal Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents Legaux</Text>
          <View style={styles.card}>
            {LEGAL_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.legalItem,
                  index === LEGAL_ITEMS.length - 1 && styles.legalItemLast,
                ]}
                onPress={() => openLink(item.url)}
              >
                <View style={styles.legalIcon}>
                  <Ionicons name={item.icon} size={24} color={lightTheme.colors.primary} />
                </View>
                <View style={styles.legalContent}>
                  <Text style={styles.legalTitle}>{item.title}</Text>
                  <Text style={styles.legalDescription}>{item.description}</Text>
                </View>
                <Ionicons name="open-outline" size={20} color={Colors.neutral[400]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Security Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notre Engagement Securite</Text>
          <View style={styles.securityGrid}>
            {SECURITY_FEATURES.map((feature, index) => (
              <View key={index} style={styles.securityItem}>
                <View style={styles.securityIconContainer}>
                  <Ionicons name={feature.icon} size={24} color={lightTheme.colors.primary} />
                </View>
                <Text style={styles.securityTitle}>{feature.title}</Text>
                <Text style={styles.securityDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Key Points */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Points Cles</Text>
          <View style={styles.card}>
            <View style={styles.keyPoint}>
              <View style={[styles.keyPointIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              </View>
              <View style={styles.keyPointContent}>
                <Text style={styles.keyPointTitle}>Donnees Protegees</Text>
                <Text style={styles.keyPointText}>
                  Vos donnees sont chiffrees et stockees en Europe (Francfort)
                </Text>
              </View>
            </View>
            <View style={styles.keyPoint}>
              <View style={[styles.keyPointIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              </View>
              <View style={styles.keyPointContent}>
                <Text style={styles.keyPointTitle}>Pas de Vente de Donnees</Text>
                <Text style={styles.keyPointText}>
                  Nous ne vendons jamais vos donnees personnelles a des tiers
                </Text>
              </View>
            </View>
            <View style={styles.keyPoint}>
              <View style={[styles.keyPointIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              </View>
              <View style={styles.keyPointContent}>
                <Text style={styles.keyPointTitle}>Vos Droits Respectes</Text>
                <Text style={styles.keyPointText}>
                  Acces, rectification, suppression - contactez privacy@immoguinee.com
                </Text>
              </View>
            </View>
            <View style={[styles.keyPoint, { borderBottomWidth: 0 }]}>
              <View style={[styles.keyPointIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              </View>
              <View style={styles.keyPointContent}>
                <Text style={styles.keyPointTitle}>Contrats Securises</Text>
                <Text style={styles.keyPointText}>
                  Signature electronique valide juridiquement, conservation 10 ans
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => Linking.openURL('mailto:privacy@immoguinee.com')}
            >
              <View style={styles.contactIcon}>
                <Ionicons name="mail-outline" size={22} color={lightTheme.colors.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Confidentialite</Text>
                <Text style={styles.contactValue}>privacy@immoguinee.com</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => Linking.openURL('mailto:dpo@immoguinee.com')}
            >
              <View style={styles.contactIcon}>
                <Ionicons name="person-outline" size={22} color={lightTheme.colors.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Delegue Protection Donnees</Text>
                <Text style={styles.contactValue}>dpo@immoguinee.com</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactItem, { borderBottomWidth: 0 }]}
              onPress={() => Linking.openURL('mailto:security@immoguinee.com')}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="alert-circle-outline" size={22} color="#EF4444" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Signaler une vulnerabilite</Text>
                <Text style={styles.contactValue}>security@immoguinee.com</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Version 1.0 - 26 decembre 2025</Text>
          <Text style={styles.versionText}>Conforme aux lois guineennes et RGPD</Text>
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
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  legalItemLast: {
    borderBottomWidth: 0,
  },
  legalIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  legalContent: {
    flex: 1,
  },
  legalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 2,
  },
  legalDescription: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  securityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  securityItem: {
    width: '48%',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  securityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
    textAlign: 'center',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 12,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  keyPointIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  keyPointContent: {
    flex: 1,
  },
  keyPointTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 2,
  },
  keyPointText: {
    fontSize: 13,
    color: Colors.neutral[500],
    lineHeight: 18,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  versionSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  versionText: {
    fontSize: 12,
    color: Colors.neutral[400],
    marginBottom: 4,
  },
});
