import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { api, tokenManager } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Contract } from '@/components/contracts/ContractCard';

export function useMyContracts() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  // State
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

  // Query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-contracts'],
    queryFn: async () => {
      const response = await api.contracts.my();
      return (
        response.data?.data?.data || response.data?.data?.contracts || response.data?.data || []
      );
    },
    enabled: isAuthenticated,
  });

  const contracts: Contract[] = Array.isArray(data) ? data : [];

  // Actions - Details Modal
  const openDetails = useCallback((contract: Contract) => {
    setSelectedContract(contract);
    setShowDetailsModal(true);
  }, []);

  const closeDetails = useCallback(() => {
    setShowDetailsModal(false);
    setSelectedContract(null);
  }, []);

  // Actions - Signature Modal
  const openSignatureModal = useCallback((contract: Contract) => {
    setSignatureContract(contract);
    setOtpCode('');
    setOtpSent(false);
    setShowSignatureModal(true);
  }, []);

  const closeSignatureModal = useCallback(() => {
    setShowSignatureModal(false);
    setSignatureContract(null);
    setOtpCode('');
    setOtpSent(false);
  }, []);

  const requestSignatureOtp = useCallback(async () => {
    if (!signatureContract || otpLoading) return;

    setOtpLoading(true);
    try {
      await api.contracts.requestSignatureOtp(signatureContract.id);
      setOtpSent(true);
      Alert.alert(t('contracts.signature.codeSent'), t('contracts.signature.codeSentDescription'));
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('contracts.errors.sendOtpFailed')
      );
    } finally {
      setOtpLoading(false);
    }
  }, [signatureContract, otpLoading, t]);

  const signContract = useCallback(async () => {
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
        [
          {
            text: t('common.ok'),
            onPress: () => {
              closeSignatureModal();
              refetch();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('contracts.errors.signFailed')
      );
    } finally {
      setSigningLoading(false);
    }
  }, [signatureContract, otpCode, signingLoading, t, closeSignatureModal, refetch]);

  // Actions - Download
  const downloadContract = useCallback(
    async (contract: Contract) => {
      if (downloadingId) return;

      setDownloadingId(contract.id);
      try {
        const token = await tokenManager.getToken();
        if (!token) {
          Alert.alert(t('common.error'), t('contracts.errors.loginRequired'));
          return;
        }

        const fileName = `contrat_${contract.numero_contrat || contract.id}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://immoguinee.com/api';

        const downloadResult = await FileSystem.downloadAsync(
          `${apiUrl}/contracts/${contract.id}/download`,
          fileUri,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' } }
        );

        if (downloadResult.status !== 200) {
          throw new Error(t('contracts.errors.downloadFailed'));
        }

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: t('contracts.saveContractPdf'),
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert(t('common.success'), t('contracts.downloadSuccess'));
        }
      } catch (error: any) {
        let errorMessage = t('contracts.errors.downloadFailed');
        if (error.message?.includes('403')) errorMessage = t('contracts.errors.accessDenied');
        else if (error.message?.includes('404')) errorMessage = t('contracts.errors.notFound');
        Alert.alert(t('common.error'), errorMessage);
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadingId, t]
  );

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return {
    // User
    user,

    // Data
    contracts,
    isLoading,
    refreshing,

    // Details modal
    selectedContract,
    showDetailsModal,
    openDetails,
    closeDetails,

    // Signature modal
    showSignatureModal,
    signatureContract,
    otpCode,
    otpSent,
    signingLoading,
    otpLoading,
    setOtpCode,
    openSignatureModal,
    closeSignatureModal,
    requestSignatureOtp,
    signContract,

    // Download
    downloadingId,
    downloadContract,

    // Refresh
    onRefresh,
    refetch,
  };
}

export default useMyContracts;
