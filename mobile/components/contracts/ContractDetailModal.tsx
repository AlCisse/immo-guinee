import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';
import { formatPrice } from '@/lib/utils/formatPrice';
import { Contract, getStatusConfig, getContractTypeConfig } from './ContractCard';

interface ContractDetailModalProps {
  visible: boolean;
  contract: Contract | null;
  isDownloading: boolean;
  onClose: () => void;
  onDownload: () => void;
  onViewProperty: (listingId: string) => void;
}

export function ContractDetailModal({
  visible,
  contract,
  isDownloading,
  onClose,
  onDownload,
  onViewProperty,
}: ContractDetailModalProps) {
  const { t, i18n } = useTranslation();

  if (!contract) return null;

  const status = getStatusConfig(contract.statut, t);
  const typeConfig = getContractTypeConfig(contract.type_contrat, t);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateProgress = () => {
    if (!contract.date_fin) return null;
    const start = new Date(contract.date_debut).getTime();
    const end = new Date(contract.date_fin).getTime();
    const now = Date.now();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const getDaysRemaining = () => {
    if (!contract.date_fin) return undefined;
    const end = new Date(contract.date_fin).getTime();
    const days = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={Colors.secondary[800]} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('contracts.contractDetails')}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Property Image */}
          <View style={styles.imageContainer}>
            {contract.listing?.main_photo_url || contract.listing?.photo_principale ? (
              <Image
                source={{
                  uri: contract.listing?.main_photo_url || contract.listing?.photo_principale,
                }}
                style={styles.image}
              />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Ionicons name="home-outline" size={48} color={Colors.neutral[300]} />
              </View>
            )}
          </View>

          {/* Contract Number & Status */}
          <View style={styles.section}>
            <View style={styles.titleRow}>
              <Text style={styles.contractNumber}>{contract.numero_contrat}</Text>
              <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                <Ionicons name={status.icon as any} size={14} color={status.color} />
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>
            <View style={styles.typeRow}>
              <Ionicons name={typeConfig.icon as any} size={16} color={typeConfig.color} />
              <Text style={styles.typeText}>{typeConfig.label}</Text>
            </View>
          </View>

          {/* Property Info */}
          {contract.listing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('contracts.property')}</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="home-outline" size={18} color={lightTheme.colors.primary} />
                  <Text style={styles.infoText}>{contract.listing.titre}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={18} color={lightTheme.colors.primary} />
                  <Text style={styles.infoText}>
                    {contract.listing.quartier}, {contract.listing.commune}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Dates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('contracts.period')}</Text>
            <View style={styles.datesRow}>
              <View style={styles.dateBox}>
                <Ionicons name="calendar-outline" size={20} color={Colors.success[500]} />
                <Text style={styles.dateLabel}>{t('contracts.start')}</Text>
                <Text style={styles.dateValue}>{formatDate(contract.date_debut)}</Text>
              </View>
              {contract.date_fin && (
                <View style={styles.dateBox}>
                  <Ionicons name="calendar-outline" size={20} color={Colors.error[500]} />
                  <Text style={styles.dateLabel}>{t('contracts.end')}</Text>
                  <Text style={styles.dateValue}>{formatDate(contract.date_fin)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Financial Info */}
          {(contract.montant_loyer || contract.montant_caution) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('contracts.financialInfo')}</Text>
              <View style={styles.financeGrid}>
                {contract.montant_loyer && (
                  <View style={styles.financeBox}>
                    <Text style={styles.financeLabel}>{t('contracts.monthlyRent')}</Text>
                    <Text style={styles.financeValue}>{formatPrice(contract.montant_loyer)}</Text>
                  </View>
                )}
                {contract.montant_caution && (
                  <View style={styles.financeBox}>
                    <Text style={styles.financeLabel}>{t('contracts.deposit')}</Text>
                    <Text style={styles.financeValue}>{formatPrice(contract.montant_caution)}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Parties */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('contracts.parties')}</Text>
            <View style={styles.partiesGrid}>
              {contract.proprietaire && (
                <View style={styles.partyBox}>
                  <View style={styles.partyIcon}>
                    <Ionicons name="person-outline" size={20} color={lightTheme.colors.primary} />
                  </View>
                  <Text style={styles.partyLabel}>{t('contracts.owner')}</Text>
                  <Text style={styles.partyName}>{contract.proprietaire.nom_complet}</Text>
                </View>
              )}
              {contract.locataire && (
                <View style={styles.partyBox}>
                  <View style={styles.partyIcon}>
                    <Ionicons name="people-outline" size={20} color={Colors.success[500]} />
                  </View>
                  <Text style={styles.partyLabel}>{t('contracts.tenant')}</Text>
                  <Text style={styles.partyName}>{contract.locataire.nom_complet}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress for active contracts */}
          {contract.date_fin && contract.statut === 'ACTIF' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('contracts.progress')}</Text>
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressPercent}>{calculateProgress()}%</Text>
                  <Text style={styles.progressDays}>
                    {t('contracts.daysRemaining', { count: getDaysRemaining() })}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${calculateProgress() ?? 0}%` }]} />
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.downloadButton, isDownloading && styles.buttonDisabled]}
              onPress={onDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={lightTheme.colors.primary} />
              ) : (
                <Ionicons name="download-outline" size={20} color={lightTheme.colors.primary} />
              )}
              <Text style={styles.downloadText}>
                {isDownloading ? t('contracts.downloading') : t('contracts.downloadPdf')}
              </Text>
            </TouchableOpacity>

            {contract.listing && (
              <TouchableOpacity
                style={styles.viewPropertyButton}
                onPress={() => onViewProperty(contract.listing!.id)}
              >
                <Ionicons name="eye-outline" size={20} color="#fff" />
                <Text style={styles.viewPropertyText}>{t('contracts.viewProperty')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
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
  imageContainer: {
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contractNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.secondary[800],
  },
  statusBadge: {
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
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    fontSize: 14,
    color: Colors.neutral[600],
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 15,
    color: Colors.secondary[700],
    flex: 1,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateBox: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  dateLabel: {
    fontSize: 12,
    color: Colors.neutral[500],
    textTransform: 'uppercase',
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  financeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  financeBox: {
    flex: 1,
    backgroundColor: lightTheme.colors.primary + '10',
    borderRadius: 12,
    padding: 14,
  },
  financeLabel: {
    fontSize: 12,
    color: Colors.neutral[600],
    marginBottom: 4,
  },
  financeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: lightTheme.colors.primary,
  },
  partiesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  partyBox: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  partyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  partyLabel: {
    fontSize: 11,
    color: Colors.neutral[500],
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: '800',
    color: lightTheme.colors.primary,
  },
  progressDays: {
    fontSize: 13,
    color: Colors.neutral[600],
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 4,
  },
  actions: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  downloadButton: {
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
  downloadText: {
    fontSize: 16,
    fontWeight: '700',
    color: lightTheme.colors.primary,
  },
  viewPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  viewPropertyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ContractDetailModal;
