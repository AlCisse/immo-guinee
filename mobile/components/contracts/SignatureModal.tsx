import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';
import { Contract } from './ContractCard';

interface SignatureModalProps {
  visible: boolean;
  contract: Contract | null;
  otpCode: string;
  otpSent: boolean;
  signingLoading: boolean;
  otpLoading: boolean;
  onClose: () => void;
  onOtpChange: (code: string) => void;
  onRequestOtp: () => void;
  onSign: () => void;
}

export function SignatureModal({
  visible,
  contract,
  otpCode,
  otpSent,
  signingLoading,
  otpLoading,
  onClose,
  onOtpChange,
  onRequestOtp,
  onSign,
}: SignatureModalProps) {
  const { t } = useTranslation();

  if (!contract) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={Colors.secondary[800]} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('contracts.signature.title')}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Contract Info */}
          <View style={styles.infoSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="document-text" size={48} color={lightTheme.colors.primary} />
            </View>
            <Text style={styles.contractNumber}>
              {t('contracts.contractNumber')} {contract.numero_contrat || contract.id.slice(0, 8)}
            </Text>
            {contract.listing && <Text style={styles.propertyTitle}>{contract.listing.titre}</Text>}
          </View>

          {/* Signature Status */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionLabel}>{t('contracts.signature.signatureStatus')}</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t('contracts.owner')}</Text>
                {contract.bailleur_signed_at ? (
                  <View style={styles.signedIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success[600]} />
                    <Text style={styles.signedText}>{t('contracts.signature.signed')}</Text>
                  </View>
                ) : (
                  <View style={styles.pendingIndicator}>
                    <Ionicons name="time-outline" size={20} color={Colors.warning[500]} />
                    <Text style={styles.pendingText}>{t('contracts.signature.pending')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t('contracts.tenant')}</Text>
                {contract.locataire_signed_at ? (
                  <View style={styles.signedIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success[600]} />
                    <Text style={styles.signedText}>{t('contracts.signature.signed')}</Text>
                  </View>
                ) : (
                  <View style={styles.pendingIndicator}>
                    <Ionicons name="time-outline" size={20} color={Colors.warning[500]} />
                    <Text style={styles.pendingText}>{t('contracts.signature.pending')}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* OTP Section */}
          <View style={styles.otpSection}>
            <Text style={styles.sectionLabel}>{t('contracts.signature.smsVerification')}</Text>
            <Text style={styles.otpDescription}>{t('contracts.signature.smsDescription')}</Text>

            {!otpSent ? (
              <TouchableOpacity
                style={[styles.requestButton, otpLoading && styles.buttonDisabled]}
                onPress={onRequestOtp}
                disabled={otpLoading}
              >
                {otpLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={20} color="#fff" />
                    <Text style={styles.requestButtonText}>
                      {t('contracts.signature.receiveOtp')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.otpInputContainer}>
                  <Text style={styles.otpInputLabel}>{t('contracts.signature.enterCode')}</Text>
                  <TextInput
                    style={styles.otpInput}
                    value={otpCode}
                    onChangeText={onOtpChange}
                    placeholder="000000"
                    placeholderTextColor={Colors.neutral[400]}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                  />
                </View>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={onRequestOtp}
                  disabled={otpLoading}
                >
                  <Ionicons name="refresh-outline" size={16} color={lightTheme.colors.primary} />
                  <Text style={styles.resendText}>{t('contracts.signature.resendCode')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.signButton,
                    (signingLoading || otpCode.length !== 6) && styles.buttonDisabled,
                  ]}
                  onPress={onSign}
                  disabled={signingLoading || otpCode.length !== 6}
                >
                  {signingLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                      <Text style={styles.signButtonText}>{t('contracts.signature.signNow')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Legal Notice */}
          <View style={styles.legalNotice}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.neutral[500]} />
            <Text style={styles.legalNoticeText}>{t('contracts.signature.legalNotice')}</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  content: {
    flex: 1,
  },
  infoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: lightTheme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  contractNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 4,
  },
  propertyTitle: {
    fontSize: 14,
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  statusSection: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 14,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 15,
    color: Colors.secondary[700],
  },
  statusDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 12,
  },
  signedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success[600],
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning[600],
  },
  otpSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  otpDescription: {
    fontSize: 14,
    color: Colors.neutral[600],
    lineHeight: 20,
    marginBottom: 20,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  otpInputContainer: {
    marginBottom: 16,
  },
  otpInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[700],
    marginBottom: 10,
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.secondary[800],
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: lightTheme.colors.primary + '30',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 16,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.colors.primary,
  },
  signButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.success[600],
    paddingVertical: 18,
    borderRadius: 14,
  },
  signButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  legalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 16,
    marginHorizontal: 16,
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    marginTop: 8,
  },
  legalNoticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.neutral[600],
    lineHeight: 18,
  },
});

export default SignatureModal;
