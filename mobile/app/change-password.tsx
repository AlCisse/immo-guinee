import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { api, apiClient } from '@/lib/api/client';
import Colors, { lightTheme } from '@/constants/Colors';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Step management
  const [step, setStep] = useState<'request' | 'verify'>('request');

  // Form state
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading states
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);

  const requestOtp = async () => {
    if (!user?.telephone) {
      Alert.alert('Erreur', 'Numero de telephone non disponible.');
      return;
    }

    setRequestingOtp(true);
    try {
      await apiClient.post('/auth/forgot-password', {
        telephone: user.telephone,
      });
      setStep('verify');
      Alert.alert('Code envoye', 'Un code OTP a ete envoye sur votre WhatsApp.');
    } catch (error: any) {
      console.error('Request OTP error:', error);
      const message = error.response?.data?.message || 'Erreur lors de l\'envoi du code OTP.';
      Alert.alert('Erreur', message);
    } finally {
      setRequestingOtp(false);
    }
  };

  const resetPassword = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert('Erreur', 'Veuillez entrer le code OTP a 6 chiffres.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setResetting(true);
    try {
      await apiClient.post('/auth/reset-password', {
        telephone: user?.telephone,
        code: otpCode,
        mot_de_passe: newPassword,
        mot_de_passe_confirmation: confirmPassword,
      });

      Alert.alert(
        'Succes',
        'Votre mot de passe a ete modifie avec succes.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Reset password error:', error);
      const message = error.response?.data?.message || 'Erreur lors du changement de mot de passe.';
      Alert.alert('Erreur', message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Changer le mot de passe',
          headerStyle: { backgroundColor: Colors.background.primary },
          headerShadowVisible: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.secondary[800]} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Icon */}
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={48} color={lightTheme.colors.primary} />
            </View>
            <Text style={styles.title}>
              {step === 'request' ? 'Securisez votre compte' : 'Nouveau mot de passe'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'request'
                ? 'Pour changer votre mot de passe, nous devons verifier votre identite via WhatsApp.'
                : 'Entrez le code recu et votre nouveau mot de passe.'}
            </Text>
          </View>

          {step === 'request' ? (
            /* Step 1: Request OTP */
            <View style={styles.formSection}>
              <View style={styles.infoCard}>
                <Ionicons name="call-outline" size={24} color={lightTheme.colors.primary} />
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardLabel}>Numero de telephone</Text>
                  <Text style={styles.infoCardValue}>{user?.telephone}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, requestingOtp && styles.buttonDisabled]}
                onPress={requestOtp}
                disabled={requestingOtp}
              >
                {requestingOtp ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>Recevoir le code OTP</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Step 2: Verify and Reset */
            <View style={styles.formSection}>
              {/* OTP Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Code OTP</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="key-outline" size={20} color={Colors.neutral[400]} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder="000000"
                    placeholderTextColor={Colors.neutral[400]}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nouveau mot de passe</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.neutral[400]} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Minimum 6 caracteres"
                    placeholderTextColor={Colors.neutral[400]}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={Colors.neutral[400]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmer le mot de passe</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.neutral[400]} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Retapez le mot de passe"
                    placeholderTextColor={Colors.neutral[400]}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={Colors.neutral[400]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Resend OTP */}
              <TouchableOpacity
                style={styles.resendButton}
                onPress={requestOtp}
                disabled={requestingOtp}
              >
                <Ionicons name="refresh-outline" size={18} color={lightTheme.colors.primary} />
                <Text style={styles.resendButtonText}>Renvoyer le code</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (resetting || !otpCode || !newPassword || !confirmPassword) && styles.buttonDisabled
                ]}
                onPress={resetPassword}
                disabled={resetting || !otpCode || !newPassword || !confirmPassword}
              >
                {resetting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>Changer le mot de passe</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Back Button */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setStep('request')}
              >
                <Text style={styles.secondaryButtonText}>Retour</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: lightTheme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  formSection: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  infoCardContent: {
    marginLeft: 14,
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  infoCardValue: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[700],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.secondary[800],
    paddingVertical: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.colors.primary,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[500],
  },
});
