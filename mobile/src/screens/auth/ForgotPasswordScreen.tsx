import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AuthStackParamList } from '../../types';
import { COLORS, APP_CONFIG } from '../../constants/config';
import { requestPasswordReset } from '../../services/auth';
import { formatApiError } from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
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
      setPhone(cleaned);
    }
  };

  const handleResetRequest = async () => {
    if (phone.length < 9) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = `${APP_CONFIG.phonePrefix}${phone}`;
      await requestPasswordReset(fullPhone);
      Alert.alert(
        'Code envoyé',
        'Un code de réinitialisation a été envoyé à votre téléphone',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', formatApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.description}>
            Entrez votre numéro de téléphone pour recevoir un code de
            réinitialisation de mot de passe.
          </Text>

          <View style={styles.inputContainer}>
            <View style={styles.phonePrefix}>
              <Text style={styles.phonePrefixText}>+224</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="6XX XX XX XX"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="phone-pad"
              value={formatPhoneDisplay(phone)}
              onChangeText={handlePhoneChange}
              maxLength={12}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleResetRequest}
            disabled={isLoading || phone.length < 9}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Envoi...' : 'Envoyer le code'}
            </Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  description: {
    fontSize: 15,
    color: COLORS.gray[600],
    lineHeight: 22,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 12,
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.gray[100],
    borderRightWidth: 1,
    borderRightColor: COLORS.gray[300],
  },
  phonePrefixText: {
    fontSize: 16,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.gray[900],
  },
  button: {
    backgroundColor: COLORS.primary[500],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
