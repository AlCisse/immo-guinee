import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { api, tokenManager } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import Colors, { lightTheme } from '@/constants/Colors';
import { formatPrice as formatPriceUtil } from '@/lib/utils/formatPrice';

interface Contract {
  id: string;
  numero_contrat: string;
  type_contrat: string;
  statut: string;
  date_debut: string;
  date_fin?: string;
  montant_loyer?: number;
  montant_caution?: number;
  bailleur_id?: string;
  locataire_id?: string;
  bailleur_signed_at?: string;
  locataire_signed_at?: string;
  listing?: {
    id: string;
    titre: string;
    quartier: string;
    commune: string;
    main_photo_url?: string;
    photo_principale?: string;
  };
  locataire?: {
    id?: string;
    nom_complet: string;
  };
  proprietaire?: {
    id?: string;
    nom_complet: string;
  };
}

export default function MyContractsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Signature state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureContract, setSignatureContract] = useState<Contract | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const openDetails = (contract: Contract) => {
    setSelectedContract(contract);
    setShowDetailsModal(true);
  };

  const closeDetails = () => {
    setShowDetailsModal(false);
    setSelectedContract(null);
  };

  // Check if current user needs to sign
  const userNeedsToSign = (contract: Contract): boolean => {
    if (!user) return false;
    const userId = user.id;
    const isBailleur = contract.bailleur_id === userId;
    const isLocataire = contract.locataire_id === userId;

    if (isBailleur && !contract.bailleur_signed_at) return true;
    if (isLocataire && !contract.locataire_signed_at) return true;
    return false;
  };

  // Check if user has already signed
  const userHasSigned = (contract: Contract): boolean => {
    if (!user) return false;
    const userId = user.id;
    const isBailleur = contract.bailleur_id === userId;
    const isLocataire = contract.locataire_id === userId;

    if (isBailleur && contract.bailleur_signed_at) return true;
    if (isLocataire && contract.locataire_signed_at) return true;
    return false;
  };

  // Open signature modal
  const openSignatureModal = (contract: Contract) => {
    setSignatureContract(contract);
    setOtpCode('');
    setOtpSent(false);
    setShowSignatureModal(true);
  };

  // Close signature modal
  const closeSignatureModal = () => {
    setShowSignatureModal(false);
    setSignatureContract(null);
    setOtpCode('');
    setOtpSent(false);
  };

  // Request OTP for signature
  const requestSignatureOtp = async () => {
    if (!signatureContract || otpLoading) return;

    setOtpLoading(true);
    try {
      await api.contracts.requestSignatureOtp(signatureContract.id);
      setOtpSent(true);
      Alert.alert(t('contracts.signature.codeSent'), t('contracts.signature.codeSentDescription'));
    } catch (error: any) {
      const message = error.response?.data?.message || t('contracts.errors.sendOtpFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setOtpLoading(false);
    }
  };

  // Sign contract with OTP
  const signContract = async () => {
    if (!signatureContract || !otpCode || signingLoading) return;

    if (otpCode.length !== 6) {
      Alert.alert(t('common.error'), t('contracts.errors.otpLength'));
      return;
    }

    setSigningLoading(true);
    try {
      await api.contracts.sign(signatureContract.id, otpCode);
      Alert.alert(
        t('contracts.signature.contractSigned'),
        t('contracts.signature.signatureSuccess'),
        [{ text: t('common.ok'), onPress: () => {
          closeSignatureModal();
          refetch();
        }}]
      );
    } catch (error: any) {
      const message = error.response?.data?.message || t('contracts.errors.signFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setSigningLoading(false);
    }
  };

  // Download contract PDF
  const downloadContract = async (contract: Contract) => {
    if (downloadingId) return; // Prevent multiple downloads

    setDownloadingId(contract.id);

    try {
      // Get auth token for the request
      const token = await tokenManager.getToken();
      if (!token) {
        Alert.alert(t('common.error'), t('contracts.errors.loginRequired'));
        return;
      }

      const fileName = `contrat_${contract.numero_contrat || contract.id}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://immoguinee.com/api';

      // Download the PDF
      const downloadResult = await FileSystem.downloadAsync(
        `${apiUrl}/contracts/${contract.id}/download`,
        fileUri,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/pdf',
          },
        }
      );

      if (downloadResult.status !== 200) {
        // Try to read error message from response
        let errorMessage = t('contracts.errors.downloadFailed');
        try {
          const errorContent = await FileSystem.readAsStringAsync(downloadResult.uri);
          const errorJson = JSON.parse(errorContent);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch {
          // Ignore parsing errors
        }
        throw new Error(errorMessage);
      }

      // Check if sharing is available
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        // Share/save the file
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('contracts.saveContractPdf'),
          UTI: 'com.adobe.pdf', // iOS specific
        });
      } else {
        // Fallback for devices that don't support sharing
        Alert.alert(
          t('common.success'),
          t('contracts.downloadSuccess'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error: any) {
      console.error('Download error:', error);
      let errorMessage = t('contracts.errors.downloadFailed');

      if (error.message?.includes('403')) {
        errorMessage = t('contracts.errors.accessDenied');
      } else if (error.message?.includes('404')) {
        errorMessage = t('contracts.errors.notFound');
      }

      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setDownloadingId(null);
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-contracts'],
    queryFn: async () => {
      const response = await api.contracts.my();
      return response.data?.data?.data || response.data?.data?.contracts || response.data?.data || [];
    },
    enabled: isAuthenticated,
  });

  const contracts = Array.isArray(data) ? data : [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIF':
        return { label: t('contracts.status.ACTIF'), color: Colors.success[500], bgColor: Colors.success[50], icon: 'checkmark-circle' };
      case 'EN_ATTENTE':
        return { label: t('contracts.status.EN_ATTENTE'), color: Colors.warning[500], bgColor: Colors.warning[50], icon: 'time' };
      case 'SIGNE':
        return { label: t('contracts.status.SIGNE'), color: Colors.success[600], bgColor: Colors.success[50], icon: 'create' };
      case 'RESILIE':
        return { label: t('contracts.status.RESILIE'), color: Colors.error[500], bgColor: Colors.error[50], icon: 'close-circle' };
      case 'TERMINE':
        return { label: t('contracts.status.TERMINE'), color: Colors.neutral[500], bgColor: Colors.neutral[100], icon: 'checkmark-done-circle' };
      case 'BROUILLON':
        return { label: t('contracts.status.BROUILLON'), color: Colors.neutral[400], bgColor: Colors.neutral[100], icon: 'document-outline' };
      default:
        return { label: status, color: Colors.neutral[400], bgColor: Colors.neutral[100], icon: 'document' };
    }
  };

  const getContractTypeConfig = (type: string) => {
    switch (type) {
      case 'LOCATION':
        return { label: t('contracts.type.LOCATION'), icon: 'key-outline', color: lightTheme.colors.primary };
      case 'VENTE':
        return { label: t('contracts.type.VENTE'), icon: 'home-outline', color: Colors.success[500] };
      case 'LOCATION_COURTE':
        return { label: t('contracts.type.LOCATION_COURTE'), icon: 'calendar-outline', color: Colors.warning[500] };
      default:
        return { label: type, icon: 'document-outline', color: Colors.neutral[500] };
    }
  };

  const formatPrice = (price?: number) => {
    return formatPriceUtil(price);
  };

  const calculateProgress = (startDate: string, endDate?: string) => {
    if (!endDate) return null;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();

    if (now < start) return 0;
    if (now > end) return 100;

    return Math.round(((now - start) / (end - start)) * 100);
  };

  const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const renderContract = ({ item }: { item: Contract }) => {
    const status = getStatusConfig(item.statut);
    const typeConfig = getContractTypeConfig(item.type_contrat);
    const imageUrl = item.listing?.main_photo_url || item.listing?.photo_principale;
    const progress = calculateProgress(item.date_debut, item.date_fin);
    const daysRemaining = getDaysRemaining(item.date_fin);

    return (
      <TouchableOpacity
        style={styles.contractCard}
        activeOpacity={0.9}
        onPress={() => item.listing && router.push(`/listing/${item.listing.id}`)}
      >
        {/* Header with image */}
        <View style={styles.cardHeader}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.propertyImage} />
          ) : (
            <View style={[styles.propertyImage, styles.propertyImagePlaceholder]}>
              <Ionicons name="home-outline" size={32} color={Colors.neutral[300]} />
            </View>
          )}
          <View style={styles.imageOverlay} />

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <Ionicons name={status.icon as any} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>

          {/* Contract type badge */}
          <View style={styles.typeBadge}>
            <Ionicons name={typeConfig.icon as any} size={12} color="#fff" />
            <Text style={styles.typeText}>{typeConfig.label}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          {/* Contract number and property */}
          <View style={styles.titleRow}>
            <Text style={styles.contractNumber}>{item.numero_contrat}</Text>
          </View>

          {item.listing && (
            <View style={styles.propertyInfo}>
              <Ionicons name="location-outline" size={14} color={lightTheme.colors.primary} />
              <Text style={styles.propertyTitle} numberOfLines={1}>
                {item.listing.titre}
              </Text>
            </View>
          )}

          <View style={styles.locationRow}>
            <Text style={styles.locationText}>
              {item.listing?.quartier}, {item.listing?.commune}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Details grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>{t('contracts.start')}</Text>
              <Text style={styles.detailValue}>{formatDate(item.date_debut)}</Text>
            </View>

            {item.date_fin && (
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>{t('contracts.end')}</Text>
                <Text style={styles.detailValue}>{formatDate(item.date_fin)}</Text>
              </View>
            )}

            {item.montant_loyer && (
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>{t('contracts.monthlyRent')}</Text>
                <Text style={styles.detailValuePrice}>{formatPrice(item.montant_loyer)}</Text>
              </View>
            )}
          </View>

          {/* Progress bar for active contracts */}
          {progress !== null && item.statut === 'ACTIF' && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>{t('contracts.contractProgress')}</Text>
                <Text style={styles.progressDays}>
                  {t('contracts.daysRemaining', { count: daysRemaining })}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )}

          {/* Signature button - show if user needs to sign */}
          {userNeedsToSign(item) && (
            <TouchableOpacity
              style={styles.signatureButton}
              onPress={() => openSignatureModal(item)}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.signatureButtonText}>{t('contracts.signContract')}</Text>
            </TouchableOpacity>
          )}

          {/* Show signed badge if user has signed */}
          {userHasSigned(item) && !userNeedsToSign(item) && (
            <View style={styles.signedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success[600]} />
              <Text style={styles.signedBadgeText}>{t('contracts.youSignedContract')}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => openDetails(item)}>
              <Ionicons name="document-text-outline" size={18} color={lightTheme.colors.primary} />
              <Text style={styles.actionText}>{t('contracts.viewDetails')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButtonSecondary,
                downloadingId === item.id && styles.actionButtonDisabled,
              ]}
              onPress={() => downloadContract(item)}
              disabled={downloadingId === item.id}
            >
              {downloadingId === item.id ? (
                <ActivityIndicator size="small" color={Colors.neutral[600]} />
              ) : (
                <Ionicons name="download-outline" size={18} color={Colors.neutral[600]} />
              )}
              <Text style={styles.actionTextSecondary}>
                {downloadingId === item.id ? t('contracts.downloading') : t('contracts.download')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('contracts.myContracts'),
          headerStyle: { backgroundColor: Colors.background.primary },
          headerShadowVisible: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.secondary[800]} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={lightTheme.colors.primary} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : (
          <FlatList
            data={contracts}
            keyExtractor={(item) => item.id}
            renderItem={renderContract}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={lightTheme.colors.primary}
                colors={[lightTheme.colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="document-text-outline" size={48} color={lightTheme.colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>{t('contracts.noContracts')}</Text>
                <Text style={styles.emptyText}>
                  {t('contracts.noContractsHint')}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Contract Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDetails}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeDetails}>
              <Ionicons name="close" size={28} color={Colors.secondary[800]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('contracts.contractDetails')}</Text>
            <View style={{ width: 28 }} />
          </View>

          {selectedContract && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Property Image */}
              <View style={styles.modalImageContainer}>
                {(selectedContract.listing?.main_photo_url || selectedContract.listing?.photo_principale) ? (
                  <Image
                    source={{ uri: selectedContract.listing?.main_photo_url || selectedContract.listing?.photo_principale }}
                    style={styles.modalImage}
                  />
                ) : (
                  <View style={[styles.modalImage, styles.modalImagePlaceholder]}>
                    <Ionicons name="home-outline" size={48} color={Colors.neutral[300]} />
                  </View>
                )}
              </View>

              {/* Contract Number & Status */}
              <View style={styles.modalSection}>
                <View style={styles.modalTitleRow}>
                  <Text style={styles.modalContractNumber}>{selectedContract.numero_contrat}</Text>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusConfig(selectedContract.statut).bgColor }]}>
                    <Ionicons
                      name={getStatusConfig(selectedContract.statut).icon as any}
                      size={14}
                      color={getStatusConfig(selectedContract.statut).color}
                    />
                    <Text style={[styles.modalStatusText, { color: getStatusConfig(selectedContract.statut).color }]}>
                      {getStatusConfig(selectedContract.statut).label}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalTypeRow}>
                  <Ionicons
                    name={getContractTypeConfig(selectedContract.type_contrat).icon as any}
                    size={16}
                    color={getContractTypeConfig(selectedContract.type_contrat).color}
                  />
                  <Text style={styles.modalTypeText}>
                    {getContractTypeConfig(selectedContract.type_contrat).label}
                  </Text>
                </View>
              </View>

              {/* Property Info */}
              {selectedContract.listing && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('contracts.property')}</Text>
                  <View style={styles.modalInfoCard}>
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="home-outline" size={18} color={lightTheme.colors.primary} />
                      <Text style={styles.modalInfoText}>{selectedContract.listing.titre}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="location-outline" size={18} color={lightTheme.colors.primary} />
                      <Text style={styles.modalInfoText}>
                        {selectedContract.listing.quartier}, {selectedContract.listing.commune}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Dates */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t('contracts.period')}</Text>
                <View style={styles.modalDatesRow}>
                  <View style={styles.modalDateBox}>
                    <Ionicons name="calendar-outline" size={20} color={Colors.success[500]} />
                    <Text style={styles.modalDateLabel}>{t('contracts.start')}</Text>
                    <Text style={styles.modalDateValue}>{formatDate(selectedContract.date_debut)}</Text>
                  </View>
                  {selectedContract.date_fin && (
                    <View style={styles.modalDateBox}>
                      <Ionicons name="calendar-outline" size={20} color={Colors.error[500]} />
                      <Text style={styles.modalDateLabel}>{t('contracts.end')}</Text>
                      <Text style={styles.modalDateValue}>{formatDate(selectedContract.date_fin)}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Financial Info */}
              {(selectedContract.montant_loyer || selectedContract.montant_caution) && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('contracts.financialInfo')}</Text>
                  <View style={styles.modalFinanceGrid}>
                    {selectedContract.montant_loyer && (
                      <View style={styles.modalFinanceBox}>
                        <Text style={styles.modalFinanceLabel}>{t('contracts.monthlyRent')}</Text>
                        <Text style={styles.modalFinanceValue}>{formatPrice(selectedContract.montant_loyer)}</Text>
                      </View>
                    )}
                    {selectedContract.montant_caution && (
                      <View style={styles.modalFinanceBox}>
                        <Text style={styles.modalFinanceLabel}>{t('contracts.deposit')}</Text>
                        <Text style={styles.modalFinanceValue}>{formatPrice(selectedContract.montant_caution)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Parties */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t('contracts.parties')}</Text>
                <View style={styles.modalPartiesGrid}>
                  {selectedContract.proprietaire && (
                    <View style={styles.modalPartyBox}>
                      <View style={styles.modalPartyIcon}>
                        <Ionicons name="person-outline" size={20} color={lightTheme.colors.primary} />
                      </View>
                      <Text style={styles.modalPartyLabel}>{t('contracts.owner')}</Text>
                      <Text style={styles.modalPartyName}>{selectedContract.proprietaire.nom_complet}</Text>
                    </View>
                  )}
                  {selectedContract.locataire && (
                    <View style={styles.modalPartyBox}>
                      <View style={styles.modalPartyIcon}>
                        <Ionicons name="people-outline" size={20} color={Colors.success[500]} />
                      </View>
                      <Text style={styles.modalPartyLabel}>{t('contracts.tenant')}</Text>
                      <Text style={styles.modalPartyName}>{selectedContract.locataire.nom_complet}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Progress for active contracts */}
              {selectedContract.date_fin && selectedContract.statut === 'ACTIF' && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('contracts.progress')}</Text>
                  <View style={styles.modalProgressCard}>
                    <View style={styles.modalProgressHeader}>
                      <Text style={styles.modalProgressPercent}>
                        {calculateProgress(selectedContract.date_debut, selectedContract.date_fin)}%
                      </Text>
                      <Text style={styles.modalProgressDays}>
                        {t('contracts.daysRemaining', { count: getDaysRemaining(selectedContract.date_fin) })}
                      </Text>
                    </View>
                    <View style={styles.modalProgressBar}>
                      <View
                        style={[
                          styles.modalProgressFill,
                          { width: `${calculateProgress(selectedContract.date_debut, selectedContract.date_fin) ?? 0}%` }
                        ]}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                {/* Download PDF Button */}
                <TouchableOpacity
                  style={[
                    styles.modalDownloadButton,
                    downloadingId === selectedContract.id && styles.actionButtonDisabled,
                  ]}
                  onPress={() => downloadContract(selectedContract)}
                  disabled={downloadingId === selectedContract.id}
                >
                  {downloadingId === selectedContract.id ? (
                    <ActivityIndicator size="small" color={lightTheme.colors.primary} />
                  ) : (
                    <Ionicons name="download-outline" size={20} color={lightTheme.colors.primary} />
                  )}
                  <Text style={styles.modalDownloadText}>
                    {downloadingId === selectedContract.id ? t('contracts.downloading') : t('contracts.downloadPdf')}
                  </Text>
                </TouchableOpacity>

                {/* View Property Button */}
                {selectedContract.listing && (
                  <TouchableOpacity
                    style={styles.modalViewPropertyButton}
                    onPress={() => {
                      closeDetails();
                      router.push(`/listing/${selectedContract.listing!.id}`);
                    }}
                  >
                    <Ionicons name="eye-outline" size={20} color="#fff" />
                    <Text style={styles.modalViewPropertyText}>{t('contracts.viewProperty')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Signature Modal */}
      <Modal
        visible={showSignatureModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSignatureModal}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeSignatureModal}>
              <Ionicons name="close" size={28} color={Colors.secondary[800]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('contracts.signature.title')}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {signatureContract && (
              <>
                {/* Contract Info */}
                <View style={styles.signatureInfo}>
                  <View style={styles.signatureIconContainer}>
                    <Ionicons name="document-text" size={48} color={lightTheme.colors.primary} />
                  </View>
                  <Text style={styles.signatureContractNumber}>
                    {t('contracts.contractNumber')} {signatureContract.numero_contrat || signatureContract.id.slice(0, 8)}
                  </Text>
                  {signatureContract.listing && (
                    <Text style={styles.signaturePropertyTitle}>
                      {signatureContract.listing.titre}
                    </Text>
                  )}
                </View>

                {/* Signature Status */}
                <View style={styles.signatureStatusSection}>
                  <Text style={styles.sectionLabel}>{t('contracts.signature.signatureStatus')}</Text>
                  <View style={styles.signatureStatusCard}>
                    <View style={styles.signatureStatusRow}>
                      <Text style={styles.signatureStatusLabel}>{t('contracts.owner')}</Text>
                      {signatureContract.bailleur_signed_at ? (
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
                    <View style={styles.signatureStatusDivider} />
                    <View style={styles.signatureStatusRow}>
                      <Text style={styles.signatureStatusLabel}>{t('contracts.tenant')}</Text>
                      {signatureContract.locataire_signed_at ? (
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
                  <Text style={styles.otpDescription}>
                    {t('contracts.signature.smsDescription')}
                  </Text>

                  {!otpSent ? (
                    <TouchableOpacity
                      style={[styles.requestOtpButton, otpLoading && styles.buttonDisabled]}
                      onPress={requestSignatureOtp}
                      disabled={otpLoading}
                    >
                      {otpLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="send-outline" size={20} color="#fff" />
                          <Text style={styles.requestOtpButtonText}>{t('contracts.signature.receiveOtp')}</Text>
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
                          onChangeText={setOtpCode}
                          placeholder="000000"
                          placeholderTextColor={Colors.neutral[400]}
                          keyboardType="number-pad"
                          maxLength={6}
                          textAlign="center"
                        />
                      </View>

                      <TouchableOpacity
                        style={styles.resendOtpButton}
                        onPress={requestSignatureOtp}
                        disabled={otpLoading}
                      >
                        <Ionicons name="refresh-outline" size={16} color={lightTheme.colors.primary} />
                        <Text style={styles.resendOtpText}>{t('contracts.signature.resendCode')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.signButton,
                          (signingLoading || otpCode.length !== 6) && styles.buttonDisabled,
                        ]}
                        onPress={signContract}
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
                  <Text style={styles.legalNoticeText}>
                    {t('contracts.signature.legalNotice')}
                  </Text>
                </View>

                <View style={{ height: 40 }} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  // Card styles
  contractCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    height: 140,
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  propertyImagePlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Content styles
  cardContent: {
    padding: 16,
  },
  titleRow: {
    marginBottom: 8,
  },
  contractNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.secondary[800],
    letterSpacing: -0.3,
  },
  propertyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  propertyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[700],
    flex: 1,
  },
  locationRow: {
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 12,
  },
  // Details grid
  detailsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailBox: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 12,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.neutral[500],
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  detailValuePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: lightTheme.colors.primary,
  },
  // Progress section
  progressSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.neutral[600],
    fontWeight: '500',
  },
  progressDays: {
    fontSize: 12,
    color: lightTheme.colors.primary,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 3,
  },
  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: lightTheme.colors.primary + '15',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.colors.primary,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.neutral[100],
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[600],
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: lightTheme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  modalContent: {
    flex: 1,
  },
  modalImageContainer: {
    height: 200,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalImagePlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalContractNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.secondary[800],
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTypeText: {
    fontSize: 14,
    color: Colors.neutral[600],
    fontWeight: '500',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInfoCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalInfoText: {
    fontSize: 15,
    color: Colors.secondary[700],
    flex: 1,
  },
  modalDatesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalDateBox: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  modalDateLabel: {
    fontSize: 12,
    color: Colors.neutral[500],
    textTransform: 'uppercase',
  },
  modalDateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  modalFinanceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  modalFinanceBox: {
    flex: 1,
    backgroundColor: lightTheme.colors.primary + '10',
    borderRadius: 12,
    padding: 14,
  },
  modalFinanceLabel: {
    fontSize: 12,
    color: Colors.neutral[600],
    marginBottom: 4,
  },
  modalFinanceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: lightTheme.colors.primary,
  },
  modalPartiesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  modalPartyBox: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalPartyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalPartyLabel: {
    fontSize: 11,
    color: Colors.neutral[500],
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalPartyName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
    textAlign: 'center',
  },
  modalProgressCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
  },
  modalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalProgressPercent: {
    fontSize: 24,
    fontWeight: '800',
    color: lightTheme.colors.primary,
  },
  modalProgressDays: {
    fontSize: 13,
    color: Colors.neutral[600],
  },
  modalProgressBar: {
    height: 8,
    backgroundColor: Colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 4,
  },
  modalActions: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  modalDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: lightTheme.colors.primary + '15',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: lightTheme.colors.primary + '30',
  },
  modalDownloadText: {
    fontSize: 16,
    fontWeight: '700',
    color: lightTheme.colors.primary,
  },
  modalViewPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  modalViewPropertyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Signature button on card
  signatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success[600],
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  signatureButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.success[50],
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
  },
  signedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success[700],
  },
  // Signature modal styles
  signatureInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  signatureIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: lightTheme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  signatureContractNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 4,
  },
  signaturePropertyTitle: {
    fontSize: 14,
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  signatureStatusSection: {
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
  signatureStatusCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 14,
    padding: 16,
  },
  signatureStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signatureStatusLabel: {
    fontSize: 15,
    color: Colors.secondary[700],
  },
  signatureStatusDivider: {
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
  requestOtpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  requestOtpButtonText: {
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
  resendOtpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 16,
  },
  resendOtpText: {
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
