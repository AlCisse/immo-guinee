import { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';
import { formatPrice } from '@/lib/utils/formatPrice';

export interface Contract {
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
  locataire?: { id?: string; nom_complet: string };
  proprietaire?: { id?: string; nom_complet: string };
}

interface ContractCardProps {
  contract: Contract;
  userId?: string;
  isDownloading: boolean;
  onPress: () => void;
  onViewDetails: () => void;
  onDownload: () => void;
  onSign: () => void;
}

export function getStatusConfig(status: string, t: (key: string) => string) {
  switch (status) {
    case 'ACTIF':
      return {
        label: t('contracts.status.ACTIF'),
        color: Colors.success[500],
        bgColor: Colors.success[50],
        icon: 'checkmark-circle',
      };
    case 'EN_ATTENTE':
      return {
        label: t('contracts.status.EN_ATTENTE'),
        color: Colors.warning[500],
        bgColor: Colors.warning[50],
        icon: 'time',
      };
    case 'SIGNE':
      return {
        label: t('contracts.status.SIGNE'),
        color: Colors.success[600],
        bgColor: Colors.success[50],
        icon: 'create',
      };
    case 'RESILIE':
      return {
        label: t('contracts.status.RESILIE'),
        color: Colors.error[500],
        bgColor: Colors.error[50],
        icon: 'close-circle',
      };
    case 'TERMINE':
      return {
        label: t('contracts.status.TERMINE'),
        color: Colors.neutral[500],
        bgColor: Colors.neutral[100],
        icon: 'checkmark-done-circle',
      };
    case 'BROUILLON':
      return {
        label: t('contracts.status.BROUILLON'),
        color: Colors.neutral[400],
        bgColor: Colors.neutral[100],
        icon: 'document-outline',
      };
    default:
      return {
        label: status,
        color: Colors.neutral[400],
        bgColor: Colors.neutral[100],
        icon: 'document',
      };
  }
}

export function getContractTypeConfig(type: string, t: (key: string) => string) {
  switch (type) {
    case 'LOCATION':
      return {
        label: t('contracts.type.LOCATION'),
        icon: 'key-outline',
        color: lightTheme.colors.primary,
      };
    case 'VENTE':
      return { label: t('contracts.type.VENTE'), icon: 'home-outline', color: Colors.success[500] };
    case 'LOCATION_COURTE':
      return {
        label: t('contracts.type.LOCATION_COURTE'),
        icon: 'calendar-outline',
        color: Colors.warning[500],
      };
    default:
      return { label: type, icon: 'document-outline', color: Colors.neutral[500] };
  }
}

export const ContractCard = memo(function ContractCard({
  contract,
  userId,
  isDownloading,
  onPress,
  onViewDetails,
  onDownload,
  onSign,
}: ContractCardProps) {
  const { t, i18n } = useTranslation();
  const status = getStatusConfig(contract.statut, t);
  const typeConfig = getContractTypeConfig(contract.type_contrat, t);
  const imageUrl = contract.listing?.main_photo_url || contract.listing?.photo_principale;

  // Memoize expensive date calculations
  const progress = useMemo(() => {
    if (!contract.date_fin) return null;
    const start = new Date(contract.date_debut).getTime();
    const end = new Date(contract.date_fin).getTime();
    const now = Date.now();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }, [contract.date_debut, contract.date_fin]);

  const daysRemaining = useMemo(() => {
    if (!contract.date_fin) return undefined;
    const end = new Date(contract.date_fin).getTime();
    const days = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [contract.date_fin]);

  const formatDate = useCallback(
    (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    },
    [i18n.language]
  );

  const userNeedsToSign = useMemo(() => {
    if (!userId) return false;
    const isBailleur = contract.bailleur_id === userId;
    const isLocataire = contract.locataire_id === userId;
    if (isBailleur && !contract.bailleur_signed_at) return true;
    if (isLocataire && !contract.locataire_signed_at) return true;
    return false;
  }, [
    userId,
    contract.bailleur_id,
    contract.locataire_id,
    contract.bailleur_signed_at,
    contract.locataire_signed_at,
  ]);

  const userHasSigned = useMemo(() => {
    if (!userId) return false;
    const isBailleur = contract.bailleur_id === userId;
    const isLocataire = contract.locataire_id === userId;
    if (isBailleur && contract.bailleur_signed_at) return true;
    if (isLocataire && contract.locataire_signed_at) return true;
    return false;
  }, [
    userId,
    contract.bailleur_id,
    contract.locataire_id,
    contract.bailleur_signed_at,
    contract.locataire_signed_at,
  ]);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.header}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="home-outline" size={32} color={Colors.neutral[300]} />
          </View>
        )}
        <View style={styles.overlay} />
        <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
          <Ionicons name={status.icon as any} size={12} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        <View style={styles.typeBadge}>
          <Ionicons name={typeConfig.icon as any} size={12} color="#fff" />
          <Text style={styles.typeText}>{typeConfig.label}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.contractNumber}>{contract.numero_contrat}</Text>
        {contract.listing && (
          <>
            <View style={styles.propertyInfo}>
              <Ionicons name="location-outline" size={14} color={lightTheme.colors.primary} />
              <Text style={styles.propertyTitle} numberOfLines={1}>
                {contract.listing.titre}
              </Text>
            </View>
            <Text style={styles.location}>
              {contract.listing.quartier}, {contract.listing.commune}
            </Text>
          </>
        )}

        <View style={styles.divider} />

        <View style={styles.detailsGrid}>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>{t('contracts.start')}</Text>
            <Text style={styles.detailValue}>{formatDate(contract.date_debut)}</Text>
          </View>
          {contract.date_fin && (
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>{t('contracts.end')}</Text>
              <Text style={styles.detailValue}>{formatDate(contract.date_fin)}</Text>
            </View>
          )}
          {contract.montant_loyer && (
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>{t('contracts.monthlyRent')}</Text>
              <Text style={styles.detailValuePrice}>{formatPrice(contract.montant_loyer)}</Text>
            </View>
          )}
        </View>

        {progress !== null && contract.statut === 'ACTIF' && (
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

        {userNeedsToSign && (
          <TouchableOpacity style={styles.signatureButton} onPress={onSign}>
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.signatureButtonText}>{t('contracts.signContract')}</Text>
          </TouchableOpacity>
        )}

        {userHasSigned && !userNeedsToSign && (
          <View style={styles.signedBadge}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success[600]} />
            <Text style={styles.signedBadgeText}>{t('contracts.youSignedContract')}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onViewDetails}
            accessibilityRole="button"
            accessibilityLabel={t('contracts.viewDetails')}
          >
            <Ionicons name="document-text-outline" size={18} color={lightTheme.colors.primary} />
            <Text style={styles.actionText}>{t('contracts.viewDetails')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButtonSecondary, isDownloading && styles.actionButtonDisabled]}
            onPress={onDownload}
            disabled={isDownloading}
            accessibilityRole="button"
            accessibilityLabel={t('contracts.download')}
            accessibilityState={{ disabled: isDownloading }}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={Colors.neutral[600]} />
            ) : (
              <Ionicons name="download-outline" size={18} color={Colors.neutral[600]} />
            )}
            <Text style={styles.actionTextSecondary}>
              {isDownloading ? t('contracts.downloading') : t('contracts.download')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
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
  header: {
    height: 140,
    position: 'relative',
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
  overlay: {
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
  content: {
    padding: 16,
  },
  contractNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.secondary[800],
    marginBottom: 8,
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
  location: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 12,
  },
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
    borderRadius: 10,
    marginTop: 12,
  },
  signedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success[700],
  },
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
});

export default ContractCard;
