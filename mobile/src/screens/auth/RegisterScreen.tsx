import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AuthStackParamList } from '../../types';
import { COLORS, APP_CONFIG } from '../../constants/config';
import { register } from '../../services/auth';
import { formatApiError } from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const formatPhoneDisplay = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = '';

    if (cleaned.length > 0) formatted += cleaned.substring(0, 3);
    if (cleaned.length > 3) formatted += ' ' + cleaned.substring(3, 5);
    if (cleaned.length > 5) formatted += ' ' + cleaned.substring(5, 7);
    if (cleaned.length > 7) formatted += ' ' + cleaned.substring(7, 9);

    return formatted;
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 9) {
      setFormData((prev) => ({ ...prev, phone: cleaned }));
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.nom.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom');
      return false;
    }
    if (!formData.prenom.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre prénom');
      return false;
    }
    if (formData.phone.length < 9) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide');
      return false;
    }
    if (formData.password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const fullPhone = `${APP_CONFIG.phonePrefix}${formData.phone}`;
      await register({
        nom: formData.nom,
        prenom: formData.prenom,
        telephone: fullPhone,
        email: formData.email || undefined,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      });
      navigation.navigate('VerifyOTP', { phone: fullPhone, type: 'register' });
    } catch (error) {
      Alert.alert('Erreur', formatApiError(error));
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>
              Rejoignez ImmoGuinée pour trouver ou publier des biens
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputWrapper, { marginRight: 8 }]}>
                <Text style={styles.label}>Nom</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Votre nom"
                  placeholderTextColor={COLORS.gray[400]}
                  value={formData.nom}
                  onChangeText={(v) => handleChange('nom', v)}
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.inputWrapper, { marginLeft: 8 }]}>
                <Text style={styles.label}>Prénom</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Votre prénom"
                  placeholderTextColor={COLORS.gray[400]}
                  value={formData.prenom}
                  onChangeText={(v) => handleChange('prenom', v)}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Téléphone</Text>
              <View style={styles.phoneContainer}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>+224</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="6XX XX XX XX"
                  placeholderTextColor={COLORS.gray[400]}
                  keyboardType="phone-pad"
                  value={formatPhoneDisplay(formData.phone)}
                  onChangeText={handlePhoneChange}
                  maxLength={12}
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Email (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                placeholderTextColor={COLORS.gray[400]}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(v) => handleChange('email', v)}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum 8 caractères"
                placeholderTextColor={COLORS.gray[400]}
                secureTextEntry
                value={formData.password}
                onChangeText={(v) => handleChange('password', v)}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirmez votre mot de passe"
                placeholderTextColor={COLORS.gray[400]}
                secureTextEntry
                value={formData.confirmPassword}
                onChangeText={(v) => handleChange('confirmPassword', v)}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Inscription...' : "S'inscrire"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}> Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.gray[500],
    lineHeight: 22,
  },
  form: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
  },
  inputWrapper: {
    flex: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[700],
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.gray[900],
  },
  phoneContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 10,
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.gray[100],
    borderRightWidth: 1,
    borderRightColor: COLORS.gray[300],
  },
  phonePrefixText: {
    fontSize: 15,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.gray[900],
  },
  button: {
    backgroundColor: COLORS.primary[500],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.gray[500],
  },
  footerLink: {
    fontSize: 14,
    color: COLORS.primary[500],
    fontWeight: '600',
  },
});

export default RegisterScreen;
