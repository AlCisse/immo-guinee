import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import Colors, { lightTheme } from '@/constants/Colors';

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const { telephone } = useLocalSearchParams<{ telephone: string }>();
  const { verifyOtp, resendOtp } = useAuth();
  const { width } = useWindowDimensions();
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const isTablet = width >= 768;
  const maxWidth = isTablet ? 440 : width;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (newOtp.every((digit) => digit) && newOtp.join('').length === OTP_LENGTH) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      Alert.alert('Erreur', 'Veuillez entrer le code complet');
      return;
    }

    if (!telephone) {
      Alert.alert('Erreur', 'Numero de telephone manquant');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtp(telephone, otpCode);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Code invalide');
      setOtp(new Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !telephone) return;

    setIsResending(true);
    try {
      await resendOtp(telephone);
      Alert.alert('Succes', 'Un nouveau code a ete envoye');
      setCountdown(60);
      setCanResend(false);
      setOtp(new Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer le code');
    } finally {
      setIsResending(false);
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    // Format: +224 6XX XXX XXX
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 12) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)}X XXX XXX`;
    }
    return phone;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <View style={[styles.formContainer, { maxWidth }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="shield-checkmark-outline" size={40} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.logo}>ImmoGuinee</Text>
              <Text style={styles.title}>Verification</Text>
              <Text style={styles.subtitle}>
                Entrez le code a 6 chiffres envoye au{'\n'}
                <Text style={styles.phoneNumber}>{formatPhone(telephone || '')}</Text>
              </Text>
            </View>

            {/* OTP Inputs */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value.slice(-1), index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
              onPress={() => handleVerify()}
              disabled={isLoading || otp.some((d) => !d)}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyButtonText}>Verifier</Text>
              )}
            </TouchableOpacity>

            {/* Resend */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>
                Vous n'avez pas recu de code ?
              </Text>
              {canResend ? (
                <TouchableOpacity onPress={handleResend} disabled={isResending}>
                  {isResending ? (
                    <ActivityIndicator size="small" color={lightTheme.colors.primary} />
                  ) : (
                    <Text style={styles.resendLink}>Renvoyer le code</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.countdownContainer}>
                  <Ionicons name="time-outline" size={16} color={Colors.neutral[400]} />
                  <Text style={styles.countdown}>
                    Renvoyer dans {countdown}s
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  contentTablet: {
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: lightTheme.colors.primary,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneNumber: {
    color: Colors.secondary[800],
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderRadius: 14,
    backgroundColor: Colors.neutral[50],
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.secondary[800],
  },
  otpInputFilled: {
    borderColor: lightTheme.colors.primary,
    backgroundColor: Colors.primary[50],
  },
  verifyButton: {
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: lightTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resendContainer: {
    alignItems: 'center',
    gap: 12,
  },
  resendText: {
    fontSize: 15,
    color: Colors.neutral[500],
  },
  resendLink: {
    fontSize: 15,
    color: lightTheme.colors.primary,
    fontWeight: '700',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdown: {
    fontSize: 14,
    color: Colors.neutral[400],
  },
});
