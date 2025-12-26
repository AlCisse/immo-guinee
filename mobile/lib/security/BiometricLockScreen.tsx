/**
 * BiometricLockScreen.tsx
 *
 * Full-screen overlay that requires biometric authentication.
 * Shown when app returns from background after timeout.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors, { lightTheme } from '@/constants/Colors';
import { bankSecurity } from './BankSecurityService';

interface BiometricLockScreenProps {
  visible: boolean;
  onUnlock: () => void;
  onCancel?: () => void;
}

export function BiometricLockScreen({
  visible,
  onUnlock,
  onCancel,
}: BiometricLockScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricName, setBiometricName] = useState('');

  useEffect(() => {
    if (visible) {
      setBiometricName(bankSecurity.getBiometricTypeName());
      // Auto-trigger biometric on show
      handleAuthenticate();
    }
  }, [visible]);

  const handleAuthenticate = async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await bankSecurity.authenticateWithBiometric();

      if (result.success) {
        onUnlock();
      } else {
        setError(result.error || 'Authentification echouee');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur d\'authentification');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const getBiometricIcon = () => {
    const typeName = bankSecurity.getBiometricTypeName();
    if (typeName.includes('Face')) {
      return 'scan-outline';
    }
    return 'finger-print-outline';
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <BlurView intensity={95} tint="dark" style={styles.container}>
        <View style={styles.content}>
          {/* Logo / Icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={getBiometricIcon()}
              size={80}
              color={lightTheme.colors.primary}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Application verrouillee</Text>
          <Text style={styles.subtitle}>
            Utilisez {biometricName} pour deverrouiller
          </Text>

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={Colors.error[500]} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Authenticate button */}
          <TouchableOpacity
            style={[styles.authButton, isAuthenticating && styles.authButtonDisabled]}
            onPress={handleAuthenticate}
            disabled={isAuthenticating}
            activeOpacity={0.8}
          >
            {isAuthenticating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={getBiometricIcon()} size={24} color="#fff" />
                <Text style={styles.authButtonText}>
                  Deverrouiller avec {biometricName}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel option (if provided) */}
          {onCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Se deconnecter</Text>
            </TouchableOpacity>
          )}

          {/* Security badge */}
          <View style={styles.securityBadge}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.success[500]} />
            <Text style={styles.securityBadgeText}>Securite niveau bancaire</Text>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 40,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  errorText: {
    color: Colors.error[400],
    fontSize: 14,
    flex: 1,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    width: '100%',
    shadowColor: lightTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 20,
    padding: 12,
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 20,
  },
  securityBadgeText: {
    color: Colors.success[400],
    fontSize: 12,
    fontWeight: '600',
  },
});

export default BiometricLockScreen;
