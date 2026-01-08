import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';
import { useMyContracts } from '@/lib/hooks/useMyContracts';
import { ContractCard, Contract } from '@/components/contracts/ContractCard';
import { ContractDetailModal } from '@/components/contracts/ContractDetailModal';
import { SignatureModal } from '@/components/contracts/SignatureModal';
import { useScreenProtection } from '@/lib/security/useScreenProtection';

export default function MyContractsScreen() {
  // Protect sensitive contract data from screenshots
  useScreenProtection();

  const router = useRouter();
  const { t } = useTranslation();

  const {
    user,
    contracts,
    isLoading,
    refreshing,
    selectedContract,
    showDetailsModal,
    openDetails,
    closeDetails,
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
    downloadingId,
    downloadContract,
    onRefresh,
  } = useMyContracts();

  const renderContract = ({ item }: { item: Contract }) => (
    <ContractCard
      contract={item}
      userId={user?.id}
      isDownloading={downloadingId === item.id}
      onPress={() => item.listing && router.push(`/listing/${item.listing.id}`)}
      onViewDetails={() => openDetails(item)}
      onDownload={() => downloadContract(item)}
      onSign={() => openSignatureModal(item)}
    />
  );

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
                <Text style={styles.emptyText}>{t('contracts.noContractsHint')}</Text>
              </View>
            }
          />
        )}
      </View>

      <ContractDetailModal
        visible={showDetailsModal}
        contract={selectedContract}
        isDownloading={selectedContract ? downloadingId === selectedContract.id : false}
        onClose={closeDetails}
        onDownload={() => selectedContract && downloadContract(selectedContract)}
        onViewProperty={(listingId) => {
          closeDetails();
          router.push(`/listing/${listingId}`);
        }}
      />

      <SignatureModal
        visible={showSignatureModal}
        contract={signatureContract}
        otpCode={otpCode}
        otpSent={otpSent}
        signingLoading={signingLoading}
        otpLoading={otpLoading}
        onClose={closeSignatureModal}
        onOtpChange={setOtpCode}
        onRequestOtp={requestSignatureOtp}
        onSign={signContract}
      />
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
});
