import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import Colors, { lightTheme } from '@/constants/Colors';
import Logo from '@/components/Logo';
import PhoneInput, { Country } from '@/components/PhoneInput';

type AccountType = 'PARTICULIER' | 'PROFESSIONNEL' | 'AGENCE';

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: 'PARTICULIER', label: 'Particulier', icon: 'person-outline' },
  { value: 'PROFESSIONNEL', label: 'Pro', icon: 'briefcase-outline' },
  { value: 'AGENCE', label: 'Agence', icon: 'business-outline' },
];

export default function RegisterScreen() {
  const { register } = useAuth();
  const { width } = useWindowDimensions();
  const [nomComplet, setNomComplet] = useState('');
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [typeCompte, setTypeCompte] = useState<AccountType>('PARTICULIER');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>({ code: 'GN', name: 'Guinee', dialCode: '+224', flag: '🇬🇳' });
  const [acceptedCGU, setAcceptedCGU] = useState(false);

  const isTablet = width >= 768;
  const maxWidth = isTablet ? 440 : width;

  const handleRegister = async () => {
    if (!nomComplet || !telephone || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!acceptedCGU) {
      Alert.alert('Conditions requises', 'Veuillez accepter les conditions generales d\'utilisation et la politique de confidentialite pour continuer.');
      return;
    }

    let formattedPhone = telephone.replace(/\s/g, '').replace(/^0/, '');
    formattedPhone = selectedCountry.dialCode + formattedPhone;

    setIsLoading(true);
    try {
      await register({
        nom_complet: nomComplet,
        telephone: formattedPhone,
        mot_de_passe: password,
        type_compte: typeCompte,
      });
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.formContainer, { maxWidth }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Logo size="xlarge" />
              </View>
              <Text style={styles.title}>Créer un compte</Text>
              <Text style={styles.subtitle}>
                Inscrivez-vous pour commencer
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Nom complet */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom complet</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={Colors.neutral[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Votre nom et prénom"
                    placeholderTextColor={Colors.neutral[400]}
                    value={nomComplet}
                    onChangeText={setNomComplet}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Téléphone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Numéro de téléphone</Text>
                <PhoneInput
                  value={telephone}
                  onChangeText={setTelephone}
                  onChangeCountry={setSelectedCountry}
                  defaultCountryCode="GN"
                />
              </View>

              {/* Type de compte */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type de compte</Text>
                <View style={styles.accountTypes}>
                  {ACCOUNT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.accountTypeBtn,
                        typeCompte === type.value && styles.accountTypeBtnActive,
                      ]}
                      onPress={() => setTypeCompte(type.value)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={20}
                        color={typeCompte === type.value ? '#fff' : Colors.neutral[600]}
                      />
                      <Text
                        style={[
                          styles.accountTypeLabel,
                          typeCompte === type.value && styles.accountTypeLabelActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Mot de passe */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mot de passe</Text>
                <View style={styles.passwordContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.neutral[400]} />
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Minimum 8 caractères"
                    placeholderTextColor={Colors.neutral[400]}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.showPasswordBtn}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={Colors.neutral[500]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirmer mot de passe */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmer le mot de passe</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.neutral[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmez votre mot de passe"
                    placeholderTextColor={Colors.neutral[400]}
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* CGU Acceptance */}
              <View style={styles.cguContainer}>
                <TouchableOpacity
                  style={styles.cguCheckbox}
                  onPress={() => setAcceptedCGU(!acceptedCGU)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, acceptedCGU && styles.checkboxChecked]}>
                    {acceptedCGU && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
                <View style={styles.cguTextContainer}>
                  <Text style={styles.cguText}>
                    J'accepte les{' '}
                  </Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL('https://immoguinee.com/legal/conditions-utilisation')}
                  >
                    <Text style={styles.cguLink}>Conditions Generales</Text>
                  </TouchableOpacity>
                  <Text style={styles.cguText}> et la </Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL('https://immoguinee.com/legal/politique-confidentialite')}
                  >
                    <Text style={styles.cguLink}>Politique de Confidentialite</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  (isLoading || !acceptedCGU) && styles.registerButtonDisabled
                ]}
                onPress={handleRegister}
                disabled={isLoading || !acceptedCGU}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.registerButtonText}>S'inscrire</Text>
                )}
              </TouchableOpacity>

              <View style={styles.loginLink}>
                <Text style={styles.loginText}>Déjà un compte ?</Text>
                <Link href="/auth/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.loginLinkText}>Se connecter</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  scrollContentTablet: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    width: '100%',
  },
  header: {
    marginBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.neutral[500],
  },
  form: {
    gap: 18,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: 14,
    backgroundColor: Colors.neutral[50],
    paddingHorizontal: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: Colors.secondary[800],
  },
  accountTypes: {
    flexDirection: 'row',
    gap: 10,
  },
  accountTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: 14,
    backgroundColor: Colors.neutral[50],
  },
  accountTypeBtnActive: {
    borderColor: lightTheme.colors.primary,
    backgroundColor: lightTheme.colors.primary,
  },
  accountTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[600],
  },
  accountTypeLabelActive: {
    color: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: 14,
    backgroundColor: Colors.neutral[50],
    paddingLeft: 16,
    gap: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: Colors.secondary[800],
  },
  showPasswordBtn: {
    paddingHorizontal: 16,
  },
  registerButton: {
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: lightTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loginText: {
    fontSize: 15,
    color: Colors.neutral[600],
  },
  loginLinkText: {
    fontSize: 15,
    color: lightTheme.colors.primary,
    fontWeight: '700',
  },
  cguContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  cguCheckbox: {
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    backgroundColor: Colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: lightTheme.colors.primary,
    borderColor: lightTheme.colors.primary,
  },
  cguTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  cguText: {
    fontSize: 13,
    color: Colors.neutral[600],
    lineHeight: 20,
  },
  cguLink: {
    fontSize: 13,
    color: lightTheme.colors.primary,
    fontWeight: '600',
    lineHeight: 20,
  },
});
